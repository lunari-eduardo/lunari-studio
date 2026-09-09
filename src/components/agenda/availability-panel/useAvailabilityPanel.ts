import { useState, useMemo, useCallback } from 'react';
import { useAvailability } from '@/hooks/useAvailability';
import { useAvailabilityTypes } from '@/hooks/useAvailabilityTypes';
import { useAppointmentsRangeQuery } from '@/modules/agenda/presentation';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { formatDateForInput } from '@/utils/dateUtils';
import type { DateRange } from 'react-day-picker';

export function useAvailabilityPanel(date: Date, initialTime?: string, onClose?: () => void) {
  const { availability, addAvailabilitySlots, deleteAvailabilitySlots } = useAvailability();
  const { availabilityTypes, isLoading: isLoadingTypes } = useAvailabilityTypes();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: date, to: date });
  const [weekdayMode, setWeekdayMode] = useState<'all' | 'specific'>('all');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<{ start: string; end?: string }[]>(initialTime ? [{ start: initialTime }] : []);
  
  const [blockMode, setBlockMode] = useState<'fullDay' | 'specific'>('fullDay');
  const [liberarMode, setLiberarMode] = useState<'create' | 'replace'>('create');
  
  const [isSaving, setIsSaving] = useState(false);

  // set default type ID when types are loaded
  if (!selectedTypeId && availabilityTypes.length > 0) {
    setSelectedTypeId(availabilityTypes[0].id);
  }

  const apptRange = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const end = new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000);
    return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
  }, []);
  const { data: appointmentsData } = useAppointmentsRangeQuery(apptRange);
  const appointments = appointmentsData ?? [];

  const computeTargetDates = useCallback((): Date[] => {
    if (!dateRange?.from) return [];
    const start = dateRange.from;
    const end = dateRange.to || dateRange.from;
    const results: Date[] = [];
    let d = new Date(start);
    while (d <= end) {
      if (weekdayMode === 'all' || selectedWeekdays.includes(d.getDay())) {
        results.push(new Date(d));
      }
      d = addDays(d, 1);
    }
    return results;
  }, [dateRange, weekdayMode, selectedWeekdays]);

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const handleLiberar = async () => {
    const targetDates = computeTargetDates();
    if (targetDates.length === 0) {
      toast.error('Selecione ao menos um dia.');
      return;
    }
    const validTimes = timeSlots.filter(t => t.start && /^([01]\d|2[0-3]):([0-5]\d)$/.test(t.start));
    if (validTimes.length === 0) {
      toast.error('Adicione ao menos um horário válido.');
      return;
    }

    setIsSaving(true);
    try {
      const uniqueTimes = Array.from(new Set(validTimes.map(t => t.start))).sort((a, b) => toMinutes(a) - toMinutes(b));
      const tipo = availabilityTypes.find(t => t.id === selectedTypeId) || availabilityTypes[0];
      const defaultLabel = tipo?.name || 'Disponível';
      const defaultColor = tipo?.color || '#10b981';

      const idsToDelete: string[] = [];
      const toAdd: any[] = [];
      let blocksPreserved = 0;

      for (const d of targetDates) {
        const ds = format(d, 'yyyy-MM-dd');
        
        if (liberarMode === 'replace') {
          for (const t of uniqueTimes) {
             const existing = availability.filter(a => a.date === ds && a.time === t);
             for (const a of existing) {
                if (a.label === 'Bloqueado') { blocksPreserved++; continue; }
                idsToDelete.push(a.id);
             }
             toAdd.push({ date: ds, time: t, duration: 60, typeId: tipo.id, label: defaultLabel, color: defaultColor });
          }
        } else {
          for (const t of uniqueTimes) {
            const hasExisting = availability.some(a => a.date === ds && a.time === t);
            if (!hasExisting) {
               toAdd.push({ date: ds, time: t, duration: 60, typeId: tipo.id, label: defaultLabel, color: defaultColor });
            }
          }
        }
      }

      if (idsToDelete.length > 0) {
        await deleteAvailabilitySlots(idsToDelete);
      }
      
      if (toAdd.length > 0) {
        await addAvailabilitySlots(toAdd);
      }

      if (blocksPreserved > 0) {
         toast.info(`${blocksPreserved} bloqueios preservados.`);
      }

      toast.success('Horários liberados!');
      onClose?.();
    } catch (err: any) {
      toast.error('Erro ao salvar horários: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBloquear = async () => {
    const targetDates = computeTargetDates();
    if (targetDates.length === 0) {
      toast.error('Selecione ao menos um dia.');
      return;
    }

    setIsSaving(true);
    try {
      const appointmentKeys = new Set(
        appointments.map(a => `${typeof a.date === 'string' ? a.date : formatDateForInput(a.date)}|${a.time}`)
      );

      const idsToDelete: string[] = [];
      const toAdd: any[] = [];
      let preservedCount = 0;

      for (const d of targetDates) {
        const ds = format(d, 'yyyy-MM-dd');

        if (blockMode === 'fullDay') {
          const dayAppointmentTimes = new Set([...appointmentKeys].filter(k => k.startsWith(`${ds}|`)).map(k => k.split('|')[1]));
          
          availability.filter(a => a.date === ds).forEach(a => {
            if (dayAppointmentTimes.has(a.time)) {
              preservedCount++;
            } else {
              idsToDelete.push(a.id);
            }
          });
          
          toAdd.push({ date: ds, time: '00:00', duration: 1440, label: 'Bloqueado', color: '#ef4444', isFullDay: true });
        } else {
          const validTimes = timeSlots.filter(t => t.start && /^([01]\d|2[0-3]):([0-5]\d)$/.test(t.start));
          if (validTimes.length === 0) {
             toast.error('Adicione ao menos um horário para bloquear.');
             setIsSaving(false);
             return;
          }
          const uniqueTimes = Array.from(new Set(validTimes.map(t => t.start)));

          for (const t of uniqueTimes) {
            if (appointmentKeys.has(`${ds}|${t}`)) {
               preservedCount++;
               continue;
            }
            availability.filter(a => a.date === ds && a.time === t).forEach(a => idsToDelete.push(a.id));
            toAdd.push({ date: ds, time: t, duration: 60, label: 'Bloqueado', color: '#ef4444' });
          }
        }
      }

      if (idsToDelete.length > 0) {
        await deleteAvailabilitySlots(idsToDelete);
      }
      if (toAdd.length > 0) {
        await addAvailabilitySlots(toAdd);
      }
      if (preservedCount > 0) {
        toast.info(`${preservedCount} horário(s) com agendamentos preservado(s)`);
      }
      toast.success('Horários bloqueados!');
      onClose?.();
    } catch (err: any) {
      toast.error('Erro ao bloquear: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveInRange = async () => {
    const targetDates = computeTargetDates();
    if (targetDates.length === 0) {
      toast.error('Selecione ao menos um dia.');
      return;
    }
    
    setIsSaving(true);
    try {
      const targetSet = new Set(targetDates.map(d => format(d, 'yyyy-MM-dd')));
      const idsToDelete = availability.filter(a => targetSet.has(a.date)).map(a => a.id);
      
      if (idsToDelete.length > 0) {
         await deleteAvailabilitySlots(idsToDelete);
         toast.success(`Disponibilidades removidas: ${idsToDelete.length}`);
      } else {
         toast.info('Nenhuma disponibilidade para remover no período.');
      }
      onClose?.();
    } catch (err: any) {
      toast.error('Erro ao remover: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    dateRange, setDateRange,
    weekdayMode, setWeekdayMode,
    selectedWeekdays, setSelectedWeekdays, toggleWeekday: (idx: number) => setSelectedWeekdays(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]),
    blockMode, setBlockMode,
    liberarMode, setLiberarMode,
    selectedTypeId, setSelectedTypeId,
    timeSlots, setTimeSlots, addTimeSlot: () => setTimeSlots(prev => [...prev, { start: '' }]),
    updateTimeSlot: (idx: number, field: 'start'|'end', val: string) => setTimeSlots(prev => prev.map((t, i) => i === idx ? { ...t, [field]: val } : t)),
    removeTimeSlot: (idx: number) => setTimeSlots(prev => prev.filter((_, i) => i !== idx)),
    handleLiberar, handleBloquear, handleRemoveInRange,
    isSaving, isLoadingTypes, availabilityTypes
  };
}
