import { useState } from 'react';
import { Calendar, ChevronRight, ChevronDown } from 'lucide-react';
import type { ContextSessao, ContextOrcamento } from '@/hooks/useConversasContactContext';
import { formatDateForDisplay, parseDateFromStorage } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

interface SmartSessionCardProps {
  variant?: 'next' | 'post_production' | 'last';
  sessoes: ContextSessao[];
  orcamentos?: ContextOrcamento[];
  onOpenWorkflow: (sessionId?: string) => void;
  onNavigate?: (path: string) => void;
}

export function SmartSessionCard({ sessoes, onOpenWorkflow, variant }: SmartSessionCardProps) {
  const [expanded, setExpanded] = useState(true);

  if (!sessoes || sessoes.length === 0) return null;

  const session = sessoes[0];

  const formatDisplayDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Sem data';
    const cleanDate = dateStr.slice(0, 10);
    const brDate = formatDateForDisplay(cleanDate);
    if (brDate) return brDate;
    const d = parseDateFromStorage(cleanDate);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
    return dateStr;
  };

  const isPaid = session.valor_pago !== null && session.valor_total !== null && session.valor_pago >= session.valor_total && session.valor_total > 0;
  
  const formatCurrency = (val: number | null) => {
    if (val === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  let title = 'Sessão atual';
  if (variant === 'next') title = 'Próxima sessão';

  return (
    <div className={cn(
      "flex flex-col rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all overflow-hidden",
      expanded && "pb-3"
    )}>
      <div 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Calendar className="h-4 w-4 text-zinc-400" />
          <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 flex flex-col gap-1.5 cursor-pointer" onClick={() => onOpenWorkflow(session.session_id || session.id)}>
          <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
            {session.pacote || session.categoria || 'Sessão'}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            {formatDisplayDate(session.data_sessao)} · <span className="text-sky-600 dark:text-sky-400 font-medium">{variant === 'post_production' ? 'Em pós-produção' : 'Agendada'}</span>
          </span>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {session.status === 'concluida' ? 'Concluída' : 'Ativa'}
            </div>
            
            {isPaid ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                Pago · {formatCurrency(session.valor_pago)}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-700/30 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold">
                Pendente · {formatCurrency((session.valor_total || 0) - (session.valor_pago || 0))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

