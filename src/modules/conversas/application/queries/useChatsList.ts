import { useEffect, useCallback, useState, useMemo, useId } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Chat, InstanciaStatus } from '../../types';

export interface UseChatsListOptions {
  realtime?: boolean;
}

export function useChatsList(options: UseChatsListOptions = {}) {
  const { realtime = true } = options;

  const [chats, setChats] = useState<Chat[]>([]);
  const [instancias, setInstancias] = useState<Array<{
    id: string;
    instance_name: string;
    status: InstanciaStatus;
    phone: string | null;
    qrcode_data: string | null;
    qrcode_expires_at: string | null;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hookId = useId();

  const loadUserId = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  }, []);

  const upsertChat = useCallback((list: Chat[], item: Chat): Chat[] => {
    const exists = list.some(c => c.id === item.id);
    if (exists) return list.map(c => (c.id === item.id ? item : c));
    return [...list, item];
  }, []);

  const removeChat = useCallback((list: Chat[], id: string): Chat[] => {
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

        const [chatsResult, instanciasResult] = await Promise.all([
          supabase
            .from('conversas_chats')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false }),
          supabase
            .from('conversas_instancias')
            .select('id, instance_name, status, phone, qrcode_data, qrcode_expires_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true }),
        ]);

        if (chatsResult.error) throw chatsResult.error;
        if (instanciasResult.error) throw instanciasResult.error;

        if (!cancelled) {
          setChats(chatsResult.data as unknown as Chat[] ?? []);
          setInstancias(instanciasResult.data as any ?? []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? 'Erro desconhecido');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [loadUserId]);

  useEffect(() => {
    if (!realtime) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let userId: string | null = null;

    const setup = async () => {
      userId = await loadUserId();
      if (!userId) return;

      channel = supabase
        .channel(`conversas_main_${userId}_${hookId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversas_chats', filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setChats(prev => upsertChat(prev, payload.new as Chat));
            } else if (payload.eventType === 'UPDATE') {
              setChats(prev => prev.map(c => (c.id === payload.new.id ? { ...c, ...payload.new } as Chat : c)));
            } else if (payload.eventType === 'DELETE') {
              setChats(prev => removeChat(prev, payload.old.id as string));
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'conversas_instancias', filter: `user_id=eq.${userId}` },
          (payload) => {
            setInstancias(prev => prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new } as any : i));
          },
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [realtime, loadUserId, hookId, upsertChat, removeChat]);

  const totalUnread = useMemo(() => chats.reduce((sum, c) => sum + (c.unread_count ?? 0), 0), [chats]);
  const activeChatsCount = useMemo(() => chats.filter(c => c.status === 'active').length, [chats]);
  const connectedInstance = useMemo(() => instancias.find(i => i.status === 'connected')?.id ?? null, [instancias]);

  const instanceViewState = useMemo<'initial' | 'reconnect' | 'connecting' | 'ready'>(() => {
    if (instancias.length === 0) return 'initial';
    const hasConnected = instancias.some(i => i.status === 'connected');
    if (hasConnected) return 'ready';
    if (instancias.some(i => i.status === 'connecting')) return 'connecting';
    return 'reconnect';
  }, [instancias]);

  return {
    chats,
    setChats,
    instancias,
    setInstancias,
    isLoading,
    error,
    totalUnread,
    activeChatsCount,
    connectedInstance,
    instanceViewState,
  };
}
