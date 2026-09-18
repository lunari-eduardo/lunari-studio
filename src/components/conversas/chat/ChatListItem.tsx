/**
 * Card de conversa para a lista do painel esquerdo.
 *
 * Visual premium: sem verde WhatsApp, sem azul double-check.
 * Indicador de não lida: ponto discreto à esquerda do avatar.
 * Badge de contexto: Lead / Cliente — discreto, monocromático.
 * Menu de ações via "..." no hover.
 */

import React from 'react';
import { Pin, MoreHorizontal, Archive, ArchiveRestore, Ban, Trash2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnrichedChat } from '@/modules/conversas/types';
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
  /** Fixar / desafixar */
  onTogglePin?: (chat: EnrichedChat, e?: React.MouseEvent | React.KeyboardEvent) => void;
  isPinLimitReached?: boolean;
  /** Arquivar / desarquivar */
  onArchive?: (chat: EnrichedChat) => void;
  /** Bloquear / desbloquear */
  onBlock?: (chat: EnrichedChat) => void;
  /** Marcar como não lida */
  onMarkUnread?: (chat: EnrichedChat) => void;
  /** Excluir conversa */
  onDelete?: (chat: EnrichedChat) => void;
}

const CONTEXT_BADGE: Record<EnrichedChat['contato_tipo'], { label: string; className: string } | null> = {
  lead: { label: 'Lead', className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  cliente: { label: 'Cliente', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800' },
  unknown: null,
};

export const ChatListItem = React.memo(function ChatListItem({
  chat,
  isActive,
  onClick,
  onTogglePin,
  isPinLimitReached = false,
  onArchive,
  onBlock,
  onMarkUnread,
  onDelete,
}: ChatListItemProps) {
  const unread = chat.unread_count ?? 0;
  const isUnread = unread > 0;
  const isArchived = chat.status === 'archived';
  const isBlocked = chat.status === 'blocked';
  const lastType = chat.ultima_mensagem_type;
  const badge = CONTEXT_BADGE[chat.contato_tipo];
  const isPinned = chat.pin === 'pinned';
  const canPinThisChat = isPinned || !isPinLimitReached;

  const hasAnyAction = onTogglePin || onArchive || onBlock || onMarkUnread || onDelete;

  // Lazy avatar via IntersectionObserver
  const { avatar, elementRef } = useLazyContactAvatar(
    chat.instance_id,
    chat.contato_phone_normalized,
    chat.id,
    chat.contato_avatar,
  );

  return (
    <button
      ref={elementRef}
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full max-w-full overflow-hidden',
        // pl-5 reserva espaço à esquerda para o marcador lateral (não invade o avatar).
        // Em ativo, a borda esquerda dourada vira o marcador de seleção.
        'flex items-center gap-3.5 pr-3 py-3',
        isActive
          ? 'pl-6 bg-amber-50/60 dark:bg-amber-900/15 border-l-2 border-amber-400/70 dark:border-amber-500/60'
          : isUnread
          ? 'pl-5 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60'
          : 'pl-5 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60',
        'text-left transition-all',
      )}
    >
      {/* Marcador lateral de não lida: barra vertical fina na borda esquerda,
          separada do avatar, sempre visível. Não representa presença/online.
          Coexiste com a borda dourada quando o item também está ativo. */}
      {isUnread && (
        <span
          aria-hidden
          className="absolute left-1.5 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-emerald-500/85 dark:bg-emerald-400/90"
        />
      )}

      {/* Avatar — permanece limpo, sem nenhum indicador sobreposto */}
      <ContactAvatar
        phone={chat.contato_phone_normalized}
        name={chat.contato_nome}
        src={avatar}
        size="lg"
      />

      {/* Conteúdo: nome + preview */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Linha 1: Nome + badge contexto + timestamp */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            {isPinned && (
              <Pin className="h-3 w-3 text-amber-500 fill-amber-400/80 flex-shrink-0" />
            )}
            <span
              className={cn(
                'truncate text-sm block leading-tight',
                isUnread ? 'font-semibold text-zinc-800 dark:text-zinc-100' : 'font-medium text-zinc-700 dark:text-zinc-200',
              )}
            >
              {chat.contato_nome ?? chat.contato_phone_normalized ?? 'Conversa'}
            </span>
            {badge && (
              <span
                className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0',
                  badge.className,
                )}
              >
                {badge.label}
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex-shrink-0 whitespace-nowrap font-medium">
            {formatChatTimestamp(chat.ultima_mensagem_data)}
          </span>
        </div>

        {/* Linha 2: Preview + ações */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span
            className={cn(
              'truncate text-[13px] leading-tight block',
              isUnread ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500',
            )}
          >
            {lastType && lastType !== 'text'
              ? `📎 ${chat.ultima_mensagem ?? lastType}`
              : chat.ultima_mensagem ?? 'Sem mensagens ainda'}
          </span>

          {/* Ações: badge de unread + menu */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Badge de não lida — sempre visível */}
            {isUnread && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-semibold mr-0.5">
                {unread > 99 ? '99+' : unread}
              </span>
            )}

            {/* Pin rápido (alternativa ao menu) */}
            {onTogglePin && !hasAnyAction && canPinThisChat && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onTogglePin(chat, e); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onTogglePin(chat, e as React.KeyboardEvent);
                  }
                }}
                className={cn(
                  'p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer',
                  isPinned
                    ? 'text-amber-500'
                    : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300',
                )}
                title={isPinned ? 'Desafixar' : 'Fixar no topo'}
              >
                <Pin className={cn('h-3 w-3', isPinned ? 'fill-current' : '')} />
              </span>
            )}

            {/* Menu de ações */}
            {hasAnyAction && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                    title="Ações"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
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
                  {onMarkUnread && (
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onMarkUnread(chat); }}
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
    </button>
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
    prev.chat.ultima_mensagem_type === next.chat.ultima_mensagem_type
  );
});
