import React from 'react';
import { Pin, MoreHorizontal, Archive, ArchiveRestore, Ban, Trash2, Mail, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnrichedChat, Etiqueta } from '@/modules/conversas/types';
import type { LeadStatusInfo } from '@/hooks/useChatLeadStatuses';
import { ContactAvatar } from '../shared/ContactAvatar';
import { formatChatTimestamp } from '../shared/format';
import { useLazyContactAvatar } from './useLazyContactAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ChatListItemProps {
  chat: EnrichedChat;
  isActive: boolean;
  onClick: () => void;
  onTogglePin?: (chat: EnrichedChat, e?: React.MouseEvent | React.KeyboardEvent) => void;
  isPinLimitReached?: boolean;
  onArchive?: (chat: EnrichedChat) => void;
  onBlock?: (chat: EnrichedChat) => void;
  onMarkUnread?: (chat: EnrichedChat) => void;
  onMarkRead?: (chat: EnrichedChat) => void;
  onDelete?: (chat: EnrichedChat) => void;
  onOpenAssignLabels?: () => void;
  leadStatus?: LeadStatusInfo | null;
  todasEtiquetas?: Etiqueta[];
}

export const ChatListItem = React.memo(function ChatListItem({
  chat,
  isActive,
  onClick,
  onTogglePin,
  isPinLimitReached = false,
  onArchive,
  onBlock,
  onMarkUnread,
  onMarkRead,
  onDelete,
  onOpenAssignLabels,
  leadStatus,
  todasEtiquetas = [],
}: ChatListItemProps) {
  const unread = chat.unread_count ?? 0;
  const isUnread = unread > 0;
  const isArchived = chat.status === 'archived';
  const isBlocked = chat.status === 'blocked';
  const lastType = chat.ultima_mensagem_type;
  const activeEtiquetas = (chat.etiquetas || []).map(id => todasEtiquetas.find(e => e.id === id)).filter(Boolean) as Etiqueta[];
  const isPinned = chat.pin === 'pinned';
  const canPinThisChat = isPinned || !isPinLimitReached;

  const hasAnyAction = onTogglePin || onArchive || onBlock || onMarkUnread || onMarkRead || onDelete;

  const { avatar, elementRef } = useLazyContactAvatar(
    chat.contato_avatar ?? (chat as any).conversas_contatos?.avatar_url,
  );

  return (
    <div
      className={cn(
        'group relative w-full max-w-full overflow-hidden',
        'flex items-center gap-3.5 pr-3 py-3',
        isActive
          ? 'pl-6 bg-[#D4AF37]/5 dark:bg-[#D4AF37]/[0.02] border-l-2 border-[#D4AF37]/60 dark:border-[#D4AF37]/50'
          : isUnread
          ? 'pl-5 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60'
          : 'pl-5 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60',
        'text-left transition-all',
      )}
    >
      {/* Background Button to avoid click bubbling conflicts with DropdownMenu */}
      <button ref={elementRef} type="button" onClick={onClick} className="absolute inset-0 z-0 w-full h-full cursor-pointer focus:outline-none" aria-label="Abrir conversa" />
      
      {/* Visual Content - Wrapped in pointer-events-none so background button receives clicks */}
      <div className="relative z-10 flex w-full pointer-events-none items-center gap-3.5">
        <ContactAvatar
          phone={chat.contato_phone_normalized}
          name={(chat as any).clientes?.nome ?? chat.contato_nome ?? (chat as any).conversas_contatos?.nome}
          src={avatar ?? (chat as any).conversas_contatos?.avatar_url}
          size="lg"
        />

        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Row 1: Name and Date */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {isPinned && (
                <Pin className="h-3 w-3 text-[#D4AF37] fill-[#D4AF37]/80 flex-shrink-0" />
              )}
              <span
                className={cn(
                  'truncate text-[13.5px] block leading-tight',
                  isUnread ? 'font-semibold text-zinc-800 dark:text-zinc-100' : 'font-medium text-zinc-700 dark:text-zinc-200',
                )}
              >
                {(chat as any).clientes?.nome ?? chat.contato_nome ?? (chat as any).conversas_contatos?.nome ?? chat.contato_phone_normalized ?? 'Conversa'}
              </span>
            </div>

            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex-shrink-0 whitespace-nowrap font-medium">
              {formatChatTimestamp(chat.ultima_mensagem_data)}
            </span>
          </div>

          {/* Row 2: Tags */}
          {(leadStatus || activeEtiquetas.length > 0) && (
            <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
              {leadStatus && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                >
                  {leadStatus.color ? (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: leadStatus.color }}
                    />
                  ) : (
                    <div className="w-3 h-3 flex items-center justify-center flex-shrink-0">
                      {chat.contato_tipo === 'cliente' ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      )}
                    </div>
                  )}
                  <span className="truncate max-w-[90px]">{leadStatus.label}</span>
                </span>
              )}

              {activeEtiquetas.length > 0 && (
                <div className="flex items-center gap-1 overflow-hidden">
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
                    style={{
                      backgroundColor: `${activeEtiquetas[0].cor}20`,
                      color: activeEtiquetas[0].cor,
                    }}
                  >
                    <span className="truncate max-w-[80px]">{activeEtiquetas[0].nome}</span>
                  </span>
                  {activeEtiquetas.length > 1 && (
                    <span className="inline-flex items-center justify-center h-[18px] px-1 rounded bg-zinc-100 dark:bg-zinc-800/60 text-[9px] font-medium text-zinc-500 flex-shrink-0">
                      +{activeEtiquetas.length - 1}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Row 3: Message and Actions */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <span
              className={cn(
                'truncate text-[13px] leading-tight block',
                isUnread ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500',
              )}
            >
              {lastType && lastType !== 'text'
                ? `📄 ${chat.ultima_mensagem ?? lastType}`
                : chat.ultima_mensagem ?? 'Sem mensagens ainda'}
            </span>

            {/* Actions Menu - Wrapped in pointer-events-auto to receive clicks properly */}
            <div className="flex items-center gap-0.5 flex-shrink-0 pointer-events-auto">
              {isUnread && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-rose-600/90 dark:bg-rose-500/90 text-white text-[10px] font-semibold mr-0.5 shadow-sm">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}

              {onTogglePin && !hasAnyAction && canPinThisChat && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onTogglePin(chat); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onTogglePin(chat); } }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  title="Fixar conversa"
                >
                  <Pin className="h-3 w-3" />
                </span>
              )}

              {hasAnyAction && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                      className="p-1 rounded opacity-0 transition-opacity flex-shrink-0 cursor-pointer group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                      title="Ações"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {onOpenAssignLabels && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setTimeout(() => onOpenAssignLabels(), 0); }}>
                        <Tag className="h-4 w-4 mr-2" />
                        Etiquetar
                      </DropdownMenuItem>
                    )}
                    {onTogglePin && (
                      <DropdownMenuItem
                        disabled={!canPinThisChat}
                        onClick={(e) => {
                          if (!canPinThisChat) return;
                          e.stopPropagation();
                          onTogglePin(chat);
                        }}
                        className={cn(!canPinThisChat && 'opacity-50 cursor-not-allowed')}
                      >
                        <Pin className="h-4 w-4 mr-2" />
                        {isPinned
                          ? 'Desafixar'
                          : isPinLimitReached
                          ? 'Fixar (Limite de 5 atingido)'
                          : 'Fixar no topo'}
                      </DropdownMenuItem>
                    )}
                    {(onMarkUnread || onMarkRead) && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isUnread && onMarkRead) {
                            onMarkRead(chat);
                          } else if (!isUnread && onMarkUnread) {
                            onMarkUnread(chat);
                          }
                        }}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {isUnread ? 'Marcar como lida' : 'Marcar como não lida'}
                      </DropdownMenuItem>
                    )}
                    {onArchive && (
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); onArchive(chat); }}
                      >
                        {isArchived
                          ? <ArchiveRestore className="h-4 w-4 mr-2" />
                          : <Archive className="h-4 w-4 mr-2" />}
                        {isArchived ? 'Desarquivar' : 'Arquivar'}
                      </DropdownMenuItem>
                    )}
                    {onBlock && (
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); onBlock(chat); }}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        {isBlocked ? 'Desbloquear' : 'Bloquear'}
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); onDelete(chat); }}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir conversa
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.isActive === next.isActive &&
    prev.chat.id === next.chat.id &&
    prev.chat.ultima_mensagem_data === next.chat.ultima_mensagem_data &&
    prev.chat.ultima_mensagem === next.chat.ultima_mensagem &&
    prev.chat.unread_count === next.chat.unread_count &&
    prev.chat.pin === next.chat.pin &&
    prev.chat.status === next.chat.status &&
    prev.chat.contato_nome === next.chat.contato_nome &&
    prev.chat.contato_avatar === next.chat.contato_avatar &&
    prev.chat.contato_tipo === next.chat.contato_tipo &&
    prev.chat.ultima_mensagem_direction === next.chat.ultima_mensagem_direction &&
    prev.chat.ultima_mensagem_type === next.chat.ultima_mensagem_type &&
    prev.leadStatus?.key === next.leadStatus?.key && JSON.stringify(prev.chat.etiquetas) === JSON.stringify(next.chat.etiquetas)
  );
});
