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
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 50;
  const userIdRef = useRef<string | null>(null);
  const instanceIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
            .order('created_at', { ascending: false })
            .range(0, PAGE_SIZE - 1),
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

        // Se o chat tiver apenas 1 mensagem histórica (a última da sincronização inicial),
        // buscar histórico mais profundo sob demanda na Evolution API em background
        if (chatResult.data && (mensagensResult.data?.length ?? 0) <= 1) {
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
    const userId = userIdRef.current;
    if (!userId) return;

    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('conversas_mensagens')
      .select('*')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      toast.error('Erro ao carregar mais mensagens');
      return;
    }

    if (data && data.length > 0) {
      setMensagens(prev => [...data.reverse(), ...prev]);
      setPage(nextPage);
    }
  }, [chatId, page, isLoading]);

  const hasMore = mensagens.length >= (page + 1) * PAGE_SIZE;

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
            return [...prev, newMsg];
          });

          // Auto-mark delivered/read for inbound
          if (newMsg.direction === 'inbound' && newMsg.status === 'delivered') {
            markReadLocal(newMsg.id);
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
    await supabase
      .from('conversas_chats')
      .update({ unread_count: 0 })
      .eq('id', chatId);
  }, [chatId]);

  // ─── Send message ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (input: {
      content: string;
      type?: 'text' | 'image' | 'audio' | 'video' | 'document';
      mediaUrl?: string;
      mediaMimeType?: string;
      mediaFilename?: string;
      mediaSizeBytes?: number;
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

  const sortedMensagens = useMemo(
    () => [...mensagens].sort((a, b) => a.created_at.localeCompare(b.created_at)),
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
