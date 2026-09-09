import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface BookingCalendarProps {
  availableDates: string[]; // ["2026-09-10", ...]
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  slotsForSelectedDate: { start_time: string; end_time: string }[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

export function BookingCalendar({
  availableDates,
  selectedDate,
  onSelectDate,
  slotsForSelectedDate,
  selectedTime,
  onSelectTime,
}: BookingCalendarProps) {
  const availableSet = React.useMemo(() => new Set(availableDates), [availableDates]);

  // Determine initial month from first available date or today
  const initialMonth = React.useMemo(() => {
    if (selectedDate) return parseISO(selectedDate);
    if (availableDates.length > 0) return parseISO(availableDates[0]);
    return new Date();
  }, [selectedDate, availableDates]);

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    if (availableSet.has(dateStr)) {
      onSelectDate(dateStr);
    }
  };

  const isDayAvailable = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availableSet.has(dateStr);
  };

  const selectedDateObj = selectedDate ? parseISO(selectedDate) : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* Coluna do Calendário */}
      <div className="md:col-span-7 bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 px-1 text-sm font-medium text-neutral-600">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <span>Selecione uma data</span>
        </div>

        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDateObj}
            onSelect={handleSelectDate}
            locale={ptBR}
            defaultMonth={initialMonth}
            disabled={(date) => !isDayAvailable(date)}
            modifiers={{
              available: (date) => isDayAvailable(date),
            }}
            modifiersClassNames={{
              available: "font-bold text-primary hover:bg-primary/10 cursor-pointer",
            }}
            className="rounded-md"
          />
        </div>
      </div>

      {/* Coluna dos Horários */}
      <div className="md:col-span-5 bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm min-h-[300px] flex flex-col">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-neutral-600">
          <Clock className="w-4 h-4 text-primary" />
          <span>
            {selectedDate
              ? `Horários para ${format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}`
              : 'Selecione uma data ao lado'}
          </span>
        </div>

        {!selectedDate ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-400">
            <Clock className="w-10 h-10 stroke-1 text-neutral-300 mb-2" />
            <p className="text-sm">Clique em um dia em destaque no calendário para ver os horários livres.</p>
          </div>
        ) : slotsForSelectedDate.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-400">
            <p className="text-sm">Não há horários disponíveis para este dia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[320px] pr-1">
            {slotsForSelectedDate.map((slot) => {
              const isSelected = selectedTime === slot.start_time;
              return (
                <Button
                  key={slot.start_time}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSelectTime(slot.start_time)}
                  className={cn(
                    'h-10 text-sm font-medium transition-all justify-center',
                    isSelected
                      ? 'shadow-sm text-primary-foreground'
                      : 'border-neutral-200 bg-neutral-50/60 hover:border-primary/50 hover:bg-primary/5 text-neutral-800'
                  )}
                >
                  {slot.start_time}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}