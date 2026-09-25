/**
 * Header do chat panel — avatar, nome, ações (voltar, telefone, vídeo, notas, mais).
 */

import { ArrowLeft, MoreVertical, Sparkles, StickyNote, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContactAvatar } from '../shared/ContactAvatar';
import type { Chat, EnrichedChat } from '@/modules/conversas/types';

export interface ChatHeaderProps {
  chat: Chat | EnrichedChat;
  onBack?: () => void;
  onToggleTemplates?: () => void;
  onToggleContext?: () => void;
  onToggleNotes: () => void;
  onArchive?: () => void;
  onBlock?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onMarkUnread?: () => void;
  templatesOpen?: boolean;
  contextOpen?: boolean;
  notesOpen: boolean;
}

export function ChatHeader({
  chat,
  onBack,
  onToggleTemplates,
  onToggleContext,
  onToggleNotes,
  onArchive,
  onBlock,
  onPin,
  onDelete,
  onMarkUnread,
  templatesOpen,
  contextOpen,
  notesOpen,
}: ChatHeaderProps) {
  const contatoTipo =
    'contato_tipo' in chat && (chat as EnrichedChat).contato_tipo
      ? (chat as EnrichedChat).contato_tipo
      : chat.cliente_id
      ? 'cliente'
      : chat.lead_id
      ? 'lead'
      : 'unknown';

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 bg-[#F8F8F8] dark:bg-[#181818] border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] shrink-0"
      style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar para conversas"
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all text-zinc-700 dark:text-zinc-300 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : null}

      <div
        onClick={onToggleContext}
        title="Toque para ver o contexto do contato"
        className={cn(
          'flex items-center gap-3 flex-1 min-w-0',
          onToggleContext && 'cursor-pointer group/header select-none active:opacity-75 transition-opacity'
        )}
      >
        <ContactAvatar
          phone={chat.contato_phone_normalized}
          name={chat.contato_nome}
          src={chat.contato_avatar}
          size="md"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#1C1C1C] dark:text-[#EFEFEF] truncate group-hover/header:text-[#B8925F] dark:group-hover/header:text-[#D4AF37] transition-colors">
              {chat.contato_nome ?? chat.contato_phone_normalized ?? 'Conversa'}
            </span>
            {contatoTipo === 'cliente' ? (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 shrink-0">
                Cliente
              </span>
            ) : contatoTipo === 'lead' ? (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                Lead
              </span>
            ) : null}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate h-[16px]">
            {chat.contato_phone_normalized}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {onToggleTemplates && (
          <button
            type="button"
            aria-label="Modelos de Mensagem"
            onClick={onToggleTemplates}
            className={cn(
              'h-9 w-9 flex items-center justify-center rounded-full transition-colors',
              templatesOpen
                ? 'text-[#C9A87C] bg-[#C9A87C]/15 dark:bg-[#C9A87C]/20 font-semibold'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            title="Respostas Rápidas e Modelos"
          >
            <Zap className="h-4 w-4" />
          </button>
        )}

        {onToggleContext && (
          <button
            type="button"
            aria-label="Contexto Lunari"
            onClick={onToggleContext}
            className={cn(
              'h-9 w-9 flex items-center justify-center rounded-full transition-colors',
              contextOpen
                ? 'text-[#C9A87C] bg-[#C9A87C]/15 dark:bg-[#C9A87C]/20 font-semibold'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            title="Ver Contexto Lunari"
          >
            <Sparkles className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          aria-label="Notas"
          onClick={onToggleNotes}
          className={cn(
            'h-9 w-9 flex items-center justify-center rounded-full transition-colors',
            notesOpen
              ? 'text-[#C9A87C] bg-[#C9A87C]/15 dark:bg-[#C9A87C]/20 font-semibold'
              : 'text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
          )}
          title="Notas internas"
        >
          <StickyNote className="h-4 w-4" />
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
