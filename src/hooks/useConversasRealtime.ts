/**
 * Hook principal do módulo Conversas.
 * Gerencia estado global com Supabase + Realtime subscriptions.
 *
 * Cada tela/modal que montar este hook recebe:
 * - Lista de chats ordenados por última mensagem
 * - Lista de instâncias (status da conexão WhatsApp)
 * - CRUD de chats e operações comuns
 *
 * Fase 1: Cada chat é enriquecido com `contato_tipo` (cliente | lead | unknown)
 * vindo de um join lazy com `conversas_contatos`. O hook expõe contadores
 * dinâmicos derivados desses dados para alimentar os filtros da sidebar.
 */

import { useEffect, useCallback, useState, useMemo, useId, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { initAudio, playNotificationSound, showBrowserNotification, requestNotificationPermission } from '@/modules/conversas/notifications';
import type { Chat, ChatUpdate } from './types';
import type { InstanciaStatus, ContactType, EnrichedChat } from '@/modules/conversas/types';

/** Chat enriquecido com tipo do contato (cliente | lead | unknown) */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-assertions
export type { EnrichedChat } from '@/modules/conversas/types';

const DEBUG = false;

export interface UseConversasOptions {
  /** Auto-conecta realtime ao montar (default: true) */
  realtime?: boolean;
}

export interface UseConversasReturn {
  // ─── Data ──────────────────────────────────────────────────────────────────
  /** Chats enriquecidos com `contato_tipo` (cliente | lead | unknown). */
  chats: EnrichedChat[];
  instancias: Array<{
    id: string;
    instance_name: string;
    status: InstanciaStatus;
    phone?: string | null;
    qrcode_data?: string | null;
    qrcode_expires_at?: string | null;
  }>;
  isLoading: boolean;
  error: string | null;

  // ─── Actions ─────────────────────────────────────────────────────────────────
  openChat: (chatId: string) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  unarchiveChat: (chatId: string) => Promise<void>;
  blockChat: (chatId: string) => Promise<void>;
  unblockChat: (chatId: string) => Promise<void>;
  pinChat: (chatId: string) => Promise<boolean>;
  unpinChat: (chatId: string) => Promise<boolean>;
  markAsRead: (chatId: string) => Promise<void>;
  markAsUnread: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  refreshQrCode: (instanceId: string) => Promise<void>;
  createInstance: (instanceName: string) => Promise<void>;
  checkInstanceStatus: (instanceId: string) => Promise<void>;
  disconnectInstance: (instanceId: string) => Promise<void>;
  deleteInstance: (instanceId: string) => Promise<void>;
  syncHistoricalChats: (instanceId: string, options?: { showToast?: boolean }) => Promise<{ synced: number; total: number }>;

  // ─── Derived ─────────────────────────────────────────────────────────────────
  totalUnread: number;
  activeChatsCount: number;
  connectedInstance: string | null;
  instanceViewState: 'initial' | 'reconnect' | 'connecting' | 'ready';
  isPinLimitReached: boolean;
  /** Contadores para os filtros primários da sidebar. */
  chatCounts: {
    all: number;
    unread: number;
    cliente: number;
    lead: number;
  };
}

export function useConversas(options: UseConversasOptions = {}): UseConversasReturn {
  const { realtime = true } = options;
  const { user } = useAuth();

  const [chats, setChats] = useState<Chat[]>([]);
  const [instancias, setInstancias] = useState<UseConversasReturn['instancias']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Mapa contato_id → tipo (cliente | lead | unknown). */
  const [contatoTipoMap, setContatoTipoMap] = useState<Record<string, ContactType>>({});

  // Sufixo único por instância do hook — impede colisão de canais realtime.
  const hookId = useId();

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const loadUserId = useCallback(async (): Promise<string | null> => {
    if (user?.id) return user.id;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  }, [user?.id]);

  /** Carrega todos os contatos e retorna mapa { contato_id → tipo }. */
  const loadContatoTipos = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('conversas_contatos')
      .select('id, tipo')
      .eq('user_id', userId);

    if (!data) return {};
    const map: Record<string, ContactType> = {};
    for (const row of data) {
      map[row.id] = row.tipo ?? 'unknown';
    }
    return map;
  }, []);

  /** Enrikece um chat com `contato_tipo` a partir do mapa. */
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

        const [chatsResult, instanciasResult, tipoMap] = await Promise.all([
          supabase
            .from('conversas_chats')
            .select('*')
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
          const rawChats: Chat[] = chatsResult.data ?? [];
          setChats(rawChats);
          setContatoTipoMap(tipoMap);
          setInstancias(instanciasResult.data ?? []);
          // Init notifications
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
  }, [loadUserId, loadContatoTipos]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Realtime subscriptions ──────────────────────────────────────────────────

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
            if (DEBUG) console.log('[Conversas] Chat change:', payload.eventType, payload);
            if (payload.eventType === 'INSERT') {
              setChats(prev => upsertChat(prev, payload.new as Chat));
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
                return prev.map(c => (c.id === payload.new.id ? { ...c, ...payload.new } as EnrichedChat : c));
              });
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
            filter: `user_id=eq.${currentUserId}`,
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
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversas_contatos',
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            if (DEBUG) console.log('[Conversas] Contato change:', payload.eventType, payload);
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const tipo = (payload.new as { tipo?: ContactType }).tipo ?? 'unknown';
              setContatoTipoMap(prev => ({ ...prev, [payload.new.id]: tipo }));
              // Re-enriquecer chats afetados
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

  // ─── Chat Operations ─────────────────────────────────────────────────────────

  const updateChat = useCallback(
    async (chatId: string, updates: ChatUpdate) => {
      // Snapshot para rollback
      let previousChats: Chat[] = [];
      setChats(prev => {
        previousChats = prev;
        return prev.map(c => (c.id === chatId ? { ...c, ...updates } as EnrichedChat : c));
      });

      const { error } = await supabase
        .from('conversas_chats')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', chatId);

      if (error) {
        // Reverte imediatamente o estado local se o banco recusar (Rollback)
        setChats(previousChats);
        toast.error('Erro ao atualizar conversa: ' + (error.message || 'Falha na operação'));
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

  const pinChat = useCallback(async (chatId: string): Promise<boolean> => {
    const targetChat = chats.find(c => c.id === chatId);
    const instanceId = targetChat?.instance_id;
    const pinnedCount = chats.filter(
      c => c.pin === 'pinned' && (!instanceId || c.instance_id === instanceId)
    ).length;

    if (pinnedCount >= 5) {
      toast.warning('Limite de 5 conversas fixadas atingido nesta versão.');
      return false;
    }

    try {
      await updateChat(chatId, { pin: 'pinned', pin_origin: 'lunari' });
      return true;
    } catch {
      return false;
    }
  }, [updateChat, chats]);

  const unpinChat = useCallback(async (chatId: string): Promise<boolean> => {
    try {
      await updateChat(chatId, { pin: 'unpinned', pin_origin: null });
      return true;
    } catch {
      return false;
    }
  }, [updateChat]);

  const markAsRead = useCallback(
    async (chatId: string) => {
      // Reset local unread counter optimistically
      setChats(prev =>
        prev.map(c =>
          c.id === chatId ? { ...c, unread_count: 0 } as Chat : c,
        ),
      );

      // Atualiza o banco de dados diretamente (fallback visual imediato)
      const { error } = await supabase
        .from('conversas_chats')
        .update({ unread_count: 0, updated_at: new Date().toISOString() })
        .eq('id', chatId);

      if (error) console.error('[Conversas] markAsRead error:', error);

      // Call our worker to mark as read in Evolution API
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const workerUrl = import.meta.env.VITE_EDGE_API_URL;
          if (workerUrl) {
            await fetch(`${workerUrl}/api/conversas/mark-read/${chatId}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
          }
        }
      } catch (error) {
        console.error('[Conversas] markAsRead worker error:', error);
      }
    },
    [],
  );

  const markAsUnread = useCallback(async (chatId: string) => {
    setChats(prev =>
      prev.map(c =>
        c.id === chatId ? { ...c, unread_count: 1 } as Chat : c,
      ),
    );

    const { error } = await supabase
      .from('conversas_chats')
      .update({ unread_count: 1, updated_at: new Date().toISOString() })
      .eq('id', chatId);

    if (error) {
      console.error('[Conversas] markAsUnread error:', error);
      toast.error('Erro ao marcar como não lido');
    }
  }, []);

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

      const workerUrl = import.meta.env.VITE_EDGE_API_URL;
      if (!workerUrl) {
        toast.error('VITE_EDGE_API_URL não configurada no ambiente.');
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
    } catch (err: any) {
      toast.error('Não foi possível gerar um novo código. Verifique sua conexão e tente novamente.');
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

      const workerUrl = import.meta.env.VITE_EDGE_API_URL;
      if (!workerUrl) {
        toast.error('VITE_EDGE_API_URL não configurada no ambiente.');
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
        setInstancias(prev => {
          const exists = prev.some(i => i.id === inserted.id);
          if (exists) {
            return prev.map(i => i.id === inserted.id ? { ...i, ...inserted } : i);
          }
          return [...prev, inserted];
        });
      }
    } catch (err: any) {
      toast.error('Não foi possível gerar o código. Verifique sua conexão e tente novamente.');
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

  const chatCounts = useMemo(
    () => ({
      all: chats.filter(c => c.status === 'active').length,
      unread: chats.filter(c => c.status === 'active' && (c.unread_count ?? 0) > 0).length,
      cliente: chats.filter(c => c.status === 'active' && c.contato_tipo === 'cliente').length,
      lead: chats.filter(c => c.status === 'active' && c.contato_tipo === 'lead').length,
    }),
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

  // Fase 9: Atualiza o título da aba com o contador de não lidas
  useEffect(() => {
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) LUNARI`;
    } else {
      document.title = 'LUNARI';
    }
  }, [totalUnread]);

  const checkInstanceStatus = useCallback(async (instanceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const workerUrl = import.meta.env.VITE_EDGE_API_URL;
      if (!workerUrl) return;

      const res = await fetch(`${workerUrl}/api/conversas/instance/status/${instanceId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload.ok && payload.data?.status) {
          setInstancias(prev => 
            prev.map(i => i.id === instanceId && i.status !== payload.data.status ? { ...i, status: payload.data.status } : i)
          );
        }
      }
    } catch (e) {
      // silent fail on polling
    }
  }, []);

  const disconnectInstance = useCallback(async (instanceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada — faça login novamente.');
        return;
      }

      const workerUrl = import.meta.env.VITE_EDGE_API_URL;
      if (!workerUrl) return;

      const response = await fetch(`${workerUrl}/api/conversas/instance/disconnect/${instanceId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      setInstancias(prev =>
        prev.map(i =>
          i.id === instanceId
            ? { ...i, status: 'disconnected', qrcode_data: null }
            : i
        )
      );
      toast.success('WhatsApp desconectado com sucesso.');
    } catch (err: any) {
      toast.error('Erro ao desconectar: ' + err.message);
    }
  }, []);

  const deleteInstance = useCallback(async (instanceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada — faça login novamente.');
        return;
      }

      const workerUrl = import.meta.env.VITE_EDGE_API_URL;
      if (!workerUrl) return;

      const response = await fetch(`${workerUrl}/api/conversas/instance/${instanceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      setInstancias(prev => prev.filter(i => i.id !== instanceId));
      toast.success('Instância excluída com sucesso.');
    } catch (err: any) {
      toast.error('Erro ao excluir instância: ' + err.message);
    }
  }, []);

  // Poll connection status while connecting
  useEffect(() => {
    const connectingInstance = instancias.find(i => i.status === 'connecting');
    if (!connectingInstance) return;

    const interval = setInterval(() => {
      checkInstanceStatus(connectingInstance.id);
    }, 3000);

    return () => clearInterval(interval);
  }, [instancias, checkInstanceStatus]);

  // ─── Sync histórico ─────────────────────────────────────────────────────────

  const syncHistoricalChats = useCallback(async (instanceId: string, options?: { showToast?: boolean }) => {
    const showToast = options?.showToast ?? false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (showToast) toast.error('Sessão expirada — faça login novamente.');
        return { synced: 0, total: 0 };
      }

      const workerUrl = import.meta.env.VITE_EDGE_API_URL;
      if (!workerUrl) {
        if (showToast) toast.error('VITE_EDGE_API_URL não configurada no ambiente.');
        return { synced: 0, total: 0 };
      }

      // 1. Initial Sync (descobre chats e popula a fila)
      const initialResponse = await fetch(`${workerUrl}/api/conversas/sync-chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ instanceId, mode: 'initial' }),
      });

      if (!initialResponse.ok) {
        const err = await initialResponse.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${initialResponse.status}`);
      }

      const initialPayload = await initialResponse.json();
      if (showToast) {
        toast.success(`${initialPayload.synced} conversas descobertas. Baixando histórico...`);
      }

      // 2. Refresh initial UI state
      const currentUserId = user?.id || (await loadUserId());
      const refreshUi = async () => {
        if (currentUserId) {
          const { data: refreshedChats } = await supabase
            .from('conversas_chats')
            .select('*')
            .eq('user_id', currentUserId)
            .order('ultima_mensagem_data', { ascending: false, nullsFirst: false });
          if (refreshedChats) setChats(refreshedChats);
        }
      };
      await refreshUi();

      // 3. Process Batch Queue Loop (apenas os primeiros lotes para mensagens recentes das conversas principais)
      // Histórico mais antigo é baixado sob demanda ao abrir ou rolar cada conversa específica
      const MAX_INITIAL_BATCHES = 3;
      let remaining = 1;
      let iterations = 0;
      while (remaining > 0 && iterations < MAX_INITIAL_BATCHES) {
        iterations++;
        const batchResponse = await fetch(`${workerUrl}/api/conversas/sync-chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ instanceId, mode: 'batch' }),
        });

        if (!batchResponse.ok) {
          console.warn('[Sync] Batch failed, stopping queue processing.', await batchResponse.text());
          break;
        }

        const batchPayload = await batchResponse.json();
        remaining = batchPayload.remaining ?? 0;
        
        if (batchPayload.processed > 0) {
          await refreshUi();
        }

        if (remaining > 0 && iterations < MAX_INITIAL_BATCHES) {
          await new Promise(r => setTimeout(r, 600));
        }
      }

      if (showToast) {
        toast.success('Conversas e mensagens recentes sincronizadas!');
      }

      return { synced: initialPayload.synced ?? 0, total: initialPayload.total ?? 0 };
    } catch (err: any) {
      if (showToast) {
        toast.error('Erro ao sincronizar conversas: ' + err.message);
      } else {
        console.warn('[Sync] Auto-sync error:', err.message);
      }
      return { synced: 0, total: 0 };
    }
  }, [user?.id, loadUserId]);

  const syncedInstancesRef = useRef<Set<string>>(new Set());

  // Auto-sync historical chats assim que a instância estiver conectada
  useEffect(() => {
    if (!connectedInstance || isLoading) return;

    if (!syncedInstancesRef.current.has(connectedInstance)) {
      syncedInstancesRef.current.add(connectedInstance);
      void syncHistoricalChats(connectedInstance);
    }
  }, [connectedInstance, isLoading, syncHistoricalChats]);

  const isPinLimitReached = useMemo(() => {
    const pinnedCount = chats.filter(
      c => c.pin === 'pinned' && (!connectedInstance || c.instance_id === connectedInstance)
    ).length;
    return pinnedCount >= 5;
  }, [chats, connectedInstance]);

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
    markAsUnread,
    deleteChat,
    refreshQrCode,
    createInstance,
    checkInstanceStatus,
    disconnectInstance,
    deleteInstance,
    syncHistoricalChats,
    totalUnread,
    activeChatsCount,
    chatCounts,
    connectedInstance,
    instanceViewState,
    isPinLimitReached,
  };
}
