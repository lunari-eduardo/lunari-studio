/**
 * Sidebar esquerda do módulo Conversas.
 *
 * Layout: barra de instância → header com busca → filtros primários & etapas →
 * lista de chats.
 *
 * Filtros suportados:
 * - Todas (conversas ativas)
 * - Não lidas (mensagens pendentes)
 * - Dropdown com:
 *   - CRM & Vínculos: Clientes, Todos os Leads, Outros Contatos
 *   - Etapas do Funil (Leads): cada status do CRM com cor oficial e contagem dinâmica
 *   - Status & Organização: Fixadas, Arquivadas
 */

import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  X,
  MessageSquare,
  Users,
  UserCheck,
  Pin,
  Archive,
  SlidersHorizontal,
  ChevronDown,
  Check,
  RotateCcw,
  User,
  MessageSquarePlus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ChatListItem } from './ChatListItem';
import { ChatListSkeleton } from './skeletons';
import { InstanceStatusBar } from '../shared/InstanceStatusBar';
import { ContactAvatar } from '../shared/ContactAvatar';
import { formatPhone } from '../shared/format';
import { useConversasContatos } from '@/hooks/useConversasContatos';
import type { Chat, EnrichedChat, InstanciaStatus, Contato } from '@/modules/conversas/types';
import { useChatLeadStatuses } from '@/hooks/useChatLeadStatuses';
import { cn } from '@/lib/utils';

export type PrimaryFilter = 'all' | 'unread' | 'cliente' | 'lead';

export type SidebarFilter =
  | { type: 'all' }
  | { type: 'unread' }
  | { type: 'cliente' }
  | { type: 'lead' }
  | { type: 'lead_stage'; stageKey: string; label: string; color?: string }
  | { type: 'unknown' }
  | { type: 'pinned' }
  | { type: 'archived' };

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
  /** Contadores dinâmicos para os filtros primários (compatibilidade retroativa). */
  chatCounts: ChatCounts;
  onArchive?: (chat: EnrichedChat) => void;
  onBlock?: (chat: EnrichedChat) => void;
  onMarkUnread?: (chat: EnrichedChat) => void;
  onMarkRead?: (chat: EnrichedChat) => void;
  onDeleteChat?: (chat: EnrichedChat) => void;
  onStartChatWithContact?: (contato: Contato) => Promise<void> | void;
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
  onDisconnect,
  onSyncChats,
  isSyncingChats,
  studioDisplayName,
  onTogglePin,
  isPinLimitReached = false,
  chatCounts: _legacyCounts,
  onArchive,
  onBlock,
  onMarkUnread,
  onMarkRead,
  onDeleteChat,
  onStartChatWithContact,
}: ChatListSidebarProps) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<SidebarFilter>({ type: 'all' });
  const { getLeadStatusForChat, leadStatuses = [], leadStatusMap = {} } = useChatLeadStatuses(chats);
  const { contatos } = useConversasContatos();

  // ─── Contadores dinâmicos por categoria e etapas ──────────────────────────────
  const counts = useMemo(() => {
    let all = 0;
    let unread = 0;
    let cliente = 0;
    let lead = 0;
    let unknown = 0;
    let pinned = 0;
    let archived = 0;
    const stageCounts: Record<string, number> = {};

    for (const c of chats) {
      if (c.status === 'archived') {
        archived++;
        continue;
      }
      if (c.status !== 'active') continue;

      all++;
      if ((c.unread_count ?? 0) > 0) unread++;
      if (c.contato_tipo === 'cliente') cliente++;
      else if (c.contato_tipo === 'lead') lead++;
      else unknown++;

      if (c.pin === 'pinned') pinned++;

      if (c.lead_id) {
        const stageKey = leadStatusMap[c.lead_id];
        if (stageKey) {
          stageCounts[stageKey] = (stageCounts[stageKey] ?? 0) + 1;
        }
      }
    }

    return {
      all,
      unread,
      cliente,
      lead,
      unknown,
      pinned,
      archived,
      stageCounts,
    };
  }, [chats, leadStatusMap]);

  // ─── Filtro combinado: filtro ativo + busca textual ───────────────────────────
  const filtered = useMemo(() => {
    let base: EnrichedChat[] = [];

    if (activeFilter.type === 'archived') {
      base = chats.filter(c => c.status === 'archived');
    } else {
      base = chats.filter(c => c.status === 'active');

      if (activeFilter.type === 'unread') {
        base = base.filter(c => (c.unread_count ?? 0) > 0);
      } else if (activeFilter.type === 'cliente') {
        base = base.filter(c => c.contato_tipo === 'cliente');
      } else if (activeFilter.type === 'lead') {
        base = base.filter(c => c.contato_tipo === 'lead');
      } else if (activeFilter.type === 'lead_stage') {
        base = base.filter(c => c.lead_id && leadStatusMap[c.lead_id] === activeFilter.stageKey);
      } else if (activeFilter.type === 'unknown') {
        base = base.filter(c => c.contato_tipo !== 'cliente' && c.contato_tipo !== 'lead');
      } else if (activeFilter.type === 'pinned') {
        base = base.filter(c => c.pin === 'pinned');
      }
    }

    // Busca por nome, telefone ou mensagem
    if (!search.trim()) return base;
    const terms = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return base.filter(c => {
      const target = `${(c as any).clientes?.nome ?? ''} ${c.contato_nome ?? ''} ${(c as any).conversas_contatos?.nome ?? ''} ${c.contato_phone_normalized ?? ''} ${c.ultima_mensagem ?? ''}`.toLowerCase();
      return terms.every(term => target.includes(term));
    });
  }, [chats, activeFilter, leadStatusMap, search]);

  // ─── Contatos da agenda correspondentes à busca textual ───────────────────
  const matchedContacts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    const terms = q.split(/\s+/).filter(Boolean);

    // Evita duplicar contatos que já estejam na lista de conversas filtradas
    const existingPhones = new Set(filtered.map(c => c.contato_phone_normalized));

    return contatos.filter(ct => {
      if (existingPhones.has(ct.phone_normalized)) return false;
      const target = `${ct.nome ?? ''} ${ct.phone_normalized ?? ''} ${ct.phone_raw ?? ''}`.toLowerCase();
      return terms.every(term => target.includes(term));
    });
  }, [contatos, filtered, search]);

  // ─── Ordenação: fixadas primeiro (exceto em arquivadas), depois por data ─────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (activeFilter.type !== 'archived') {
        if (a.pin === 'pinned' && b.pin !== 'pinned') return -1;
        if (a.pin !== 'pinned' && b.pin === 'pinned') return 1;
      }
      const aDate = a.ultima_mensagem_data ?? '';
      const bDate = b.ultima_mensagem_data ?? '';
      if (aDate !== bDate) return bDate.localeCompare(aDate);
      return a.id.localeCompare(b.id);
    });
  }, [filtered, activeFilter.type]);

  const isCustomFilterActive = activeFilter.type !== 'all' && activeFilter.type !== 'unread';

  const activeFilterLabel = useMemo(() => {
    switch (activeFilter.type) {
      case 'cliente':
        return 'Clientes';
      case 'lead':
        return 'Leads';
      case 'lead_stage':
        return activeFilter.label;
      case 'unknown':
        return 'Outros Contatos';
      case 'pinned':
        return 'Fixadas';
      case 'archived':
        return 'Arquivadas';
      default:
        return '';
    }
  }, [activeFilter]);

  const footerLabel = useMemo(() => {
    const total = filtered.length;
    const plural = total !== 1;
    switch (activeFilter.type) {
      case 'all':
        return `${total} conversa${plural ? 's' : ''}`;
      case 'unread':
        return `${total} não lida${plural ? 's' : ''}`;
      case 'cliente':
        return `${total} cliente${plural ? 's' : ''}`;
      case 'lead':
        return `${total} lead${plural ? 's' : ''}`;
      case 'lead_stage':
        return `${total} conversa${plural ? 's' : ''} em "${activeFilter.label}"`;
      case 'unknown':
        return `${total} contato${plural ? 's' : ''} avulso${plural ? 's' : ''}`;
      case 'pinned':
        return `${total} conversa${plural ? 's' : ''} fixada${plural ? 's' : ''}`;
      case 'archived':
        return `${total} conversa${plural ? 's' : ''} arquivada${plural ? 's' : ''}`;
    }
  }, [filtered.length, activeFilter]);

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

      {/* ── Filtros rápidos + Dropdown de Filtros Avançados e Etapas do CRM ── */}
      <div className="px-3 pb-2 flex items-center gap-1.5 min-w-0">
        {/* Aba: Todas */}
        <button
          type="button"
          onClick={() => setActiveFilter({ type: 'all' })}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
            activeFilter.type === 'all'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border border-zinc-900 dark:border-zinc-100 shadow-xs'
              : 'bg-zinc-100/70 dark:bg-zinc-800/70 text-muted-foreground border border-transparent hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800',
          )}
        >
          Todas
          {counts.all > 0 && (
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold',
                activeFilter.type === 'all'
                  ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400',
              )}
            >
              {counts.all > 99 ? '99+' : counts.all}
            </span>
          )}
        </button>

        {/* Aba: Não lidas */}
        <button
          type="button"
          onClick={() => setActiveFilter({ type: 'unread' })}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
            activeFilter.type === 'unread'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border border-zinc-900 dark:border-zinc-100 shadow-xs'
              : 'bg-zinc-100/70 dark:bg-zinc-800/70 text-muted-foreground border border-transparent hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800',
          )}
        >
          Não lidas
          {counts.unread > 0 && (
            <span
              className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 rounded-full text-[10px] font-bold',
                activeFilter.type === 'unread'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
              )}
            >
              {counts.unread}
            </span>
          )}
        </button>

        {/* Menu Dropdown de Filtros & Etapas */}
        <DropdownMenu>
          {isCustomFilterActive ? (
            <div className="inline-flex items-center rounded-full border border-[#D4AF37]/30 dark:border-[#D4AF37]/20 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/[0.05] text-[#A87E43] dark:text-[#D4AF37] text-xs font-medium pl-2.5 pr-1 py-1 gap-1.5 shadow-xs transition-all max-w-[170px] shrink-0 ml-auto">
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity"
                  title="Clique para alterar o filtro"
                >
                  {activeFilter.type === 'lead_stage' && activeFilter.color ? (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: activeFilter.color }}
                    />
                  ) : activeFilter.type === 'cliente' ? (
                    <UserCheck className="h-3 w-3 text-[#A87E43] dark:text-[#D4AF37] shrink-0" />
                  ) : activeFilter.type === 'lead' ? (
                    <Users className="h-3 w-3 text-[#A87E43] dark:text-[#D4AF37] shrink-0" />
                  ) : activeFilter.type === 'pinned' ? (
                    <Pin className="h-3 w-3 text-[#A87E43] dark:text-[#D4AF37] shrink-0" />
                  ) : activeFilter.type === 'archived' ? (
                    <Archive className="h-3 w-3 text-zinc-500 shrink-0" />
                  ) : (
                    <SlidersHorizontal className="h-3 w-3 text-[#A87E43] shrink-0" />
                  )}

                  <span className="truncate text-xs font-semibold">
                    {activeFilterLabel}
                  </span>
                  <ChevronDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setActiveFilter({ type: 'all' });
                }}
                className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[#A87E43] dark:text-[#D4AF37] transition-colors shrink-0"
                title="Limpar filtro e voltar para Todas"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 bg-zinc-100/70 dark:bg-zinc-800/70 text-muted-foreground border border-transparent hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 ml-auto"
                title="Filtrar por etapas de leads, clientes e mais"
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span>Filtros</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
          )}

          <DropdownMenuContent
            align="end"
            className="w-64 max-h-[420px] overflow-y-auto p-1.5 shadow-xl rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md"
          >
            {/* Seção 1: CRM & Vínculos */}
            <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              CRM & Vínculos
            </DropdownMenuLabel>

            <DropdownMenuItem
              onClick={() => setActiveFilter({ type: 'cliente' })}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
                activeFilter.type === 'cliente' && 'bg-accent font-semibold text-accent-foreground',
              )}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5 text-[#A87E43] dark:text-[#D4AF37]" />
                <span>Clientes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground font-medium">
                  {counts.cliente}
                </span>
                {activeFilter.type === 'cliente' && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setActiveFilter({ type: 'lead' })}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
                activeFilter.type === 'lead' && 'bg-accent font-semibold text-accent-foreground',
              )}
            >
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                <span>Todos os Leads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground font-medium">
                  {counts.lead}
                </span>
                {activeFilter.type === 'lead' && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
              </div>
            </DropdownMenuItem>

            {counts.unknown > 0 && (
              <DropdownMenuItem
                onClick={() => setActiveFilter({ type: 'unknown' })}
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
                  activeFilter.type === 'unknown' && 'bg-accent font-semibold text-accent-foreground',
                )}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Outros Contatos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground font-medium">
                    {counts.unknown}
                  </span>
                  {activeFilter.type === 'unknown' && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
                </div>
              </DropdownMenuItem>
            )}

            {/* Seção 2: Etapas de Leads */}
            {leadStatuses.length > 0 && (
              <>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                  Etapas do Lead (Funil)
                </DropdownMenuLabel>

                {leadStatuses.map(stage => {
                  const stageCount = counts.stageCounts[stage.key] ?? 0;
                  const isSelected = activeFilter.type === 'lead_stage' && activeFilter.stageKey === stage.key;

                  return (
                    <DropdownMenuItem
                      key={stage.key}
                      onClick={() =>
                        setActiveFilter({
                          type: 'lead_stage',
                          stageKey: stage.key,
                          label: stage.name,
                          color: stage.color,
                        })
                      }
                      className={cn(
                        'flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
                        isSelected && 'bg-accent font-semibold text-accent-foreground',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: stage.color || '#94a3b8' }}
                        />
                        <span className="truncate">{stage.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                            stageCount > 0
                              ? 'bg-zinc-200 dark:bg-zinc-700 text-foreground'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-muted-foreground/60',
                          )}
                        >
                          {stageCount}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}

            {/* Seção 3: Organização & Status */}
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
              Status & Organização
            </DropdownMenuLabel>

            <DropdownMenuItem
              onClick={() => setActiveFilter({ type: 'pinned' })}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
                activeFilter.type === 'pinned' && 'bg-accent font-semibold text-accent-foreground',
              )}
            >
              <div className="flex items-center gap-2">
                <Pin className="h-3.5 w-3.5 text-[#D4AF37] fill-[#D4AF37]/80" />
                <span>Fixadas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground font-medium">
                  {counts.pinned}
                </span>
                {activeFilter.type === 'pinned' && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setActiveFilter({ type: 'archived' })}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors',
                activeFilter.type === 'archived' && 'bg-accent font-semibold text-accent-foreground',
              )}
            >
              <div className="flex items-center gap-2">
                <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Arquivadas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-muted-foreground font-medium">
                  {counts.archived}
                </span>
                {activeFilter.type === 'archived' && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
              </div>
            </DropdownMenuItem>

            {/* Opção para Redefinir se houver filtro ativo */}
            {activeFilter.type !== 'all' && (
              <>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={() => setActiveFilter({ type: 'all' })}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Redefinir para "Todas"</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator className="shrink-0" />

      {/* ── Lista de conversas ── */}
      <ScrollArea className="flex-1 w-full overflow-hidden [&>div>div]:!block">
        {isLoading ? (
          <ChatListSkeleton />
        ) : sorted.length === 0 && matchedContacts.length === 0 ? (
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

            {search.trim() && matchedContacts.length > 0 && (
              <div className={cn("pt-2", sorted.length > 0 && "mt-2 border-t border-border/50")}>
                <div className="px-4 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  <span>Contatos da Agenda ({matchedContacts.length})</span>
                </div>
                {matchedContacts.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (onStartChatWithContact) {
                        void onStartChatWithContact(c);
                        setSearch('');
                      }
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-2.5 text-left hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors group"
                  >
                    <ContactAvatar name={c.nome} src={c.avatar_url} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {c.nome || formatPhone(c.phone_normalized)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {formatPhone(c.phone_normalized)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground/60 group-hover:text-primary group-hover:opacity-100 flex items-center gap-1 transition-all">
                      <span className="hidden group-hover:inline text-[11px] font-medium">Conversar</span>
                      <MessageSquarePlus className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* ── Rodapé com contador contextual ── */}
      {!isLoading && filtered.length > 0 && (
        <>
          <Separator className="shrink-0" />
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              {footerLabel}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ hasSearch, filter }: { hasSearch: boolean; filter: SidebarFilter }) {
  const isFiltered = filter.type !== 'all';

  const getFilterMessage = () => {
    switch (filter.type) {
      case 'unread':
        return 'Nenhuma mensagem não lida';
      case 'cliente':
        return 'Nenhum cliente com conversa ativa';
      case 'lead':
        return 'Nenhum lead com conversa ativa';
      case 'lead_stage':
        return `Nenhuma conversa na etapa "${filter.label}"`;
      case 'unknown':
        return 'Nenhum contato avulso encontrado';
      case 'pinned':
        return 'Nenhuma conversa fixada';
      case 'archived':
        return 'Nenhuma conversa arquivada';
      default:
        return 'Nenhuma conversa neste filtro';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <MessageSquare className="h-10 w-10 text-muted-foreground/60 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">
        {hasSearch ? 'Nenhuma conversa encontrada' : isFiltered ? getFilterMessage() : 'Nenhuma conversa ainda'}
      </p>
      {!hasSearch && !isFiltered && (
        <p className="text-xs text-muted-foreground mt-1">
          Conecte o WhatsApp para começar
        </p>
      )}
    </div>
  );
}
