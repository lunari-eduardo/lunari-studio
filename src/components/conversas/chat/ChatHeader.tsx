/**
 * Header do chat panel — avatar, nome, ações (voltar, telefone, vídeo, notas, mais).
 */

import { ArrowLeft, MoreVertical, Tag } from 'lucide-react';
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
import { useChatLeadStatuses } from '@/hooks/useChatLeadStatuses';
import { useConversasEtiquetas } from '@/hooks/useConversasEtiquetas';

export interface ChatHeaderProps {
  chat: Chat | EnrichedChat;
  onBack?: () => void;
  onTogglePanel?: () => void;
  isPanelOpen?: boolean;
  onArchive?: () => void;
  onBlock?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onMarkUnread?: () => void;
  onFeedDna?: () => void;
}

export function ChatHeader({
  chat,
  onBack,
  onTogglePanel,
  isPanelOpen,
  onArchive,
  onBlock,
  onPin,
  onDelete,
  onMarkUnread,
  onFeedDna,
}: ChatHeaderProps) {
  const contatoTipo =
    'contato_tipo' in chat && (chat as EnrichedChat).contato_tipo
      ? (chat as EnrichedChat).contato_tipo
      : chat.cliente_id
      ? 'cliente'
      : chat.lead_id
      ? 'lead'
      : 'unknown';

  const { getLeadStatusForChat } = useChatLeadStatuses([chat as EnrichedChat]);
  const leadStatus = getLeadStatusForChat(chat as EnrichedChat);

  const { etiquetas } = useConversasEtiquetas();
  const chatEtiquetas = ((chat as EnrichedChat)?.etiquetas || []).map((id: string) => etiquetas.find(e => e.id === id)).filter(Boolean);

  return (
    <div
      className="flex items-center gap-3 px-2 sm:px-3 bg-[#F8F8F8] dark:bg-[#181818] border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] shrink-0 h-[60px] min-h-[60px]"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
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
        onClick={onTogglePanel}
        title="Toque para ver o contexto do contato"
        className={cn(
          'flex items-center gap-3 flex-1 min-w-0',
          onTogglePanel && 'cursor-pointer group/header select-none active:opacity-75 transition-opacity'
        )}
      >
        <ContactAvatar
          phone={chat.contato_phone_normalized}
          name={(chat as any).clientes?.nome ?? chat.contato_nome ?? (chat as any).conversas_contatos?.nome}
          src={chat.contato_avatar ?? (chat as any).conversas_contatos?.avatar_url}
          className="h-11 w-11 text-base shadow-sm"
        />

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-[#1C1C1C] dark:text-[#EFEFEF] truncate tracking-tight group-hover/header:text-[#B8925F] dark:group-hover/header:text-[#D4AF37] transition-colors leading-none">
              {(chat as any).clientes?.nome ?? chat.contato_nome ?? (chat as any).conversas_contatos?.nome ?? chat.contato_phone_normalized ?? 'Conversa'}
            </span>
            {/* Tags de tipo de contato */}
            {contatoTipo === 'cliente' ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#C9A87C]/15 text-[#A58253] dark:bg-[#C9A87C]/20 dark:text-[#D4AF37] border-none shrink-0 uppercase tracking-wider">
                Cliente
              </span>
            ) : contatoTipo === 'lead' ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-none shrink-0 uppercase tracking-wider">
                Lead
              </span>
            ) : null}
            {/* Tag do Status do Lead */}
            {leadStatus && (
              <span 
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border-none shrink-0 uppercase tracking-wider"
                style={{
                  backgroundColor: `${leadStatus.color || '#94a3b8'}20`,
                  color: leadStatus.color || '#94a3b8'
                }}
              >
                {leadStatus.label}
              </span>
            )}
            {chatEtiquetas.map(e => (
              <span 
                key={e!.id} 
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold border-none shrink-0 uppercase tracking-wider"
                style={{ backgroundColor: e!.cor + '1A', color: e!.cor }}
              >
                <Tag className="h-2.5 w-2.5 mr-1 opacity-80" />
                {e!.nome}
              </span>
            ))}
          </div>
          <div className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate mt-1 leading-none">
            {chat.contato_phone_normalized}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onTogglePanel && (
          <button
            type="button"
            aria-label="Painel do Contato"
            onClick={onTogglePanel}
            className={cn(
              'hidden md:flex h-9 w-9 items-center justify-center rounded-full transition-colors',
              isPanelOpen
                ? 'text-[#C9A87C] bg-[#C9A87C]/15 dark:bg-[#C9A87C]/20'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            title="Ver Painel do Contato"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>
          </button>
        )}

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
            
            {onFeedDna && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onFeedDna} className="text-emerald-600 dark:text-emerald-400 dark:hover:bg-white/[0.07]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 12c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9 9-4.03 9-9z"></path><path d="M12 8v4l3 3"></path></svg>
                  Alimentar DNA da Lua
                </DropdownMenuItem>
              </>
            )}

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
