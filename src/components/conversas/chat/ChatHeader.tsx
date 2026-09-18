/**
 * Header do chat panel — avatar, nome, ações (voltar, telefone, vídeo, notas, mais).
 */

import { ArrowLeft, MoreVertical, StickyNote, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContactAvatar } from '../shared/ContactAvatar';
import type { Chat } from '@/modules/conversas/types';

export interface ChatHeaderProps {
  chat: Chat;
  onBack?: () => void;
  onToggleNotes: () => void;
  onArchive?: () => void;
  onBlock?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onMarkUnread?: () => void;
  notesOpen: boolean;
}

export function ChatHeader({
  chat,
  onBack,
  onToggleNotes,
  onArchive,
  onBlock,
  onPin,
  onDelete,
  onMarkUnread,
  notesOpen,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-[#F8F8F8] dark:bg-[#181818] border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : null}

      <ContactAvatar
        phone={chat.contato_phone_normalized}
        name={chat.contato_nome}
        src={chat.contato_avatar}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#1C1C1C] dark:text-[#EFEFEF] truncate">
          {chat.contato_nome ?? chat.contato_phone_normalized ?? 'Conversa'}
        </div>
        <div className="text-[11px] text-zinc-500 dark:text-zinc-500 truncate h-[16px]">
          {chat.contato_phone_normalized}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Notas"
          onClick={onToggleNotes}
          className={cn(
            'h-9 w-9 flex items-center justify-center rounded-full transition-colors',
            notesOpen
              ? 'text-[#C9A87C] hover:bg-[#C9A87C]/10'
              : 'text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
          )}
        >
          {notesOpen ? <X className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Mais opções"
              className="h-9 w-9 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="dark:bg-[#1A1A1A] dark:border-[rgba(255,255,255,0.08)]">
            <DropdownMenuItem onSelect={onPin} className="dark:hover:bg-white/[0.07]">
              {chat.pin === 'pinned' ? 'Desafixar conversa' : 'Fixar conversa'}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onArchive} className="dark:hover:bg-white/[0.07]">
              {chat.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
            </DropdownMenuItem>
            {chat.unread_count === 0 && onMarkUnread ? (
              <DropdownMenuItem onSelect={onMarkUnread} className="dark:hover:bg-white/[0.07]">
                Marcar como não lido
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={onBlock} className="dark:hover:bg-white/[0.07]">
              {chat.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} className="text-red-600 dark:text-red-400 dark:hover:bg-white/[0.07]">
              Excluir conversa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
