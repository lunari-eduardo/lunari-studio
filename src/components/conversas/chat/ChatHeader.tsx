/**
 * Header do chat panel — avatar, nome, ações (voltar, telefone, vídeo, notas, mais).
 */

import { ArrowLeft, MoreVertical, Phone, StickyNote, Video, X } from 'lucide-react';
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
  notesOpen,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-[#f0f2f5] border-b border-zinc-200">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-200"
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
        <div className="text-sm font-medium text-zinc-900 truncate">
          {chat.contato_nome ?? chat.contato_phone_normalized ?? 'Conversa'}
        </div>
        <div className="text-[11px] text-zinc-500 truncate">
          {chat.contato_phone_normalized}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Ligar"
          className="h-9 w-9 hidden md:flex items-center justify-center rounded-full hover:bg-zinc-200 text-zinc-600"
        >
          <Phone className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Vídeo"
          className="h-9 w-9 hidden md:flex items-center justify-center rounded-full hover:bg-zinc-200 text-zinc-600"
        >
          <Video className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={notesOpen ? 'Fechar notas' : 'Abrir notas'}
          onClick={onToggleNotes}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-200 text-zinc-600"
        >
          {notesOpen ? <X className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Mais opções"
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-200 text-zinc-600"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onPin}>
              {chat.pin === 'pinned' ? 'Desafixar conversa' : 'Fixar conversa'}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onArchive}>
              {chat.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onBlock}>
              {chat.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} className="text-red-600">
              Excluir conversa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
