/**
 * Painel principal do chat (header + área de mensagens + composer).
 * Inclui IntersectionObserver para paginação de mensagens mais antigas.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Chat, EnrichedChat, Mensagem, Nota } from '@/modules/conversas/types';
import { ChatHeader } from './ChatHeader';
import { MessageComposer } from './MessageComposer';
import { MessageGroup } from './MessageGroup';
import { DateDivider } from './DateDivider';
import { ChatContextPanel } from '../context/ChatContextPanel';
import { AudiosSalvosLibrary } from './AudiosSalvosLibrary';
import { MessagesSkeleton } from './skeletons';
import { EmptyChatState } from './EmptyChatState';
import { useConversasChat } from '@/hooks/useConversasChat';
import { useAudiosSalvos } from '@/hooks/useAudiosSalvos';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ChatImagePreviewModal } from './ChatImagePreviewModal';

export interface ChatPanelProps {
  chat: Chat | EnrichedChat;
  onBack?: () => void;
  onArchive: () => void;
  onBlock: () => void;
  onPin: () => void;
  onDelete: () => void;
  onMarkUnread?: () => void;
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
  onMarkUnread,
}: ChatPanelProps) {
  const {
    mensagens,
    notas,
    isLoading,
    sendMessage,
    sendMediaMessage,
    sendSticker,
    sendSavedAudio,
    retryMessage,
    deleteMessage,
    editMessage,
    reactMessage,
    addNota,
    deleteNota,
    markAllRead,
    hasMore,
    loadMore,
  } = useConversasChat(chat.id, { autoMarkRead: true });

  const { save: saveAudio } = useAudiosSalvos();
  const isMobile = useIsMobile();

  type SidePanelTab = 'templates' | 'context' | 'notes';

  const [sidePanelOpen, setSidePanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1024; // Padrão sempre aberto no desktop
  });
  const [sidePanelTab, setSidePanelTab] = useState<SidePanelTab>('templates');
  const [injectedText, setInjectedText] = useState<string | null>(null);

  const [audiosSalvosOpen, setAudiosSalvosOpen] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Mensagem | null>(null);
  const [editingMessage, setEditingMessage] = useState<Mensagem | null>(null);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const chatImages = useMemo(() => {
    return mensagens.filter((m) => m.type === 'image' && m.media_url && !m.is_deleted);
  }, [mensagens]);

  const handleToggleTab = (tab: SidePanelTab) => {
    if (sidePanelOpen && sidePanelTab === tab) {
      setSidePanelOpen(false);
      if (!isMobile) localStorage.setItem('lunari_conversas_sidepanel_open', 'false');
    } else {
      setSidePanelTab(tab);
      setSidePanelOpen(true);
      if (!isMobile) localStorage.setItem('lunari_conversas_sidepanel_open', 'true');
    }
  };

  const handleInsertTemplate = (renderedText: string) => {
    setInjectedText(renderedText);
  };

  const handleSendDirectly = async (renderedText: string) => {
    await sendMessage({ content: renderedText });
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(0);
  // Âncora de scroll dinâmico para evitar saltos durante paginação
  const anchorItemRef = useRef<{ id: string; offset: number } | null>(null);
  const isAtBottomRef = useRef(true);

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
    getItemKey: (index) => items[index].id,
  });

  const handleScrollToMessage = (messageId: string) => {
    const index = items.findIndex((item) => {
      if (item.type === 'message_group' && item.group) {
        return item.group.some((m) => m.id === messageId);
      }
      return false;
    });

    if (index !== -1) {
      rowVirtualizer.scrollToIndex(index, { align: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    } else {
      toast.info('Mensagem muito antiga para ser visualizada diretamente.');
    }
  };

  // Marcar como lido ao abrir
  useEffect(() => {
    markAllRead();
  }, [chat.id, markAllRead]);

  const totalSize = rowVirtualizer.getTotalSize();
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Se estamos no fundo ou é o load inicial, manter a rolagem no fim.
    // Isso garante que se imagens carregarem e mudarem o totalSize, continuamos no fim.
    if (isAtBottomRef.current || lastMessageCount.current === 0) {
      rowVirtualizer.scrollToIndex(items.length - 1, { align: 'end' });
    } 
    // Se não estamos no fundo (ex: scroll up para histórico), manter a âncora visual exata
    else if (anchorItemRef.current && items.length > 0) {
      const { id, offset } = anchorItemRef.current;
      const index = items.findIndex((i) => i.id === id);
      if (index !== -1) {
        const itemStart = rowVirtualizer.getOffsetForIndex(index, 'start');
        if (typeof itemStart === 'number') {
          // Ajustar o scrollTop para manter a exata mesma distância visual do topo
          el.scrollTop = itemStart - offset;
        }
      }
    }

    lastMessageCount.current = mensagens.length;
  }, [totalSize, items.length, rowVirtualizer, mensagens.length]);

  // IntersectionObserver para loadMore (scroll-up).
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
      { root, rootMargin: '200px' },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-[#F6F5F2] dark:bg-[#0E0E10]">
        <ChatHeader
          chat={chat}
          onBack={onBack}
          onToggleTemplates={() => handleToggleTab('templates')}
          onToggleContext={() => handleToggleTab('context')}
          onToggleNotes={() => handleToggleTab('notes')}
          onArchive={onArchive}
          onBlock={onBlock}
          onPin={onPin}
          onDelete={onDelete}
          onMarkUnread={onMarkUnread}
          templatesOpen={sidePanelOpen && sidePanelTab === 'templates'}
          contextOpen={sidePanelOpen && sidePanelTab === 'context'}
          notesOpen={sidePanelOpen && sidePanelTab === 'notes'}
        />
        <MessagesSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 bg-[#F6F5F2] dark:bg-[#0E0E10] relative overflow-hidden">
        {/* Atmosfera de fundo suave e moderna (Lightweight, pure CSS, responsive) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#E8DCB8]/25 dark:bg-[#D4AF37]/[0.035] blur-[100px]" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#DCE4EC]/30 dark:bg-[#161D2A]/30 blur-[110px]" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-radial from-amber-500/[0.015] dark:from-white/[0.01] to-transparent blur-3xl" />
        </div>

        <ChatHeader
          chat={chat}
          onBack={onBack}
          onToggleTemplates={() => handleToggleTab('templates')}
          onToggleContext={() => handleToggleTab('context')}
          onToggleNotes={() => handleToggleTab('notes')}
          onArchive={onArchive}
          onBlock={onBlock}
          onPin={onPin}
          onDelete={onDelete}
          onMarkUnread={onMarkUnread}
          templatesOpen={sidePanelOpen && sidePanelTab === 'templates'}
          contextOpen={sidePanelOpen && sidePanelTab === 'context'}
          notesOpen={sidePanelOpen && sidePanelTab === 'notes'}
        />

        <div className="flex-1 min-h-0 relative flex flex-col">
          <div
            ref={scrollRef}
          onScroll={(e) => {
            const target = e.currentTarget;
            const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
            isAtBottomRef.current = distanceToBottom < 50;

            if (!isAtBottomRef.current) {
              const virtualItems = rowVirtualizer.getVirtualItems();
              if (virtualItems.length > 0) {
                const first = virtualItems[0];
                const item = items[first.index];
                if (item) {
                  anchorItemRef.current = {
                    id: item.id,
                    offset: first.start - target.scrollTop,
                  };
                }
              }
            } else {
              anchorItemRef.current = null;
            }

            // Mostra o botão se o usuário subiu mais de 300px da base
            const isScrolledUp = distanceToBottom > 300;
            setShowScrollButton((prev) => (prev !== isScrolledUp ? isScrolledUp : prev));
          }}
          className="flex-1 overflow-y-auto relative z-10 dark:[color-scheme:dark]"
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
                    <div className="w-full max-w-5xl px-3 sm:px-6">
                      {item.type === 'date' ? (
                        <DateDivider date={item.date!} />
                      ) : (
                        <MessageGroup
                          messages={item.group!}
                          highlightedMessageId={highlightedMessageId}
                          onRetry={retryMessage}
                          onReply={(msg) => {
                            setEditingMessage(null);
                            setReplyingTo(msg);
                          }}
                          onDelete={deleteMessage}
                          onReact={reactMessage}
                          onEdit={(msg) => {
                            setReplyingTo(null);
                            setEditingMessage(msg);
                          }}
                          onPreviewImage={setPreviewImageId}
                          onScrollToMessage={handleScrollToMessage}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>

          {/* Botão de Scroll to Bottom (Desktop) */}
          {!isMobile && showScrollButton && (
            <button
              onClick={() => {
                if (items.length > 0) {
                  rowVirtualizer.scrollToIndex(items.length - 1, { align: 'end' });
                }
              }}
              className="absolute bottom-4 right-6 z-50 p-2.5 bg-white/90 dark:bg-[#1C1C1C]/90 backdrop-blur-md text-zinc-500 dark:text-zinc-400 border border-black/5 dark:border-white/10 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.5)] hover:bg-white dark:hover:bg-[#242424] hover:text-zinc-800 dark:hover:text-zinc-200 transition-all animate-in fade-in zoom-in slide-in-from-bottom-4"
              aria-label="Ir para o final da conversa"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          )}
        </div>

        <MessageComposer
          onSend={async content => {
            await sendMessage({ content, replyToId: replyingTo?.id });
            setReplyingTo(null);
          }}
          disabled={isUploadingMedia}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onSaveEdit={async (id, newContent) => {
            await editMessage(id, newContent);
            setEditingMessage(null);
          }}
          injectedText={injectedText}
          onClearInjectedText={() => setInjectedText(null)}
          onAttach={async (file, kind, isPtt, caption) => {
            if (kind === 'contact') {
              toast.info('Envio de contato em breve');
              return;
            }
            try {
              setIsUploadingMedia(true);
              if (kind === 'sticker') {
                await sendSticker(file);
              } else {
                await sendMediaMessage(file, kind as 'image' | 'video' | 'document' | 'audio', isPtt, caption);
              }
            } finally {
              setIsUploadingMedia(false);
            }
          }}
          onOpenAudiosSalvos={() => setAudiosSalvosOpen(true)}
          onSaveAudio={async (file, duration) => {
            try {
              await saveAudio.mutateAsync({ file, duration });
            } catch {
              // toast já tratado no hook
            }
          }}
        />
      </div>

      {isMobile ? (
        <Sheet open={sidePanelOpen} onOpenChange={setSidePanelOpen}>
          <SheetContent
            side="right"
            className="p-0 w-full sm:max-w-md flex flex-col bg-[#FBFBF9] dark:bg-[#161616] border-l border-black/[0.06] dark:border-white/[0.08] z-50 focus:outline-none"
          >
            <SheetTitle className="sr-only">Painel do Contato</SheetTitle>
            <SheetDescription className="sr-only">Modelos de mensagem, contexto Lunari e notas internas</SheetDescription>
            <ChatContextPanel
              chat={chat}
              notas={notas as Nota[]}
              onAddNota={addNota}
              onDeleteNota={deleteNota}
              onClose={() => setSidePanelOpen(false)}
              initialTab={sidePanelTab}
              isDrawer
              onInsertToComposer={handleInsertTemplate}
              onSendDirectly={handleSendDirectly}
            />
          </SheetContent>
        </Sheet>
      ) : sidePanelOpen ? (
        <ChatContextPanel
          chat={chat}
          notas={notas as Nota[]}
          onAddNota={addNota}
          onDeleteNota={deleteNota}
          onClose={() => {
            setSidePanelOpen(false);
            localStorage.setItem('lunari_conversas_sidepanel_open', 'false');
          }}
          initialTab={sidePanelTab}
          onInsertToComposer={handleInsertTemplate}
          onSendDirectly={handleSendDirectly}
        />
      ) : null}

      {audiosSalvosOpen ? (
        <AudiosSalvosLibrary
          onSendAudio={async (audio) => {
            setAudiosSalvosOpen(false);
            await sendSavedAudio(audio.id, audio);
          }}
          onClose={() => setAudiosSalvosOpen(false)}
        />
      ) : null}

      {previewImageId && (
        <ChatImagePreviewModal
          images={chatImages}
          initialImageId={previewImageId}
          onClose={() => setPreviewImageId(null)}
        />
      )}
    </>
  );
}
