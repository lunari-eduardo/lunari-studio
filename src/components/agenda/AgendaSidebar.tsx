import MiniMonthCalendar from './MiniMonthCalendar';
import AgendaTasksSection from './AgendaTasksSection';
import DayRevenueKPI from './DayRevenueKPI';
import { useAvailability } from '@/hooks/useAvailability';
import { useSupabaseTasks } from '@/hooks/useSupabaseTasks';
import type { UnifiedEvent } from '@/modules/agenda/presentation';
import type { ViewType } from '@/utils/dateFormatters';

interface AgendaSidebarProps {
  date: Date;
  view: ViewType;
  unifiedEvents: UnifiedEvent[];
  onNavigateToDate: (date: Date) => void;
  onSwitchToDay?: () => void;
}

export default function AgendaSidebar({
  date,
  view,
  unifiedEvents,
  onNavigateToDate,
  onSwitchToDay,
}: AgendaSidebarProps) {
  const { availability } = useAvailability();
  const { tasks } = useSupabaseTasks();

  const showKPI = view === 'day' || view === 'week';
  const kpiRange: 'day' | 'week' = view === 'week' ? 'week' : 'day';
  const showTasks = view === 'day' || view === 'week';

  return (
    <aside className="space-y-3">
      <div className="rounded-xl border border-border/20 bg-card/60 shadow-sm p-3">
        <MiniMonthCalendar
          selectedDate={date}
          unifiedEvents={unifiedEvents}
          availability={availability}
          onDateSelect={(d) => {
            onNavigateToDate(d);
            if (view !== 'day' && view !== 'week') onSwitchToDay?.();
          }}
        />
      </div>

      {showKPI && (
        <DayRevenueKPI
          date={date}
          unifiedEvents={unifiedEvents}
          range={kpiRange}
        />
      )}

      {showTasks && (
        <AgendaTasksSection
          selectedDate={date}
          tasks={tasks}
          viewMode={view}
          onCreateTask={() => {}}
          onDayClick={onNavigateToDate}
        />
      )}
    </aside>
  );
}
