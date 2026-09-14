/**
 * Item da lista de chats (estilo WhatsApp Web).
 *
 * Avatar colorido por hash, preview truncado, badge de unread,
 * ícone de pin e duplo-check azul quando última mensagem outbound foi lida.
 */

import { CheckCheck, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Chat } from '@/modules/conversas/types';
import { ContactAvatar } from '../shared/ContactAvatar';
import { formatChatTimestamp } from '../shared/format';
import { useLazyContactAvatar } from './useLazyContactAvatar';

export interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
  onTogglePin?: (chat: Chat, e: React.MouseEvent) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPin?: (id: string) => void;
  onUnpin?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
}

import React from 'react';

export const ChatListItem = React.memo(function ChatListItem({ chat, isActive, onClick, onTogglePin }: ChatListItemProps) {
  const unread = chat.unread_count ?? 0;
  const lastDirection = chat.ultima_mensagem_direction;
  const lastStatus = chat.ultima_mensagem_type;
  const wasRead = lastDirection === 'outbound' && chat.contato_nome != null;

  // Carregamento sob demanda da foto de perfil apenas quando entra na tela
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
        'group w-full max-w-full overflow-hidden flex items-center gap-3 px-3 py-3 text-left transition-colors relative',
        isActive ? 'bg-[#f0f2f5]' : 'hover:bg-zinc-50',
      )}
    >
      <ContactAvatar
        phone={chat.contato_phone_normalized}
        name={chat.contato_nome}
        src={avatar}
        size="md"
      />

      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Linha superior: Nome e Timestamp */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            {chat.pin === 'pinned' ? (
              <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
            ) : null}
            <span
              className={cn(
                'truncate text-sm block',
                unread > 0 ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-700',
              )}
            >
              {chat.contato_nome ?? chat.contato_phone_normalized ?? 'Conversa'}
            </span>
          </div>
          <span
            className={cn(
              'text-[11px] flex-shrink-0 whitespace-nowrap ml-auto',
              unread > 0 ? 'text-[#25d366] font-medium' : 'text-zinc-400',
            )}
          >
            {formatChatTimestamp(chat.ultima_mensagem_data)}
          </span>
        </div>

        {/* Linha inferior: Preview e Badge / Ações */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-1 min-w-0 overflow-hidden text-xs text-zinc-500">
            {wasRead ? (
              <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb] flex-shrink-0" />
            ) : null}
            <span className="truncate block">
              {lastStatus && lastStatus !== 'text'
                ? `📎 ${chat.ultima_mensagem ?? lastStatus}`
                : chat.ultima_mensagem ?? 'Sem mensagens ainda'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
            {/* Botão rápido para fixar/desafixar conversa */}
            {onTogglePin ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => onTogglePin(chat, e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onTogglePin(chat, e as any);
                  }
                }}
                className={cn(
                  'p-1 rounded hover:bg-zinc-200 transition-all cursor-pointer',
                  chat.pin === 'pinned'
                    ? 'opacity-100 text-amber-600 hover:text-amber-700'
                    : 'opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-600',
                )}
                title={chat.pin === 'pinned' ? 'Desafixar conversa' : 'Fixar conversa no Lunari (não fixa no celular)'}
              >
                <Pin className={cn('h-3 w-3', chat.pin === 'pinned' ? 'fill-current' : '')} />
              </span>
            ) : null}

            {unread > 0 ? (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#25d366] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
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
    prev.chat.ultima_mensagem_direction === next.chat.ultima_mensagem_direction &&
    prev.chat.ultima_mensagem_type === next.chat.ultima_mensagem_type
  );
});
