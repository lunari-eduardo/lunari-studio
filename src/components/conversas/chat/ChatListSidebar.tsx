/**
 * Sidebar esquerda da UI WhatsApp: barra de status + busca + lista de chats.
 */

import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChatListItem } from './ChatListItem';
import { ChatListSkeleton } from './skeletons';
import { InstanceStatusBar } from '../shared/InstanceStatusBar';
import { MessageSquare } from 'lucide-react';
import type { Chat } from '@/modules/conversas/types';
import type { InstanciaStatus } from '@/modules/conversas/types';

export interface ChatListSidebarProps {
  chats: Chat[];
  isLoading: boolean;
  selectedChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  instance: {
    instance_name: string;
    status: InstanciaStatus;
    phone?: string | null;
  } | null;
  onRefreshQr: () => void;
  isRefreshingQr: boolean;
  onNewChat: () => void;
}

export function ChatListSidebar({
  chats,
  isLoading,
  selectedChatId,
  onSelectChat,
  instance,
  onRefreshQr,
  isRefreshingQr,
  onNewChat,
}: ChatListSidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return chats;
    const q = search.toLowerCase();
    return chats.filter(
      c =>
        (c.contato_nome ?? '').toLowerCase().includes(q) ||
        (c.contato_phone_normalized ?? '').includes(q) ||
        (c.ultima_mensagem ?? '').toLowerCase().includes(q),
    );
  }, [chats, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.pin === 'pinned' && b.pin !== 'pinned') return -1;
      if (a.pin !== 'pinned' && b.pin === 'pinned') return 1;
      const aDate = a.ultima_mensagem_data ?? '0';
      const bDate = b.ultima_mensagem_data ?? '0';
      return bDate.localeCompare(aDate);
    });
  }, [filtered]);

  const blocked = sorted.filter(c => c.status === 'blocked');
  const archived = sorted.filter(c => c.status === 'archived');
  const active = sorted.filter(c => c.status === 'active');

  return (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col bg-background border-r border-border h-full">
      {instance ? (
        <InstanceStatusBar
          instanceName={instance.instance_name}
          status={instance.status}
          phone={instance.phone}
          onRefreshQr={onRefreshQr}
          isRefreshing={isRefreshingQr}
        />
      ) : null}

      {/* Header com busca + new chat */}
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar conversa…"
            className="pl-9 h-9 text-sm rounded-full bg-muted border-0 focus-visible:ring-1"
          />
        </div>
        <button
          type="button"
          onClick={onNewChat}
          aria-label="Nova conversa"
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        {isLoading ? (
          <ChatListSkeleton />
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {blocked.length > 0 ? (
              <Section title="Bloqueadas">
                {blocked.map(c => (
                  <ChatListItem
                    key={c.id}
                    chat={c}
                    isActive={c.id === selectedChatId}
                    onClick={() => onSelectChat(c)}
                  />
                ))}
              </Section>
            ) : null}
            {archived.length > 0 ? (
              <Section title="Arquivadas">
                {archived.map(c => (
                  <ChatListItem
                    key={c.id}
                    chat={c}
                    isActive={c.id === selectedChatId}
                    onClick={() => onSelectChat(c)}
                  />
                ))}
              </Section>
            ) : null}
            <Section title={blocked.length + archived.length > 0 ? 'Ativas' : ''}>
              {active.map(c => (
                <ChatListItem
                  key={c.id}
                  chat={c}
                  isActive={c.id === selectedChatId}
                  onClick={() => onSelectChat(c)}
                />
              ))}
            </Section>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      {title ? (
        <div className="px-4 pt-2 pb-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
        </div>
      ) : null}
      {children}
    </>
  );
}
