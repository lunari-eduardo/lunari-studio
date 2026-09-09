import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function PeriodPicker({ panel }: { panel: any }) {
  const { dateRange, setDateRange, weekdayMode, setWeekdayMode, selectedWeekdays, toggleWeekday } = panel;
  const weekDaysLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Período</Label>
        <div className="rounded-md border p-2 bg-card">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={1}
            locale={ptBR}
            defaultMonth={dateRange?.from}
            className="mx-auto"
            classNames={{
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_range_end: "aria-selected:bg-primary aria-selected:text-primary-foreground",
              day_range_start: "aria-selected:bg-primary aria-selected:text-primary-foreground",
            }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Aplicar em quais dias?</Label>
        <div className="flex bg-muted rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn("flex-1 rounded-md text-xs h-8", weekdayMode === 'all' ? 'bg-background shadow-sm' : 'hover:bg-transparent text-muted-foreground')}
            onClick={() => setWeekdayMode('all')}
          >
            Todos do período
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("flex-1 rounded-md text-xs h-8", weekdayMode === 'specific' ? 'bg-background shadow-sm' : 'hover:bg-transparent text-muted-foreground')}
            onClick={() => setWeekdayMode('specific')}
          >
            Dias específicos
          </Button>
        </div>

        {weekdayMode === 'specific' && (
          <div className="flex flex-wrap gap-2 pt-2">
            {weekDaysLabels.map((lbl, idx) => {
              const isSelected = selectedWeekdays.includes(idx);
              return (
                <Button
                  key={idx}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs px-3"
                  onClick={() => toggleWeekday(idx)}
                >
                  {lbl}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
