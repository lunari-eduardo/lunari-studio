import { useEffect, useCallback, useState, useId } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { initAudio, playNotificationSound, showBrowserNotification, requestNotificationPermission } from '@/modules/conversas/notifications';
import type { Chat } from '@/modules/conversas/types';
import type { InstanciaStatus, ContactType, EnrichedChat } from '@/modules/conversas/types';
import { preloadUnreadChats } from './chatMessageCache';

const DEBUG = false;

let cachedInstancias: Array<{
  id: string;
  instance_name: string;
  status: InstanciaStatus;
  phone?: string | null;
  qrcode_data?: string | null;
  qrcode_expires_at?: string | null;
}> | null = null;
let cachedChats: Chat[] | null = null;
let cachedContatoTipoMap: Record<string, ContactType> | null = null;

export function useConversasState(realtime: boolean) {
  const { user } = useAuth();

  const [chats, setChats] = useState<Chat[]>(cachedChats ?? []);
  const [instancias, setInstancias] = useState(cachedInstancias ?? []);
  const [isLoading, setIsLoading] = useState(!cachedInstancias);
  const [error, setError] = useState<string | null>(null);
  const [contatoTipoMap, setContatoTipoMap] = useState<Record<string, ContactType>>(cachedContatoTipoMap ?? {});

  const hookId = useId();

  useEffect(() => {
    cachedChats = chats;
    cachedInstancias = instancias;
    cachedContatoTipoMap = contatoTipoMap;
  }, [chats, instancias, contatoTipoMap]);

  const loadUserId = useCallback(async (): Promise<string | null> => {
    if (user?.id) return user.id;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    // Preload unread messages in the background so there's no delay when opening them
    loadUserId().then(userId => {
      if (userId && chats.length > 0) {
        preloadUnreadChats(userId, chats);
      }
    });
  }, [chats, loadUserId]);

  const loadContatoTipos = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('conversas_contatos')
      .select('id, tipo')
      .eq('user_id', userId);

    if (!data) return {};
    const map: Record<string, ContactType> = {};
    for (const row of data) {
      map[row.id] = (row.tipo as ContactType) ?? 'unknown';
    }
    return map;
  }, []);

  const enrichChat = useCallback(
    (chat: Chat, map: Record<string, ContactType>): EnrichedChat => ({
      ...chat,
      contato_tipo: map[chat.contato_id] ?? 'unknown',
    }),
    [],
  );

  const upsertChat = useCallback((list: EnrichedChat[], item: Chat): EnrichedChat[] => {
    const exists = list.some(c => c.id === item.id);
    if (exists) return list.map(c => (c.id === item.id ? enrichChat(item, contatoTipoMap) : c));
    return [...list, enrichChat(item, contatoTipoMap)];
  }, [contatoTipoMap, enrichChat]);

  const removeChat = useCallback((list: EnrichedChat[], id: string): EnrichedChat[] => {
    return list.filter(c => c.id !== id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const userId = await loadUserId();
        if (!userId) {
          setChats([]);
          setInstancias([]);
          return;
        }

        const [chatsResult, instanciasResult, tipoMap] = await Promise.all([
          supabase
            .from('conversas_chats')
            .select('*, clientes(nome), conversas_contatos(nome, avatar_url)')
            .eq('user_id', userId)
            .order('ultima_mensagem_data', { ascending: false, nullsFirst: false }),
          supabase
            .from('conversas_instancias')
            .select('id, instance_name, status, phone, qrcode_data, qrcode_expires_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true }),
          loadContatoTipos(userId),
        ]);

        if (chatsResult.error) throw chatsResult.error;
        if (instanciasResult.error) throw instanciasResult.error;

        if (!cancelled) {
          setChats((chatsResult.data as any[]) ?? []);
          setContatoTipoMap(tipoMap);
          setInstancias((instanciasResult.data as any[]) ?? []);
          void initAudio();
          void requestNotificationPermission();
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[Conversas] Load error:', err);
          setError(err.message ?? 'Erro desconhecido');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [loadUserId, loadContatoTipos]);

  useEffect(() => {
    if (!realtime) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const currentUserId = user?.id || (await loadUserId());
      if (!currentUserId) return;

      channel = supabase
        .channel(`conversas_main_${currentUserId}_${hookId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversas_chats',
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setChats(prev => upsertChat(prev as EnrichedChat[], payload.new as Chat));
            } else if (payload.eventType === 'UPDATE') {
              setChats(prev => {
                const oldChat = prev.find(c => c.id === payload.new.id);
                const isNewInboundMessage =
                  oldChat &&
                  payload.new.ultima_mensagem_direction === 'inbound' &&
                  (payload.new.unread_count > oldChat.unread_count);

                if (isNewInboundMessage) {
                  playNotificationSound();
                  showBrowserNotification(
                    payload.new.contato_nome || payload.new.contato_phone_normalized || 'Nova mensagem',
                    payload.new.ultima_mensagem || undefined
                  );
                }
                
                // Se o cliente_id mudou (ex: foi vinculado), buscamos o nome no DB de forma assíncrona
                if (oldChat && oldChat.cliente_id !== payload.new.cliente_id) {
                  if (payload.new.cliente_id) {
                    supabase.from('clientes').select('nome').eq('id', payload.new.cliente_id).single().then(({ data }) => {
                      if (data) {
                        setChats(curr => curr.map(c => c.id === payload.new.id ? { ...c, clientes: { nome: data.nome } } as EnrichedChat : c));
                      }
                    });
                  } else {
                    setChats(curr => curr.map(c => c.id === payload.new.id ? { ...c, clientes: null } as EnrichedChat : c));
                  }
                }

                return prev.map(c => (c.id === payload.new.id ? { ...c, ...payload.new } as EnrichedChat : c));
              });
            } else if (payload.eventType === 'DELETE') {
              setChats(prev => removeChat(prev as EnrichedChat[], payload.old.id));
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversas_instancias',
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            setInstancias(prev =>
              prev.map(i =>
                i.id === payload.new.id
                  ? { ...i, ...payload.new }
                  : i,
              ),
            );
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversas_contatos',
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const tipo = (payload.new as { tipo?: ContactType }).tipo ?? 'unknown';
              setContatoTipoMap(prev => ({ ...prev, [payload.new.id]: tipo }));
              setChats(prev =>
                prev.map(c =>
                  c.contato_id === payload.new.id
                    ? { ...c, contato_tipo: tipo } as EnrichedChat
                    : c,
                ),
              );
            }
          },
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [realtime, user?.id, loadUserId, hookId, upsertChat, removeChat]);

  // Derived fully enriched chats to return
  const enrichedChats = (chats as EnrichedChat[]).map(c => 
    c.contato_tipo ? c : enrichChat(c, contatoTipoMap)
  );

  return {
    chats: enrichedChats,
    setChats,
    instancias,
    setInstancias,
    isLoading,
    error,
    contatoTipoMap
  };
}
