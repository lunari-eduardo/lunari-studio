import { Star, CalendarDays, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ChatState } from '@/hooks/useChatStateResolver';

interface ContactHeaderCardProps {
  chat: any;
  state: ChatState;
  cliente?: any;
}

export function ContactHeaderCard({ chat, state, cliente }: ContactHeaderCardProps) {
  const navigate = useNavigate();
  // Prioriza o nome salvo no CRM. Se não existir, cai pro nome do zap.
  const name = cliente?.nome || chat?.contato_nome || chat?.contato_phone_normalized || 'Desconhecido';
  
  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col gap-3">
      {/* Top Row: Info + Button */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight flex-1">
          {name}
        </h3>
        {chat?.cliente_id && (
          <button
            onClick={() => navigate(`/app/clientes/${chat.cliente_id}`)}
            className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <span className="text-[10px] font-medium">Ver Cliente</span>
            <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Bottom Row: Main Tag */}
      {state !== 'UNKNOWN' && (
        <div className="flex items-center gap-2 pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
          {state === 'LEAD' && (
            <div className="flex items-center gap-1 bg-[#8B5CF6]/10 text-[#8B5CF6] px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#8B5CF6]/20">
              <Star className="h-2.5 w-2.5 fill-current" /> Lead
            </div>
          )}

          {state === 'SESSION' && (
            <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-500/20">
              <Star className="h-2.5 w-2.5 fill-current" /> Cliente
            </div>
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
