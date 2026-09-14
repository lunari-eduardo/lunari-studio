/**
 * Painel principal do chat (header + área de mensagens + composer).
 * Inclui IntersectionObserver para paginação de mensagens mais antigas.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Chat, Mensagem, Nota } from '@/modules/conversas/types';
import { ChatHeader } from './ChatHeader';
import { MessageComposer } from './MessageComposer';
import { MessageGroup } from './MessageGroup';
import { DateDivider } from './DateDivider';
import { NotesPanel } from './NotesPanel';
import { MessagesSkeleton } from './skeletons';
import { EmptyChatState } from './EmptyChatState';
import { useConversasChat } from '@/hooks/useConversasChat';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface ChatPanelProps {
  chat: Chat;
  onBack?: () => void;
  onArchive: () => void;
  onBlock: () => void;
  onPin: () => void;
  onDelete: () => void;
}

function groupByDay(messages: Mensagem[]): Array<{ day: string; items: Mensagem[] }> {
  const groups: Array<{ day: string; items: Mensagem[] }> = [];
  for (const m of messages) {
    const d = new Date(m.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups[groups.length - 1];
    if (last && last.day === key) {
      last.items.push(m);
    } else {
      groups.push({ day: key, items: [m] });
    }
  }
  return groups;
}

function groupAdjacent(messages: Mensagem[]): Mensagem[][] {
  const groups: Mensagem[][] = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    if (last && last[last.length - 1].direction === m.direction) {
      last.push(m);
    } else {
      groups.push([m]);
    }
  }
  return groups;
}

export function ChatPanel({
  chat,
  onBack,
  onArchive,
  onBlock,
  onPin,
  onDelete,
}: ChatPanelProps) {
  const {
    mensagens,
    notas,
    isLoading,
    sendMessage,
    retryMessage,
    addNota,
    deleteNota,
    markAllRead,
    hasMore,
    loadMore,
  } = useConversasChat(chat.id);

  const [notesOpen, setNotesOpen] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(0);
  // P0-05 / Fase 2 — controles para preservar a posição de scroll durante o
  // prepend de histórico feito pelo loadMore. Sem isto o auto-scroll cai
  // pro fim (parece bug) ou mantém a posição visual mas a referência
  // "primeira mensagem visível" muda sem aviso.
  const loadingOlderRef = useRef(false);
  const prevScrollHeightRef = useRef<number | null>(null);

  const grouped = useMemo(() => groupByDay(mensagens), [mensagens]);

  const items = useMemo(() => {
    const result: Array<{ type: 'date' | 'message_group'; date?: string; group?: Mensagem[]; id: string }> = [];
    grouped.forEach(g => {
      result.push({ type: 'date', date: g.items[0].timestamp, id: `date-${g.day}` });
      const adjacent = groupAdjacent(g.items);
      adjacent.forEach((group, idx) => {
        result.push({ type: 'message_group', group, id: `msg-${g.day}-${idx}` });
      });
    });
    return result;
  }, [grouped]);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 80,
    overscan: 20,
  });

  // Marcar como lido ao abrir
  useEffect(() => {
    markAllRead();
  }, [chat.id, markAllRead]);

  // Auto-scroll ao fim quando chegam mensagens novas, mas NÃO durante prepend.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Se estamos finalizando um prepend, restaura a posição visual.
    if (loadingOlderRef.current && prevScrollHeightRef.current != null) {
      // O scrollHeight pode não ter atualizado completamente devido à medição assíncrona do virtualizer,
      // mas ajustamos o melhor possível.
      const delta = el.scrollHeight - prevScrollHeightRef.current;
      el.scrollTop = el.scrollTop + delta;
      loadingOlderRef.current = false;
      prevScrollHeightRef.current = null;
      lastMessageCount.current = mensagens.length;
      return;
    }

    const newCount = mensagens.length;
    if (newCount > lastMessageCount.current && items.length > 0) {
      // Usa o virtualizer para rolar para o último item garantindo renderização correta
      rowVirtualizer.scrollToIndex(items.length - 1, { align: 'end' });
    }
    lastMessageCount.current = newCount;
  }, [mensagens.length, items.length, rowVirtualizer]);

  // IntersectionObserver para loadMore (scroll-up).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          const rootEl = scrollRef.current;
          if (rootEl) {
            loadingOlderRef.current = true;
            prevScrollHeightRef.current = rootEl.scrollHeight;
          }
          void loadMore();
        }
      },
      { root, rootMargin: '200px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-[#efeae2]">
        <ChatHeader
          chat={chat}
          onBack={onBack}
          onToggleNotes={() => setNotesOpen(v => !v)}
          onArchive={onArchive}
          onBlock={onBlock}
          onPin={onPin}
          onDelete={onDelete}
          notesOpen={notesOpen}
        />
        <MessagesSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 bg-[#efeae2]">
        <ChatHeader
          chat={chat}
          onBack={onBack}
          onToggleNotes={() => setNotesOpen(v => !v)}
          onArchive={onArchive}
          onBlock={onBlock}
          onPin={onPin}
          onDelete={onDelete}
          notesOpen={notesOpen}
        />

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)',
          }}
        >
          <div ref={sentinelRef} className="h-px" />
          
          {items.length === 0 ? (
            <EmptyChatState />
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = items[virtualRow.index];
                return (
                  <div
                    key={item.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {item.type === 'date' ? (
                      <DateDivider date={item.date!} />
                    ) : (
                      <MessageGroup
                        messages={item.group!}
                        onRetry={retryMessage}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <MessageComposer
          onSend={async content => {
            await sendMessage({ content });
          }}
          disabled={isUploadingMedia}
          onAttach={async (file, kind) => {
            try {
              setIsUploadingMedia(true);
              const toastId = toast.loading('Enviando mídia...');
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) {
                toast.error('Não autorizado', { id: toastId });
                return;
              }

              const formData = new FormData();
              formData.append('file', file);
              formData.append('chatId', chat.id);

              const workerUrl = import.meta.env.VITE_EDGE_API_URL;
              const res = await fetch(`${workerUrl}/api/conversas/media-upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
                body: formData,
              });

              if (!res.ok) throw new Error(await res.text());

              const data = await res.json();
              
              if (data.mediaUrl) {
                await sendMessage({
                  content: '', 
                  type: kind,
                  mediaUrl: data.mediaUrl,
                  mediaMimeType: data.mediaMimeType,
                  mediaFilename: data.mediaFilename,
                  mediaSizeBytes: data.mediaSizeBytes
                });
                toast.success('Mídia enviada', { id: toastId });
              } else {
                throw new Error('Upload falhou sem URL');
              }
            } catch (err) {
              console.error(err);
              toast.error('Erro ao enviar mídia. Verifique se o Worker foi feito deploy.', { id: toastId });
            } finally {
              setIsUploadingMedia(false);
            }
          }}
        />
      </div>

      {notesOpen ? (
        <NotesPanel
          notes={notas as Nota[]}
          onAdd={addNota}
          onDelete={deleteNota}
        />
      ) : null}
    </>
  );
}
