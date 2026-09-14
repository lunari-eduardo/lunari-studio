/**
 * Hook para detalhe de um chat específico.
 * Gerencia: mensagens, notas, envio de mensagens.
 *
 * Uso:
 *   const { chat, mensagens, isLoading, sendMessage, markAllRead } = useConversasChat(chatId);
 */

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Chat, Mensagem, MensagemInsert, MensagemUpdate, Nota } from '@/modules/conversas/types';

const DEBUG = false;

// Extensão local do tipo Mensagem para anotações efêmeras usadas durante o
// prepend de histórico pelo loadMore (Fase 2 / P0-05). Não é persistido,
// apenas marca a primeira mensagem antiga para que o ChatPanel saiba
// preservar a posição de scroll ao redor dela.
export type MensagemLocal = Mensagem & { _loadingOlder?: boolean };

export interface UseConversasChatOptions {
  /** Auto-marcar mensagens como lidas ao abrir (default: true) */
  autoMarkRead?: boolean;
}

export interface UseConversasChatReturn {
  // ─── Data ───────────────────────────────────────────────────────────────────
  chat: Chat | null;
  mensagens: Mensagem[];
  notas: Nota[];
  isLoading: boolean;
  error: string | null;

  // ─── Operations ──────────────────────────────────────────────────────────────
  sendMessage: (input: {
    content: string;
    type?: 'text' | 'image' | 'audio' | 'video' | 'document';
    mediaUrl?: string;
    mediaMimeType?: string;
    mediaFilename?: string;
    mediaSizeBytes?: number;
  }) => Promise<void>;

  retryMessage: (mensagemId: string) => Promise<void>;

  addNota: (content: string) => Promise<void>;
  updateNota: (notaId: string, content: string) => Promise<void>;
  deleteNota: (notaId: string) => Promise<void>;

  markAllRead: () => Promise<void>;

  // ─── Derived ─────────────────────────────────────────────────────────────────
  sortedMensagens: Mensagem[];
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useConversasChat(
  chatId: string | null,
  options: UseConversasChatOptions = {},
): UseConversasChatReturn {
  const { autoMarkRead = true } = options;
  const { user } = useAuth();

  const [chat, setChat] = useState<Chat | null>(null);
  const [mensagens, setMensagens] = useState<MensagemLocal[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 50;
  // P0-05 / Fase 2 — primeira página reduzida para combinar com WhatsApp (carrega
  // janela inicial menor e usa loadMore para expandir sem pular scroll).
  const INITIAL_PAGE_SIZE = 30;
  const userIdRef = useRef<string | null>(null);
  const instanceIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Guard contra chamadas concorrentes de loadMore (P1-09). Sem isso, o
  // IntersectionObserver dispara várias vezes antes do primeiro request voltar
  // e o hook pula páginas. Também preserva posição do scroll entre o estado
  // pré e pós-prepend via loadMoreScrollAnchor (consumido por ChatPanel).
  const loadingMoreRef = useRef(false);
  // Fase 2 — marca se a última página retornada estava cheia (para hasMore).
  // Inicia como true para que hasMore funcione na primeira página.
  const lastPageWasFullRef = useRef(true);

  const loadUserId = useCallback(async (): Promise<string | null> => {
    if (user?.id) return user.id;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  }, [user?.id]);

  // ─── Load chat + initial messages ───────────────────────────────────────────

  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setMensagens([]);
        setNotas([]);
        setPage(0);

        const currentUserId = user?.id || (await loadUserId());
        if (!currentUserId) return;
        userIdRef.current = currentUserId;

        const [chatResult, mensagensResult, notasResult] = await Promise.all([
          supabase
            .from('conversas_chats')
            .select('*')
            .eq('id', chatId)
            .eq('user_id', currentUserId)
            .single(),
          supabase
            .from('conversas_mensagens')
            .select('*')
            .eq('chat_id', chatId)
            .eq('user_id', currentUserId)
            .order('timestamp', { ascending: false })
            .range(0, INITIAL_PAGE_SIZE - 1),
          supabase
            .from('conversas_notas')
            .select('*')
            .eq('chat_id', chatId)
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false }),
        ]);

        if (chatResult.error) throw chatResult.error;
        if (chatResult.data) {
          instanceIdRef.current = chatResult.data.instance_id;
          if (cancelled) return;
          setChat(chatResult.data);
        }

        if (mensagensResult.error) throw mensagensResult.error;
        if (!cancelled) {
          setMensagens((mensagensResult.data ?? []).reverse());
        }

        if (notasResult.error) console.warn('[Conversas] Notas load error:', notasResult.error);
        if (!cancelled) {
          setNotas(notasResult.data ?? []);
        }

        // Auto-mark read
        if (autoMarkRead && chatResult.data && (chatResult.data as Chat).unread_count > 0) {
          await supabase
            .from('conversas_chats')
            .update({ unread_count: 0 })
            .eq('id', chatId);
        }

        // Buscar histórico mais profundo sob demanda na Evolution API em background
        if (chatResult.data) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const remoteJid = `${chatResult.data.contato_phone_normalized}@s.whatsapp.net`;
            void fetch(`${import.meta.env.VITE_EDGE_API_URL}/api/conversas/sync-chats`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                instanceId: chatResult.data.instance_id,
                chatId: chatResult.data.id,
                remoteJid,
                mode: 'single'
              }),
            }).catch(err => console.warn('[useConversasChat] On-demand chat sync failed:', err));
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[ConversasChat] Load error:', err);
          setError(err.message ?? 'Erro desconhecido');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [chatId, user?.id, loadUserId, autoMarkRead]);

  // ─── Load more (pagination) ─────────────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (!chatId || isLoading) return;
    // Guard de concorrência (P1-09 / Fase 2): se já houver loadMore em voo,
    // ignora. Sem isso o IntersectionObserver dispara múltiplas vezes
    // antes do request anterior voltar, gerando N+1 trips e pulos de página.
    if (loadingMoreRef.current) return;
    const userId = userIdRef.current;
    if (!userId) return;

    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    loadingMoreRef.current = true;
    try {
      const { data, error } = await supabase
        .from('conversas_mensagens')
        .select('*')
        .eq('chat_id', chatId)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .range(from, to);

      if (error) {
        toast.error('Erro ao carregar mais mensagens');
        return;
      }

      if (data && data.length > 0) {
        const olderReversed = data.reverse();
        setMensagens(prev => [...olderReversed, ...prev]);
        setPage(nextPage);
        // Se retornou menos que a página cheia, sabemos que acabou o histórico.
        if (data.length < PAGE_SIZE) lastPageWasFullRef.current = false;
        else lastPageWasFullRef.current = true;
      } else {
        // Página vazia: sem mais mensagens.
        lastPageWasFullRef.current = false;
      }
    } finally {
      loadingMoreRef.current = false;
    }
  }, [chatId, page, isLoading]);

  // Fase 3 (P1-10) — `hasMore` correto considerando INITIAL_PAGE_SIZE para a
  // primeira página e PAGE_SIZE para as seguintes, mais flag de "última página
  // cheia" para desativar o sentinel quando o histórico se esgota.
  const expectedLoaded = INITIAL_PAGE_SIZE + page * PAGE_SIZE;
  const hasMore = page === 0
    ? mensagens.length >= INITIAL_PAGE_SIZE
    : mensagens.length >= expectedLoaded && lastPageWasFullRef.current;

  // ─── Mark message read ──────────────────────────────────────────────────────

  const markReadLocal = useCallback((msgId: string) => {
    setMensagens(prev =>
      prev.map(m =>
        m.id === msgId && m.status !== 'read' ? { ...m, status: 'read' as const } : m,
      ),
    );
  }, []);

  const markAllRead = useCallback(async () => {
    if (!chatId) return;
    setMensagens(prev =>
      prev.map(m => (m.direction === 'inbound' && m.status !== 'read' ? { ...m, status: 'read' as const } : m)),
    );

    // Call our worker to mark as read in Evolution API (Fase 8)
    // A delegação de update({ unread_count: 0 }) agora é responsabilidade total do worker.
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
      console.error('[Conversas] markAllRead error:', error);
    }
  }, [chatId]);

  // ─── Realtime messages subscription ────────────────────────────────────────

  useEffect(() => {
    const currentUserId = user?.id || userIdRef.current;
    if (!chatId || !currentUserId) return;

    const channel = supabase
      .channel(`conversas_chat_${chatId}_${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversas_mensagens',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          if (DEBUG) console.log('[ConversasChat] New message:', payload.new);
          const newMsg = payload.new as Mensagem;
          setMensagens(prev => {
            const exists = prev.some(
              m => m.id === newMsg.id || (m.evolution_msg_id && m.evolution_msg_id === newMsg.evolution_msg_id),
            );
            if (exists) return prev;
            return [...prev, newMsg].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            );
          });

          // Auto-mark read for inbound when chat is active
          if (newMsg.direction === 'inbound') {
            markReadLocal(newMsg.id);
            if (autoMarkRead) {
              // The chat is open, so immediately tell the worker to sync read status
              // and clear unread_count from DB.
              void markAllRead();
            }
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversas_mensagens',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          if (DEBUG) console.log('[ConversasChat] Message update:', payload.new);
          setMensagens(prev =>
            prev.map(m => (m.id === payload.new.id ? { ...m, ...payload.new } as Mensagem : m)),
          );
        },
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [chatId, user?.id, markReadLocal]);

  // ─── Send message ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (input: {
      content: string;
      type?: 'text' | 'image' | 'audio' | 'video' | 'document';
      mediaUrl?: string;
      mediaMimeType?: string;
      mediaFilename?: string;
      mediaSizeBytes?: number;
      replyToId?: string;
    }) => {
      const userId = userIdRef.current;
      const instanceId = instanceIdRef.current;
      if (!chatId || !userId || !instanceId) {
        throw new Error('Chat não carregado');
      }

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: Mensagem = {
        id: tempId,
        user_id: userId,
        chat_id: chatId,
        instance_id: instanceId,
        evolution_msg_id: null,
        direction: 'outbound',
        type: input.type ?? 'text',
        content: input.content,
        media_url: input.mediaUrl ?? null,
        media_mime_type: input.mediaMimeType ?? null,
        media_filename: input.mediaFilename ?? null,
        media_size_bytes: input.mediaSizeBytes ?? null,
        status: 'pending',
        is_forwarded: null,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Optimistic insert
      setMensagens(prev => [...prev, optimisticMsg]);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const workerUrl = import.meta.env.VITE_EDGE_API_URL || '';
        
        // Call Worker outbound endpoint
        const response = await fetch(`${workerUrl}/api/conversas/send-message`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({
            chatId,
            instanceId,
            content: input.content,
            type: input.type ?? 'text',
            mediaUrl: input.mediaUrl,
            mediaMimeType: input.mediaMimeType,
            mediaFilename: input.mediaFilename,
            mediaSizeBytes: input.mediaSizeBytes,
            replyToId: input.replyToId,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message ?? 'Erro ao enviar mensagem');
        }

        const result = await response.json();

        // Replace temp message with real one from DB
        setMensagens(prev =>
          prev.map(m =>
            m.id === tempId
              ? { ...m, id: result.id ?? tempId, status: 'sent' as const }
              : m,
          ),
        );
      } catch (err: any) {
        // Mark temp message as failed
        setMensagens(prev =>
          prev.map(m =>
            m.id === tempId ? { ...m, status: 'failed' as const } : m,
          ),
        );
        toast.error('Erro ao enviar: ' + err.message);
        throw err;
      }
    },
    [chatId],
  );

  const retryMessage = useCallback(
    async (mensagemId: string) => {
      const msg = mensagens.find(m => m.id === mensagemId);
      if (!msg) return;

      setMensagens(prev =>
        prev.map(m => (m.id === mensagemId ? { ...m, status: 'pending' as const } : m)),
      );

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const workerUrl = import.meta.env.VITE_EDGE_API_URL || '';

        const response = await fetch(`${workerUrl}/api/conversas/message/retry/${mensagemId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message ?? 'Erro ao reenviar mensagem');
        }

        const result = await response.json();

        setMensagens(prev =>
          prev.map(m =>
            m.id === mensagemId
              ? { ...m, status: 'sent' as const, evolution_msg_id: result.evolutionMsgId }
              : m,
          ),
        );
      } catch (err: any) {
        toast.error('Erro ao reenviar: ' + err.message);
        setMensagens(prev =>
          prev.map(m => (m.id === mensagemId ? { ...m, status: 'failed' as const } : m)),
        );
      }
    },
    [mensagens],
  );

  // ─── Notes ───────────────────────────────────────────────────────────────────

  const addNota = useCallback(
    async (content: string) => {
      const userId = userIdRef.current;
      if (!chatId || !userId) return;

      const { data, error } = await supabase
        .from('conversas_notas')
        .insert({ chat_id: chatId, user_id: userId, content })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao adicionar nota');
        throw error;
      }

      setNotas(prev => [data as Nota, ...prev]);
    },
    [chatId],
  );

  const updateNota = useCallback(
    async (notaId: string, content: string) => {
      setNotas(prev => prev.map(n => (n.id === notaId ? { ...n, content } : n)));

      const { error } = await supabase
        .from('conversas_notas')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', notaId);

      if (error) {
        toast.error('Erro ao atualizar nota');
        throw error;
      }
    },
    [],
  );

  const deleteNota = useCallback(async (notaId: string) => {
    let snapshot = notas;
    setNotas(prev => prev.filter(n => n.id !== notaId));

    const { error } = await supabase.from('conversas_notas').delete().eq('id', notaId);

    if (error) {
      setNotas(snapshot);
      toast.error('Erro ao excluir nota');
      throw error;
    }
  }, [notas]);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  // Ordena por `timestamp` (messageTimestamp do WhatsApp), não `created_at`
  // (que reflete o instante de inserção no banco). Em alta concorrência
  // as duas divergem e mensagens podem aparecer fora de ordem cronológica
  // real se usarmos `created_at`. (P2-14 da auditoria)
  const sortedMensagens = useMemo(
    () => [...mensagens].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [mensagens],
  );

  return {
    chat,
    mensagens,
    notas,
    isLoading,
    error,
    sendMessage,
    retryMessage,
    addNota,
    updateNota,
    deleteNota,
    markAllRead,
    sortedMensagens,
    hasMore,
    loadMore,
  };
}
