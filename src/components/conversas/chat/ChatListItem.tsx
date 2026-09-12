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

export interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
}

export function ChatListItem({ chat, isActive, onClick }: ChatListItemProps) {
  const unread = chat.unread_count ?? 0;
  const lastDirection = chat.ultima_mensagem_direction;
  const lastStatus = chat.ultima_mensagem_type;
  const wasRead = lastDirection === 'outbound' && chat.contato_nome != null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-3 text-left transition-colors',
        isActive ? 'bg-[#f0f2f5]' : 'hover:bg-zinc-50',
      )}
    >
      <ContactAvatar
        phone={chat.contato_phone_normalized}
        name={chat.contato_nome}
        src={chat.contato_avatar}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {chat.pin === 'pinned' ? (
              <Pin className="h-3 w-3 text-zinc-400 flex-shrink-0" />
            ) : null}
            <span
              className={cn(
                'truncate text-sm',
                unread > 0 ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-700',
              )}
            >
              {chat.contato_nome ?? chat.contato_phone_normalized ?? 'Conversa'}
            </span>
          </div>
          <span
            className={cn(
              'text-[11px] flex-shrink-0',
              unread > 0 ? 'text-[#25d366] font-medium' : 'text-zinc-400',
            )}
          >
            {formatChatTimestamp(chat.ultima_mensagem_data)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1 min-w-0 text-xs text-zinc-500">
            {wasRead ? (
              <CheckCheck className="h-3 w-3 text-[#53bdeb] flex-shrink-0" />
            ) : null}
            <span className="truncate">
              {lastStatus && lastStatus !== 'text'
                ? `📎 ${chat.ultima_mensagem ?? lastStatus}`
                : chat.ultima_mensagem ?? 'Sem mensagens ainda'}
            </span>
          </div>
          {unread > 0 ? (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#25d366] text-white text-[11px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
