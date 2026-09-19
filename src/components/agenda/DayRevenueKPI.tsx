import { useMemo } from 'react';
import { formatCurrency } from '@/utils/currencyUtils';
import { summarizeRevenue, getWeekRange } from '@/utils/agendaRevenueCalc';
import { useConfigurationContext } from '@/contexts/ConfigurationContext';
import type { UnifiedEvent } from '@/modules/agenda/presentation';

interface DayRevenueKPIProps {
  date: Date;
  unifiedEvents: UnifiedEvent[];
  range: 'day' | 'week';
}

export default function DayRevenueKPI({ date, unifiedEvents, range }: DayRevenueKPIProps) {
  const { pacotes } = useConfigurationContext();

  const summary = useMemo(() => {
    if (range === 'week') {
      return summarizeRevenue(unifiedEvents, pacotes, getWeekRange(date));
    }
    return summarizeRevenue(unifiedEvents, pacotes, { start: date });
  }, [unifiedEvents, pacotes, date, range]);

  const title = range === 'week' ? 'Faturamento da semana' : 'Faturamento do dia';

  return (
    <div className="rounded-lg border border-border/20 bg-card/40 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
          {title}
        </div>
        <div className="text-lg font-semibold tabular-nums">
          {formatCurrency(summary.total)}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground/60 capitalize mt-0.5">
        {summary.count === 0 ? 'Nenhuma sessão' : `${summary.count} ${summary.count === 1 ? 'sessão' : 'sessões'}`}
      </div>
    </div>
  );
}
