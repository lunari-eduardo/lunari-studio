/**
 * Sidebar esquerda do módulo Conversas.
 *
 * Layout: barra de instância → header com busca → filtros primários →
 * lista de chats.
 *
 * Fase 2: filtros primários (Todas / Não lidas / Clientes / Leads)
 * com contadores dinâmicos extraídos de `chatCounts`.
 */

import { useMemo, useState } from 'react';
import { Plus, Search, X, MessageSquare, Users, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChatListItem } from './ChatListItem';
import { ChatListSkeleton } from './skeletons';
import { InstanceStatusBar } from '../shared/InstanceStatusBar';
import type { Chat, EnrichedChat, InstanciaStatus } from '@/modules/conversas/types';
import { useChatLeadStatuses } from '@/hooks/useChatLeadStatuses';

export type PrimaryFilter = 'all' | 'unread' | 'cliente' | 'lead';

export interface ChatCounts {
  all: number;
  unread: number;
  cliente: number;
  lead: number;
}

export interface ChatListSidebarProps {
  chats: EnrichedChat[];
  isLoading: boolean;
  selectedChatId: string | null;
  onSelectChat: (chat: EnrichedChat) => void;
  instance: {
    instance_name: string;
    status: InstanciaStatus;
    phone?: string | null;
  } | null;
  onRefreshQr: () => void;
  isRefreshingQr: boolean;
  onNewChat: () => void;
  onDisconnect?: () => void;
  onSyncChats?: () => void;
  isSyncingChats?: boolean;
  /** Nome amigável do estúdio (perfil.empresa ?? perfil.nome) usado na barra de instância. */
  studioDisplayName?: string | null;
  onTogglePin?: (chat: EnrichedChat, e?: React.MouseEvent) => void;
  isPinLimitReached?: boolean;
  /** Contadores dinâmicos para os filtros primários. */
  chatCounts: ChatCounts;
  onArchive?: (chat: EnrichedChat) => void;
  onBlock?: (chat: EnrichedChat) => void;
  onMarkUnread?: (chat: EnrichedChat) => void;
  onMarkRead?: (chat: EnrichedChat) => void;
  onDeleteChat?: (chat: EnrichedChat) => void;
}

const FILTER_TABS: { key: PrimaryFilter; label: string; icon?: React.ElementType }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'unread', label: 'Não lidas' },
  { key: 'cliente', label: 'Clientes', icon: UserCheck },
  { key: 'lead', label: 'Leads', icon: Users },
];

export function ChatListSidebar({
  chats,
  isLoading,
  selectedChatId,
  onSelectChat,
  instance,
  onRefreshQr,
  isRefreshingQr,
  onNewChat,
  onDisconnect,
  onSyncChats,
  isSyncingChats,
  studioDisplayName,
  onTogglePin,
  isPinLimitReached = false,
  chatCounts,
  onArchive,
  onBlock,
  onMarkUnread,
  onMarkRead,
  onDeleteChat,
}: ChatListSidebarProps) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<PrimaryFilter>('all');
  const { getLeadStatusForChat } = useChatLeadStatuses(chats);

  // ─── Filtro combinado: primary filter + busca ─────────────────────────────────

  const filtered = useMemo(() => {
    // 1. Aplica filtro primário
    let base = chats.filter(c => c.status === 'active');
    if (activeFilter === 'unread') base = base.filter(c => (c.unread_count ?? 0) > 0);
    else if (activeFilter === 'cliente') base = base.filter(c => c.contato_tipo === 'cliente');
    else if (activeFilter === 'lead') base = base.filter(c => c.contato_tipo === 'lead');

    // 2. Aplica busca (nome, telefone, última mensagem)
    if (!search.trim()) return base;
    const terms = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return base.filter(c => {
      const target = `${c.contato_nome ?? ''} ${c.contato_phone_normalized ?? ''} ${c.ultima_mensagem ?? ''}`.toLowerCase();
      return terms.every(term => target.includes(term));
    });
  }, [chats, activeFilter, search]);

  // ─── Ordenação: fixadas primeiro, depois por data (mais recente primeiro) ──────
  // ISO 8601 strings são lexicograficamente ordenáveis, então localeCompare funciona.

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // Fixadas sempre no topo
      if (a.pin === 'pinned' && b.pin !== 'pinned') return -1;
      if (a.pin !== 'pinned' && b.pin === 'pinned') return 1;
      // Depois por data decrescente (mais recente primeiro)
      const aDate = a.ultima_mensagem_data ?? '';
      const bDate = b.ultima_mensagem_data ?? '';
      if (aDate !== bDate) return bDate.localeCompare(aDate);
      // Desempate estável por id (mais antigo criado primeiro)
      return a.id.localeCompare(b.id);
    });
  }, [filtered]);

  const activeCount = chatCounts[activeFilter];

  return (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col bg-background border-r border-border h-full overflow-hidden">
      {/* ── Barra de instância ── */}
      {instance ? (
        <InstanceStatusBar
          instanceName={instance.instance_name}
          status={instance.status}
          phone={instance.phone}
          onRefreshQr={onRefreshQr}
          isRefreshing={isRefreshingQr}
          onDisconnect={onDisconnect}
          onSyncChats={onSyncChats}
          isSyncingChats={isSyncingChats}
          displayName={studioDisplayName}
        />
      ) : null}

      {/* ── Header: busca + novo chat ── */}
      <div className="px-3 pt-2.5 pb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar conversa…"
            className="pl-9 pr-7 h-9 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-transparent focus:border-border focus:bg-background transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onNewChat}
          aria-label="Nova conversa"
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* ── Filtros primários ── */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {FILTER_TABS.map(tab => {
            const count = chatCounts[tab.key];
            const isActive = activeFilter === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  whitespace-nowrap transition-all flex-shrink-0
                  ${isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border border-zinc-900 dark:border-zinc-100'
                    : 'bg-zinc-100/70 dark:bg-zinc-800/70 text-muted-foreground border border-transparent hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }
                `}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {tab.label}
                {count > 0 && (
                  <span
                    className={`
                      inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold
                      ${isActive
                        ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }
                    `}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Separator className="shrink-0" />

      {/* ── Lista de conversas ── */}
      <ScrollArea className="flex-1 w-full overflow-hidden [&>div>div]:!block">
        {isLoading ? (
          <ChatListSkeleton />
        ) : sorted.length === 0 ? (
          <EmptyState hasSearch={!!search.trim()} filter={activeFilter} />
        ) : (
          <div className="py-1">
            {sorted.map(c => (
              <ChatListItem
                key={c.id}
                chat={c}
                isActive={c.id === selectedChatId}
                onClick={() => onSelectChat(c)}
                onTogglePin={onTogglePin}
                isPinLimitReached={isPinLimitReached}
                onArchive={onArchive}
                onBlock={onBlock}
                onMarkUnread={onMarkUnread}
                onMarkRead={onMarkRead}
                onDelete={onDeleteChat}
                leadStatus={getLeadStatusForChat(c)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* ── Rodapé com contador da aba ativa ── */}
      {!isLoading && activeCount > 0 && (
        <>
          <Separator className="shrink-0" />
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {activeCount} conversa{activeCount !== 1 ? 's' : ''}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ hasSearch, filter }: { hasSearch: boolean; filter: PrimaryFilter }) {
  const isFiltered = filter !== 'all';
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">
        {hasSearch
          ? 'Nenhuma conversa encontrada'
          : isFiltered
          ? 'Nenhuma conversa neste filtro'
          : 'Nenhuma conversa ainda'}
      </p>
      {!hasSearch && !isFiltered && (
        <p className="text-xs text-muted-foreground mt-1">
          Conecte o WhatsApp para começar
        </p>
      )}
    </div>
  );
}
