import { MoreVertical, Star, CalendarDays, Briefcase, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Chat } from '@/modules/conversas/types';
import type { ChatState } from '@/hooks/useChatStateResolver';

interface ContactHeaderCardProps {
  chat: Chat | any;
  state: ChatState;
}

export function ContactHeaderCard({ chat, state }: ContactHeaderCardProps) {
  // Helpers
  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : '??';
  const name = chat?.contato_nome || chat?.contato_phone_normalized || 'Desconhecido';
  const phone = chat?.contato_phone_normalized || '';
  const avatar = chat?.contato_avatar;

  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col gap-3">
      {/* Top Row: Avatar + Info + Actions */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center bg-[#6B5A76] text-white font-medium text-sm overflow-hidden border border-black/5">
          {avatar ? (
            <img src={avatar} alt={name} className="h-full w-full object-cover" />
          ) : (
            getInitials(name)
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
            {name}
          </h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
            {phone}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Green WhatsApp Icon */}
          <div className="flex items-center justify-center h-6 w-6">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#25D366] fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
          </div>
          <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 rounded transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom Row: Dynamic Tags */}
      {state !== 'UNKNOWN' && (
        <div className="flex items-center gap-2 pt-1">
          {state === 'LEAD' && (
            <>
              <div className="flex items-center gap-1 bg-[#8B5CF6]/10 text-[#8B5CF6] px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#8B5CF6]/20">
                <Star className="h-2.5 w-2.5 fill-current" /> Lead
              </div>
              <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-full text-[10px] font-medium border border-amber-500/20">
                Orçamento aberto
              </div>
            </>
          )}

          {state === 'SESSION' && (
            <>
              <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-500/20">
                <Star className="h-2.5 w-2.5 fill-current" /> Cliente
              </div>
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full text-[10px] font-medium border border-zinc-200 dark:border-zinc-700">
                Sessão agendada
              </div>
            </>
          )}

          {state === 'POST_SALE' && (
            <div className="flex items-center gap-1 bg-[#3B82F6]/10 text-[#3B82F6] px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#3B82F6]/20">
              <CalendarDays className="h-2.5 w-2.5" /> Cliente recorrente
            </div>
          )}
        </div>
      )}
    </div>
  );
}
