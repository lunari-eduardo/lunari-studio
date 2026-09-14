/**
 * Card de conversa para a lista do painel esquerdo.
 *
 * Visual premium: sem verde WhatsApp, sem azul double-check.
 * Indicador de não lida: ponto discreto à esquerda do avatar.
 * Badge de contexto: Lead / Cliente — discreto, monocromático.
 */

import React from 'react';
import { Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnrichedChat } from '@/modules/conversas/types';
import { ContactAvatar } from '../shared/ContactAvatar';
import { formatChatTimestamp } from '../shared/format';
import { useLazyContactAvatar } from './useLazyContactAvatar';

export interface ChatListItemProps {
  chat: EnrichedChat;
  isActive: boolean;
  onClick: () => void;
  onTogglePin?: (chat: EnrichedChat, e: React.MouseEvent) => void;
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
}: ChatListItemProps) {
  const unread = chat.unread_count ?? 0;
  const isUnread = unread > 0;
  const lastType = chat.ultima_mensagem_type;
  const badge = CONTEXT_BADGE[chat.contato_tipo];

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
        'flex items-center gap-2.5 px-3 py-2.5',
        'text-left transition-all',
        isActive
          ? 'bg-zinc-100 dark:bg-zinc-800'
          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
      )}
    >
      {/* Indicador de não lida: ponto à esquerda do avatar */}
      {isUnread && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
      )}

      {/* Avatar */}
      <ContactAvatar
        phone={chat.contato_phone_normalized}
        name={chat.contato_nome}
        src={avatar}
        size="md"
      />

      {/* Conteúdo: nome + preview */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Linha 1: Nome + badge contexto + timestamp */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            {chat.pin === 'pinned' && (
              <Pin className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
            <span
              className={cn(
                'truncate text-sm block',
                isUnread ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'font-medium text-zinc-700 dark:text-zinc-300',
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
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex-shrink-0 whitespace-nowrap">
            {formatChatTimestamp(chat.ultima_mensagem_data)}
          </span>
        </div>

        {/* Linha 2: Preview + ações */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span
            className={cn(
              'truncate text-xs block',
              isUnread ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500',
            )}
          >
            {lastType && lastType !== 'text'
              ? `📎 ${chat.ultima_mensagem ?? lastType}`
              : chat.ultima_mensagem ?? 'Sem mensagens ainda'}
          </span>

          {/* Ações visíveis no hover */}
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Pin rápido */}
            {onTogglePin && (
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
                  chat.pin === 'pinned'
                    ? 'text-amber-500'
                    : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300',
                )}
                title={chat.pin === 'pinned' ? 'Desafixar' : 'Fixar no topo'}
              >
                <Pin className={cn('h-3 w-3', chat.pin === 'pinned' ? 'fill-current' : '')} />
              </span>
            )}

            {/* Badge de não lida (alternativa ao ponto) */}
            {isUnread && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] font-semibold">
                {unread > 99 ? '99+' : unread}
              </span>
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
