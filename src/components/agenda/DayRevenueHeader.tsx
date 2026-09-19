import { useMemo } from 'react';
import { TrendingUp, Wallet, CheckCircle2, CircleDashed } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import { summarizeRevenue, getWeekRange } from '@/utils/agendaRevenueCalc';
import { useConfigurationContext } from '@/contexts/ConfigurationContext';
import type { UnifiedEvent } from '@/modules/agenda/presentation';
import { cn } from '@/lib/utils';

interface DayRevenueHeaderProps {
  date: Date;
  unifiedEvents: UnifiedEvent[];
  range: 'day' | 'week';
}

export default function DayRevenueHeader({ date, unifiedEvents, range }: DayRevenueHeaderProps) {
  const { pacotes } = useConfigurationContext();

  const summary = useMemo(() => {
    if (range === 'week') {
      return summarizeRevenue(unifiedEvents, pacotes, getWeekRange(date));
    }
    return summarizeRevenue(unifiedEvents, pacotes, { start: date });
  }, [unifiedEvents, pacotes, date, range]);

  const label = range === 'week' ? 'Semana' : 'Hoje';

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border/20 bg-card/40 px-3 py-2',
        'text-[11px] text-muted-foreground'
      )}
    >
      <span className="font-semibold uppercase tracking-wide text-muted-foreground/80">
        {label}
      </span>

      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3 w-3 text-foreground/60" />
        <span className="tabular-nums font-medium text-foreground">
          {formatCurrency(summary.total)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Wallet className="h-3 w-3 text-success" />
        <span className="tabular-nums text-success">{formatCurrency(summary.paid)}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <CircleDashed className="h-3 w-3 text-warning" />
        <span className="tabular-nums text-warning">{formatCurrency(summary.pending)}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 text-muted-foreground/70">
        <CheckCircle2 className="h-3 w-3" />
        <span>
          {summary.count === 0
            ? 'Nenhuma sessão'
            : `${summary.count} ${summary.count === 1 ? 'sessão' : 'sessões'} · ${summary.paidPct}% pago`}
        </span>
      </div>
    </div>
  );
}
