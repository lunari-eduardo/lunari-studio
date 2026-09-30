import { User, TrendingUp, CalendarDays, BarChart3 } from 'lucide-react';
import type { UnifiedContactContext } from '@/hooks/useConversasContactContext';

interface RelationshipSummaryCardProps {
  context: UnifiedContactContext;
}

export function RelationshipSummaryCard({ context }: RelationshipSummaryCardProps) {
  const { client, metrics } = context;

  // Renderiza apenas se houver cliente vinculado
  if (!client?.id) return null;

  const formatDate = (date: Date | null) => {
    if (!date) return 'Desconhecido';
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    // metrics.lifetimeValue assumed to be in cents
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-zinc-400" />
            Resumo do Relacionamento
          </span>
        </div>
        <div className="flex flex-col gap-2.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-zinc-500 flex items-center gap-1.5"><CalendarDays className="w-3 h-3"/> Cliente desde</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatDate(metrics.clientSince)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 flex items-center gap-1.5"><TrendingUp className="w-3 h-3"/> Ensaios realizados</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{metrics.totalSessions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 flex items-center gap-1.5"><BarChart3 className="w-3 h-3"/> Ticket Total</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.lifetimeValue)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
