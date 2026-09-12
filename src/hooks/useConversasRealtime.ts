/**
 * Hook principal do módulo Conversas.
 * Gerencia estado global com Supabase + Realtime subscriptions.
 *
 * Cada tela/modal que montar este hook recebe:
 * - Lista de chats ordenados por última mensagem
 * - Lista de instâncias (status da conexão WhatsApp)
 * - CRUD de chats e operações comuns
 */

import { useEffect, useCallback, useState, useMemo, useId } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Chat, ChatUpdate } from './types';
import type { InstanciaStatus } from './types';

const DEBUG = false;

export interface UseConversasOptions {
  /** Auto-conecta realtime ao montar (default: true) */
  realtime?: boolean;
}

export interface UseConversasReturn {
  // ─── Data ──────────────────────────────────────────────────────────────────
  chats: Chat[];
  instancias: Array<{
    id: string;
    instance_name: string;
    status: InstanciaStatus;
    phone: string | null;
    qrcode_data: string | null;
    qrcode_expires_at: string | null;
  }>;
  isLoading: boolean;
  error: string | null;

  // ─── Chat Operations ─────────────────────────────────────────────────────────
  openChat: (chatId: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  unarchiveChat: (chatId: string) => Promise<void>;
  blockChat: (chatId: string) => Promise<void>;
  unblockChat: (chatId: string) => Promise<void>;
  pinChat: (chatId: string) => Promise<void>;
  unpinChat: (chatId: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;

  // ─── Instance Operations ─────────────────────────────────────────────────────
  refreshQrCode: (instanceId: string) => Promise<void>;
  createInstance: (instanceName: string) => Promise<void>;

  // ─── Derived ─────────────────────────────────────────────────────────────────
  totalUnread: number;
  activeChatsCount: number;
  connectedInstance: string | null;
  instanceViewState: 'initial' | 'reconnect' | 'connecting' | 'ready';
}

export function useConversas(options: UseConversasOptions = {}): UseConversasReturn {
  const { realtime = true } = options;

  const [chats, setChats] = useState<Chat[]>([]);
  const [instancias, setInstancias] = useState<UseConversasReturn['instancias']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sufixo único por instância do hook — impede colisão de canais realtime.
  const hookId = useId();

  // ─── Helpers ────────────────────────────────────────────────────────────────

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

  // ─── Load initial data ─────────────────────────────────────────────────────

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

        if (DEBUG) console.log(`[Conversas] Loading data for user: ${userId}`);

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
          setChats(chatsResult.data ?? []);
          setInstancias(instanciasResult.data ?? []);
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
  }, [loadUserId]);

  // ─── Realtime subscriptions ──────────────────────────────────────────────────

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
          {
            event: '*',
            schema: 'public',
            table: 'conversas_chats',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (DEBUG) console.log('[Conversas] Chat change:', payload.eventType, payload);
            if (payload.eventType === 'INSERT') {
              setChats(prev => upsertChat(prev, payload.new as Chat));
            } else if (payload.eventType === 'UPDATE') {
              setChats(prev =>
                prev.map(c => (c.id === payload.new.id ? { ...c, ...payload.new } as Chat : c))
              );
            } else if (payload.eventType === 'DELETE') {
              setChats(prev => removeChat(prev, payload.old.id));
            }
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversas_instancias',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (DEBUG) console.log('[Conversas] Instancia update:', payload.new);
            setInstancias(prev =>
              prev.map(i =>
                i.id === payload.new.id
                  ? { ...i, ...payload.new }
                  : i,
              ),
            );
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
  }, [realtime, loadUserId, hookId, upsertChat, removeChat]);

  // ─── Chat Operations ─────────────────────────────────────────────────────────

  const updateChat = useCallback(
    async (chatId: string, updates: ChatUpdate) => {
      // Optimistic
      setChats(prev =>
        prev.map(c => (c.id === chatId ? { ...c, ...updates } as Chat : c)),
      );

      const { error } = await supabase
        .from('conversas_chats')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', chatId);

      if (error) {
        toast.error('Erro ao atualizar conversa');
        throw error;
      }
    },
    [],
  );

  const openChat = useCallback(async (chatId: string) => {
    await updateChat(chatId, { status: 'active' });
  }, [updateChat]);

  const archiveChat = useCallback(async (chatId: string) => {
    await updateChat(chatId, { status: 'archived' });
    toast.success('Conversa arquivada');
  }, [updateChat]);

  const unarchiveChat = useCallback(async (chatId: string) => {
    await updateChat(chatId, { status: 'active' });
    toast.success('Conversa desarquivada');
  }, [updateChat]);

  const blockChat = useCallback(async (chatId: string) => {
    await updateChat(chatId, { status: 'blocked' });
    toast.success('Conversa bloqueada');
  }, [updateChat]);

  const unblockChat = useCallback(async (chatId: string) => {
    await updateChat(chatId, { status: 'active' });
    toast.success('Conversa desbloqueada');
  }, [updateChat]);

  const pinChat = useCallback(async (chatId: string) => {
    await updateChat(chatId, { pin: 'pinned' });
  }, [updateChat]);

  const unpinChat = useCallback(async (chatId: string) => {
    await updateChat(chatId, { pin: 'unpinned' });
  }, [updateChat]);

  const markAsRead = useCallback(
    async (chatId: string) => {
      // Reset local unread counter optimistically
      setChats(prev =>
        prev.map(c =>
          c.id === chatId ? { ...c, unread_count: 0 } as Chat : c,
        ),
      );

      const { error } = await supabase
        .from('conversas_chats')
        .update({ unread_count: 0, updated_at: new Date().toISOString() })
        .eq('id', chatId);

      if (error) console.error('[Conversas] markAsRead error:', error);
    },
    [],
  );

  const deleteChat = useCallback(async (chatId: string) => {
    // Snapshot
    let snapshot = chats;
    setChats(prev => removeChat(prev, chatId));

    const { error } = await supabase
      .from('conversas_chats')
      .delete()
      .eq('id', chatId);

    if (error) {
      setChats(snapshot);
      toast.error('Erro ao excluir conversa');
      throw error;
    }

    toast.success('Conversa excluída');
  }, [chats, removeChat]);

  // ─── Instance Operations ─────────────────────────────────────────────────────

  /**
   * Refresh do QR code via Worker (proxy autenticado).
   * A chave da Evolution API nunca sai do Worker — ela é lida de `c.env`.
   */
  const refreshQrCode = useCallback(async (instanceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada — faça login novamente.');
        return;
      }

      const workerUrl = import.meta.env.VITE_WORKER_URL;
      if (!workerUrl) {
        toast.error('VITE_WORKER_URL não configurada no ambiente.');
        return;
      }

      const response = await fetch(`${workerUrl}/api/conversas/instance/connect/${instanceId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error ?? 'Resposta inválida do Worker');
      }

      const qrcode = payload.data?.qrcode ?? {};
      setInstancias(prev =>
        prev.map(i =>
          i.id === instanceId
            ? {
                ...i,
                qrcode_data: qrcode.code ?? null,
                qrcode_expires_at: qrcode.expiresAt ?? null,
                status: 'connecting' as InstanciaStatus,
              }
            : i,
        ),
      );

      toast.info('QR Code atualizado!');
    } catch (err: any) {
      toast.error('Erro ao atualizar QR Code: ' + err.message);
    }
  }, []);

  /**
   * Cria uma instância na Evolution API (via Worker) e persiste em
   * `conversas_instancias`. O frontend não tem acesso à apikey da Evolution.
   */
  const createInstance = useCallback(async (instanceName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada — faça login novamente.');
        return;
      }

      const workerUrl = import.meta.env.VITE_WORKER_URL;
      if (!workerUrl) {
        toast.error('VITE_WORKER_URL não configurada no ambiente.');
        return;
      }

      const response = await fetch(`${workerUrl}/api/conversas/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ instanceName }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error ?? 'Resposta inválida do Worker');
      }

      const inserted = payload.data?.instance;
      if (inserted) {
        setInstancias(prev =>
          prev.some(i => i.id === inserted.id) ? prev : [...prev, inserted],
        );
      }

      toast.success('Instância criada! Escaneie o QR Code.');
    } catch (err: any) {
      toast.error('Erro ao criar instância: ' + err.message);
      throw err;
    }
  }, []);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const totalUnread = useMemo(
    () => chats.reduce((sum, c) => sum + (c.unread_count ?? 0), 0),
    [chats],
  );

  const activeChatsCount = useMemo(
    () => chats.filter(c => c.status === 'active').length,
    [chats],
  );

  const connectedInstance = useMemo(
    () => instancias.find(i => i.status === 'connected')?.id ?? null,
    [instancias],
  );

  const instanceViewState = useMemo<'initial' | 'reconnect' | 'connecting' | 'ready'>(() => {
    if (instancias.length === 0) return 'initial';
    const hasConnected = instancias.some(i => i.status === 'connected');
    if (hasConnected) return 'ready';
    if (instancias.some(i => i.status === 'connecting')) return 'connecting';
    return 'reconnect';
  }, [instancias]);

  return {
    chats,
    instancias,
    isLoading,
    error,
    openChat,
    archiveChat,
    unarchiveChat,
    blockChat,
    unblockChat,
    pinChat,
    unpinChat,
    markAsRead,
    deleteChat,
    refreshQrCode,
    createInstance,
    totalUnread,
    activeChatsCount,
    connectedInstance,
    instanceViewState,
  };
}
