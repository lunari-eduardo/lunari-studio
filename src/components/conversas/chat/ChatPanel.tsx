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

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(0);

  // Marcar como lido ao abrir
  useEffect(() => {
    markAllRead();
  }, [chat.id, markAllRead]);

  // Auto-scroll para o fim quando chegam mensagens novas (mas não quando paginando acima)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const newCount = mensagens.length;
    if (newCount > lastMessageCount.current) {
      el.scrollTop = el.scrollHeight;
    }
    lastMessageCount.current = newCount;
  }, [mensagens.length]);

  // IntersectionObserver para loadMore (scroll-up)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          void loadMore();
        }
      },
      { root, rootMargin: '120px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  const grouped = useMemo(() => groupByDay(mensagens), [mensagens]);

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
          {grouped.length === 0 ? (
            <EmptyChatState />
          ) : (
            grouped.map(g => (
              <div key={g.day}>
                <DateDivider date={g.items[0].timestamp} />
                {groupAdjacent(g.items).map((group, idx) => (
                  <MessageGroup
                    key={`${g.day}-${idx}`}
                    messages={group}
                    onRetry={retryMessage}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        <MessageComposer
          onSend={async content => {
            await sendMessage({ content });
          }}
          onAttach={() => {
            // upload de mídia via conversas-media-upload (Fase 8) — TODO
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
