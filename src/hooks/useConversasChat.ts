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
    type?: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
    mediaUrl?: string;
    mediaMimeType?: string;
    mediaFilename?: string;
    mediaSizeBytes?: number;
    replyToId?: string;
  }) => Promise<void>;

  sendMediaMessage: (file: File, kind: 'image' | 'video' | 'document' | 'audio', isPtt?: boolean, caption?: string) => Promise<void>;
  sendSavedAudio: (audioSavedId: string, audio: { media_url: string; nome: string; duration: number }) => Promise<void>;
  sendSticker: (fileOrUrl: File | string) => Promise<void>;

  retryMessage: (mensagemId: string) => Promise<void>;
  deleteMessage: (mensagemId: string) => Promise<void>;
  editMessage: (mensagemId: string, newContent: string) => Promise<void>;
  reactMessage: (mensagemId: string, emoji: string) => Promise<void>;

  addNota: (content: string) => Promise<void>;
  updateNota: (notaId: string, content: string) => Promise<void>;
  deleteNota: (notaId: string) => Promise<void>;

  markAllRead: () => Promise<void>;

  // ─── Derived ─────────────────────────────────────────────────────────────────
  sortedMensagens: Mensagem[];
  hasMore: boolean;
  loadMore: () => Promise<void>;
  presenceStatus: string | null;
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
  const [presenceStatus, setPresenceStatus] = useState<string | null>(null);

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
          setChat(chatResult.data as unknown as Chat);
        }

        if (mensagensResult.error) throw mensagensResult.error;
        if (!cancelled) {
          const raw = mensagensResult.data ?? [];
          setMensagens(raw.reverse() as unknown as MensagemLocal[]);
          lastPageWasFullRef.current = raw.length >= INITIAL_PAGE_SIZE;
        }

        if (notasResult.error) console.warn('[Conversas] Notas load error:', notasResult.error);
        if (!cancelled) {
          setNotas(notasResult.data ?? []);
        }

        // Auto-mark read
        if (autoMarkRead && chatResult.data && (chatResult.data as Chat).unread_count > 0) {
          // Fase 1: Delegação exclusiva para o worker sem race condition
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const workerUrl = import.meta.env.VITE_EDGE_API_URL;
            if (workerUrl) {
              fetch(`${workerUrl}/api/conversas/mark-read/${chatId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
              }).catch(err => console.warn('[ConversasChat] mark-read worker failed:', err));
            }
          }
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

    const currentCount = mensagens.length;
    const from = currentCount;
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
        setMensagens(prev => [...(olderReversed as unknown as MensagemLocal[]), ...prev]);
        setPage(prev => prev + 1);
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
  }, [chatId, isLoading, mensagens.length]);

  // hasMore ativo enquanto a última página retornou completa e há mensagens carregadas
  const hasMore = lastPageWasFullRef.current && mensagens.length > 0;

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
            const existingIndex = prev.findIndex(
              m => m.id === newMsg.id || (m.evolution_msg_id && m.evolution_msg_id === newMsg.evolution_msg_id),
            );
            if (existingIndex !== -1) {
              const next = [...prev];
              next[existingIndex] = { ...next[existingIndex], ...newMsg };
              return next;
            }
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
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversas_mensagens',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          if (DEBUG) console.log('[ConversasChat] Message delete:', payload.old);
          setMensagens(prev => prev.filter(m => m.id !== payload.old.id));
        },
      )
      .on(
        'broadcast',
        { event: 'presence' },
        (payload) => {
          setPresenceStatus(payload.payload.status);
          // Auto clear after 4 seconds
          setTimeout(() => {
            setPresenceStatus((curr) => curr === payload.payload.status ? null : curr);
          }, 4000);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [chatId, user?.id, markReadLocal, autoMarkRead, markAllRead]);

  // ─── Send message ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (input: {
      content: string;
      type?: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
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

      // UUID gerado no cliente garante que o Realtime INSERT reconheça a mesma mensagem sem duplicar!
      const msgId = crypto.randomUUID();
      const quotedMsg = input.replyToId ? mensagens.find(m => m.id === input.replyToId) : null;

      const optimisticMsg: Mensagem = {
        id: msgId,
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
        reply_to_id: input.replyToId ?? null,
        quoted_content: quotedMsg?.content ?? (quotedMsg?.type === 'image' ? '📷 Foto' : quotedMsg?.type === 'audio' ? '🎤 Áudio' : null),
        quoted_sender: quotedMsg ? (quotedMsg.direction === 'outbound' ? 'Você' : 'Contato') : null,
        quoted_type: quotedMsg?.type ?? null,
        timestamp: new Date().toISOString(),
        reactions: null,
        created_at: new Date().toISOString(),
        is_deleted: false,
        is_edited: false,
        edited_at: null,
      };

      // Optimistic insert
      setMensagens(prev => [...prev, optimisticMsg]);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const workerUrl = import.meta.env.VITE_EDGE_API_URL || '';
        
        // Call Worker outbound endpoint com o mesmo msgId
        const response = await fetch(`${workerUrl}/api/conversas/send-message`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({
            id: msgId,
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

        // Atualiza status para 'sent'
        setMensagens(prev =>
          prev.map(m =>
            m.id === msgId
              ? { ...m, status: 'sent' as const, evolution_msg_id: result.evolutionMsgId ?? m.evolution_msg_id }
              : m,
          ),
        );
      } catch (err: any) {
        setMensagens(prev =>
          prev.map(m =>
            m.id === msgId ? { ...m, status: 'failed' as const } : m,
          ),
        );
        toast.error('Erro ao enviar: ' + err.message);
        throw err;
      }
    },
    [chatId],
  );

  // ─── Send media message (com upload em background e preview imediato) ─────────

  const sendMediaMessage = useCallback(
    async (file: File, kind: 'image' | 'video' | 'document' | 'audio', isPtt?: boolean, caption?: string) => {
      const userId = userIdRef.current;
      const instanceId = instanceIdRef.current;
      if (!chatId || !userId || !instanceId) {
        throw new Error('Chat não carregado');
      }

      const msgId = crypto.randomUUID();
      const localPreviewUrl = URL.createObjectURL(file);

      // 1. Mensagem otimista na tela imediatamente com preview local
      const optimisticMsg: Mensagem = {
        id: msgId,
        user_id: userId,
        chat_id: chatId,
        instance_id: instanceId,
        evolution_msg_id: null,
        direction: 'outbound',
        type: kind,
        content: caption?.trim() || '',
        media_url: localPreviewUrl,
        media_mime_type: file.type || 'application/octet-stream',
        media_filename: file.name,
        media_size_bytes: file.size,
        status: 'pending',
        is_forwarded: null,
        reply_to_id: null,
        quoted_content: null,
        quoted_sender: null,
        quoted_type: null,
        timestamp: new Date().toISOString(),
        reactions: null,
        created_at: new Date().toISOString(),
        is_deleted: false,
        is_edited: false,
        edited_at: null,
      };

      setMensagens(prev => [...prev, optimisticMsg]);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Sessão expirada');

        const workerUrl = import.meta.env.VITE_EDGE_API_URL || '';

        // 2. Upload para Cloudflare R2
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', chatId);

        const uploadRes = await fetch(`${workerUrl}/api/conversas/media-upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error('Falha no upload: ' + errText);
        }

        const uploadData = await uploadRes.json();
        if (!uploadData.mediaUrl) {
          throw new Error('Upload concluído sem URL de mídia');
        }

        // 3. Enviar mensagem via WhatsApp Evolution Worker
        const sendRes = await fetch(`${workerUrl}/api/conversas/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            id: msgId,
            chatId,
            instanceId,
            content: caption?.trim() || '',
            type: kind,
            mediaUrl: uploadData.mediaUrl,
            mediaMimeType: uploadData.mediaMimeType || file.type,
            mediaFilename: uploadData.mediaFilename || file.name,
            mediaSizeBytes: uploadData.mediaSizeBytes || file.size,
            isPtt,
          }),
        });

        if (!sendRes.ok) {
          const errJson = await sendRes.json();
          throw new Error(errJson.error || 'Falha ao despachar mídia para o WhatsApp');
        }

        const sendResult = await sendRes.json();

        // 4. Atualizar com URL pública definitiva do R2 e status sent
        setMensagens(prev =>
          prev.map(m =>
            m.id === msgId
              ? {
                  ...m,
                  media_url: uploadData.mediaUrl,
                  evolution_msg_id: sendResult.evolutionMsgId || m.evolution_msg_id,
                  status: 'sent' as const,
                }
              : m,
          ),
        );
      } catch (err: any) {
        console.error('[sendMediaMessage] Erro:', err);
        setMensagens(prev =>
          prev.map(m => (m.id === msgId ? { ...m, status: 'failed' as const } : m)),
        );
        toast.error('Erro ao enviar mídia: ' + (err.message || 'Erro de conexão'));
      }
    },
    [chatId],
  );

  // ─── Send sticker (Fase 2) ────────────────────────────────────────────────

  const sendSticker = useCallback(
    async (fileOrUrl: File | string) => {
      const userId = userIdRef.current;
      const instanceId = instanceIdRef.current;
      if (!chatId || !userId || !instanceId) {
        throw new Error('Chat não carregado');
      }

      const msgId = crypto.randomUUID();
      const isUrl = typeof fileOrUrl === 'string';
      const localPreviewUrl = isUrl ? fileOrUrl : URL.createObjectURL(fileOrUrl as File);

      const optimisticMsg: Mensagem = {
        id: msgId,
        user_id: userId,
        chat_id: chatId,
        instance_id: instanceId,
        evolution_msg_id: null,
        direction: 'outbound',
        type: 'sticker',
        content: '🧸 Figurinha',
        media_url: localPreviewUrl,
        media_mime_type: isUrl ? 'image/webp' : (fileOrUrl as File).type || 'image/webp',
        media_filename: isUrl ? 'sticker.webp' : (fileOrUrl as File).name,
        media_size_bytes: isUrl ? 0 : (fileOrUrl as File).size,
        status: 'pending',
        is_forwarded: null,
        reply_to_id: null,
        quoted_content: null,
        quoted_sender: null,
        quoted_type: null,
        timestamp: new Date().toISOString(),
        reactions: null,
        created_at: new Date().toISOString(),
        is_deleted: false,
        is_edited: false,
        edited_at: null,
      };

      setMensagens(prev => [...prev, optimisticMsg]);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Sessão expirada');

        const workerUrl = import.meta.env.VITE_EDGE_API_URL || '';
        let finalMediaUrl = localPreviewUrl;
        
        if (!isUrl) {
          // Upload sticker para R2
          const formData = new FormData();
          formData.append('file', fileOrUrl as File);
          formData.append('chatId', chatId);

          const uploadRes = await fetch(`${workerUrl}/api/conversas/media-upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
          });

          if (!uploadRes.ok) {
            throw new Error('Falha no upload da figurinha');
          }
          const uploadData = await uploadRes.json();
          finalMediaUrl = uploadData.mediaUrl;
        }

        const sendRes = await fetch(`${workerUrl}/api/conversas/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            id: msgId,
            chatId,
            instanceId,
            content: '',
            type: 'sticker',
            mediaUrl: finalMediaUrl,
            mediaMimeType: isUrl ? 'image/webp' : (fileOrUrl as File).type || 'image/webp',
            mediaFilename: isUrl ? 'sticker.webp' : (fileOrUrl as File).name,
            mediaSizeBytes: isUrl ? 0 : (fileOrUrl as File).size,
          }),
        });

        if (!sendRes.ok) {
          const errData = await sendRes.json().catch(() => ({}));
          throw new Error(errData.error || errData.detail || 'Falha ao enviar figurinha via Worker');
        }

        const sendData = await sendRes.json();
        
        setMensagens(prev =>
          prev.map(m =>
            m.id === msgId
              ? {
                  ...m,
                  status: 'sent',
                  evolution_msg_id: sendData.evolutionMsgId || sendData.key?.id || m.evolution_msg_id,
                  media_url: finalMediaUrl,
                }
              : m,
          ),
        );
      } catch (err: any) {
        console.error('[sendSticker] Erro:', err);
        setMensagens(prev =>
          prev.map(m => (m.id === msgId ? { ...m, status: 'failed' as const } : m)),
        );
        toast.error('Erro ao enviar figurinha: ' + (err.message || 'Erro de conexão'));
      }
    },
    [chatId],
  );

  // ─── Send saved audio ─────────────────────────────────────────────────────────

  const sendSavedAudio = useCallback(
    async (audioSavedId: string, audio: { media_url: string; nome: string; duration: number }) => {
      const userId = userIdRef.current;
      const instanceId = instanceIdRef.current;
      if (!chatId || !userId || !instanceId) {
        throw new Error('Chat não carregado');
      }

      const msgId = crypto.randomUUID();

      const optimisticMsg: Mensagem = {
        id: msgId,
        user_id: userId,
        chat_id: chatId,
        instance_id: instanceId,
        evolution_msg_id: null,
        direction: 'outbound',
        type: 'audio',
        content: '',
        media_url: audio.media_url,
        media_mime_type: 'audio/webm',
        media_filename: audio.nome,
        media_size_bytes: null,
        status: 'pending',
        is_forwarded: null,
        reply_to_id: null,
        quoted_content: null,
        quoted_sender: null,
        quoted_type: null,
        timestamp: new Date().toISOString(),
        reactions: null,
        created_at: new Date().toISOString(),
        is_deleted: false,
        is_edited: false,
        edited_at: null,
      };

      setMensagens(prev => [...prev, optimisticMsg]);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Sessão expirada');

        const workerUrl = import.meta.env.VITE_EDGE_API_URL || '';
        const res = await fetch(`${workerUrl}/api/conversas/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            id: msgId,
            chatId,
            instanceId,
            content: '',
            type: 'audio',
            audioSavedId,
            isPtt: true,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erro ao enviar áudio salvo');
        }

        const result = await res.json();
        setMensagens(prev =>
          prev.map(m =>
            m.id === msgId
              ? { ...m, status: 'sent' as const, evolution_msg_id: result.evolutionMsgId || m.evolution_msg_id }
              : m,
          ),
        );
      } catch (err: any) {
        console.error('[sendSavedAudio] Erro:', err);
        setMensagens(prev =>
          prev.map(m => (m.id === msgId ? { ...m, status: 'failed' as const } : m)),
        );
        toast.error('Erro ao enviar áudio: ' + (err.message || 'Erro de conexão'));
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

  const deleteMessage = useCallback(async (mensagemId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workerUrl = import.meta.env.VITE_EDGE_API_URL || '';

      const response = await fetch(`${workerUrl}/api/conversas/message/delete/${mensagemId}`, {
        method: 'DELETE',
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });

      if (!response.ok) {
        let errorMsg = 'Erro ao apagar mensagem';
        const rawText = await response.text();
        try {
          const err = JSON.parse(rawText);
          errorMsg = err.error || err.detail || errorMsg;
        } catch {
          errorMsg = rawText || `Erro HTTP ${response.status}`;
        }
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      toast.error('Erro ao apagar: ' + err.message);
    }
  }, []);

  const editMessage = useCallback(async (mensagemId: string, newContent: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workerUrl = import.meta.env.VITE_EDGE_API_URL || '';

      const response = await fetch(`${workerUrl}/api/conversas/message/update/${mensagemId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) {
        let errorMsg = 'Erro ao editar mensagem';
        const rawText = await response.text();
        try {
          const err = JSON.parse(rawText);
          errorMsg = err.error || err.detail || errorMsg;
        } catch {
          errorMsg = rawText || `Erro HTTP ${response.status}`;
        }
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      toast.error('Erro ao editar: ' + err.message);
      throw err;
    }
  }, []);

  const reactMessage = useCallback(async (mensagemId: string, emoji: string) => {
    // Snapshot para rollback
    const snapshot = mensagens;

    // Calcular nova reação com toggle
    const targetMsg = mensagens.find(m => m.id === mensagemId);
    if (!targetMsg) return;

    const currentReactions: any[] = Array.isArray((targetMsg as any).reactions) ? (targetMsg as any).reactions : [];
    const myExistingReaction = currentReactions.find((r: any) => r.fromMe);
    const isSameEmoji = myExistingReaction?.emoji === emoji;
    const finalEmoji = isSameEmoji ? '' : emoji;

    // Update otimista imediato
    const updatedReactions = isSameEmoji
      ? currentReactions.filter((r: any) => !r.fromMe)
      : [
          ...currentReactions.filter((r: any) => !r.fromMe),
          { emoji, fromMe: true, sender: 'Você', timestamp: new Date().toISOString() },
        ];

    setMensagens(prev =>
      prev.map(m => (m.id === mensagemId ? { ...m, reactions: updatedReactions } as any : m))
    );

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const workerUrl = import.meta.env.VITE_EDGE_API_URL || '';

      const response = await fetch(`${workerUrl}/api/conversas/message/react/${mensagemId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ reaction: finalEmoji }),
      });

      if (!response.ok) {
        let errorMsg = 'Erro ao reagir à mensagem';
        const rawText = await response.text();
        try {
          const err = JSON.parse(rawText);
          errorMsg = err.error || err.detail || errorMsg;
        } catch {
          errorMsg = rawText || `Erro HTTP ${response.status}`;
        }
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      toast.error('Erro ao reagir: ' + err.message);
      // Reverte em caso de erro
      setMensagens(snapshot);
    }
  }, [mensagens]);

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

  // Ordena por `timestamp` (messageTimestamp do WhatsApp) e garante deduplicação total por ID
  const sortedMensagens = useMemo(() => {
    const seen = new Set<string>();
    const unique: Mensagem[] = [];
    for (const m of mensagens) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        unique.push(m);
      }
    }
    return unique.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [mensagens]);

  return {
    chat,
    mensagens,
    notas,
    isLoading,
    error,
    sendMessage,
    sendMediaMessage,
    sendSticker,
    sendSavedAudio,
    retryMessage,
    deleteMessage,
    editMessage,
    reactMessage,
    addNota,
    updateNota,
    deleteNota,
    markAllRead,
    sortedMensagens,
    hasMore,
    loadMore,
    presenceStatus,
  };
}
