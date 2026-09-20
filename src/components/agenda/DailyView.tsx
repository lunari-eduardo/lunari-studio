import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimeInput } from "@/components/ui/time-input";
import { useState, useRef } from 'react';
import ConflictIndicator from './ConflictIndicator';
import { Plus, Trash2, RotateCcw, Clock, Layers } from 'lucide-react';
import { UnifiedEvent } from '@/modules/agenda/presentation';
import UnifiedEventCard from './UnifiedEventCard';
import { useAvailability } from '@/hooks/useAvailability';
import { useCustomTimeSlots } from '@/hooks/useCustomTimeSlots';
import { useAgendaSettings } from '@/hooks/useAgendaSettings';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TimeSlotOptionsMenu from './TimeSlotOptionsMenu';
import { isSlotCoveredByEvent, getEventEndTime, timeToMinutes, minutesToTime } from '@/modules/agenda/domain/conflict';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppointmentMutations } from "@/modules/agenda/presentation";

interface DailyViewProps {
  date: Date;
  unifiedEvents: UnifiedEvent[];
  onCreateSlot: (slot: {
    date: Date;
    time: string;
  }) => void;
  onCreateSession?: (slot: {
    date: Date;
    time: string;
  }) => void;
  onCreateMeeting?: (slot: {
    date: Date;
    time: string;
  }) => void;
  onCreatePersonalEvent?: (slot: {
    date: Date;
    time: string;
  }) => void;
  onCreateTask?: (slot: {
    date: Date;
    time: string;
  }) => void;
  onEventClick: (event: UnifiedEvent) => void;
  onOpenAvailability?: (date: Date, time: string) => void;
}

export default function DailyView({
  date,
  unifiedEvents,
  onCreateSlot,
  onCreateSession,
  onCreateMeeting,
  onCreatePersonalEvent,
  onCreateTask,
  onEventClick,
  onOpenAvailability
}: DailyViewProps) {
  const [editingTimeSlot, setEditingTimeSlot] = useState<number | null>(null);
  const [isSavingTimeSlot, setIsSavingTimeSlot] = useState(false);
  const [showAddTimeSlot, setShowAddTimeSlot] = useState(false);
  const [newTimeInput, setNewTimeInput] = useState('');
  const [unlockConfirmTime, setUnlockConfirmTime] = useState<string | null>(null);
  
  const [conflictState, setConflictState] = useState<{
    actionType: 'session' | 'meeting' | 'personal' | 'task';
    date: Date;
    time: string;
    occupiedByEvent: UnifiedEvent;
  } | null>(null);

  const dateKey = format(date, 'yyyy-MM-dd');
  const slotsContainerRef = useRef<HTMLDivElement>(null);
  
  const { updateAppointment } = useAppointmentMutations();

  const {
    availability,
    availabilityTypes,
    addAvailabilitySlots,
    deleteAvailabilitySlot
  } = useAvailability();

  const { defaultTimeSlots } = useAgendaSettings();

  // Usar hook customizado para horários personalizados
  const {
    timeSlots: customSlots,
    isLoading: slotsLoading,
    hasCustomSlots,
    addTimeSlot,
    editTimeSlot,
    removeTimeSlot,
    resetToDefault
  } = useCustomTimeSlots(date, defaultTimeSlots);

  // Verificar se existe slot de "dia todo" para a data atual
  const fullDaySlot = availability.find(
    s => s.date === dateKey && s.isFullDay
  );

  // Get time slots for the current date (include events and availability times)
  const getCurrentTimeSlots = () => {
    const eventTimes = unifiedEvents
      .filter(event => isSameDay(event.date, date))
      .map(event => event.time);
    
    // FASE: Gerar slots adicionais para preencher o tempo total de cada sessão
    const spannedTimes: string[] = [];
    unifiedEvents
      .filter(event => isSameDay(event.date, date))
      .forEach(event => {
        const dur = event.durationMinutes !== undefined ? event.durationMinutes : ((event.originalData as any)?.durationMinutes ?? 0);
        if (dur > 30) {
          let currentMin = timeToMinutes(event.time) + 30;
          const endMin = timeToMinutes(event.time) + dur;
          while (currentMin < endMin) {
            spannedTimes.push(minutesToTime(currentMin));
            currentMin += 30;
          }
        }
      });

    // Não incluir slot de dia todo nos horários
    const availabilityTimes = availability
      .filter(s => s.date === dateKey && !s.isFullDay)
      .map(s => s.time);
    
    const merged = Array.from(new Set([
      ...customSlots,
      ...eventTimes,
      ...spannedTimes,
      ...availabilityTimes
    ])).sort();
    
    return merged;
  };
  
  const timeSlots = getCurrentTimeSlots();
  const dayEvents = unifiedEvents.filter(event => isSameDay(event.date, date));



  
  const getEventsForSlot = (time: string) => {
    return dayEvents.filter(event => event.time === time);
  };
  
  const getAvailabilityForTime = (time: string) => {
    return availability.find(s => s.date === dateKey && s.time === time && !s.isFullDay);
  };

  const isBlockedSlot = (time: string) => {
    const slot = getAvailabilityForTime(time);
    return slot?.label === 'Bloqueado';
  };
  
  const handleRemoveAvailability = (time: string) => {
    const matches = availability.filter(s => s.date === dateKey && s.time === time);
    matches.forEach(s => deleteAvailabilitySlot(s.id));
    if (matches.length > 0) {
      toast.success('Disponibilidade removida');
    }
  };

  const handleMarkAvailable = async (time: string) => {
    // Check if slot is blocked — must unblock first
    const blocked = availability.find(s => s.date === dateKey && s.time === time && s.label === 'Bloqueado');
    if (blocked) {
      toast.error('Desbloqueie o horário primeiro antes de marcá-lo como disponível');
      return;
    }

    // Remove existing availability for this time first
    const existing = availability.filter(s => s.date === dateKey && s.time === time && !s.isFullDay);
    existing.forEach(s => deleteAvailabilitySlot(s.id));

    const tipo = availabilityTypes[0];
    const label = tipo?.name || 'Disponível';
    const color = tipo?.color || '#10b981';

    await addAvailabilitySlots([{
      date: dateKey,
      time,
      duration: 60,
      label,
      color,
      typeId: tipo?.id,
    }]);
    toast.success('Horário marcado como disponível');
  };

  const handleBlockSlot = async (time: string) => {
    // Remove existing availability for this time first
    const existing = availability.filter(s => s.date === dateKey && s.time === time && !s.isFullDay);
    existing.forEach(s => deleteAvailabilitySlot(s.id));
    
    await addAvailabilitySlots([{
      date: dateKey,
      time,
      duration: 60,
      label: 'Bloqueado',
      color: '#ef4444',
    }]);
    toast.success('Horário bloqueado');
  };

  const handleUnblockSlot = (time: string) => {
    const matches = availability.filter(s => s.date === dateKey && s.time === time && s.label === 'Bloqueado');
    matches.forEach(s => deleteAvailabilitySlot(s.id));
    toast.success('Horário desbloqueado');
    setUnlockConfirmTime(null);
  };

  const handleRemoveTimeSlot = async (time: string) => {
    // Also remove any availability for this time
    const existing = availability.filter(s => s.date === dateKey && s.time === time && !s.isFullDay);
    existing.forEach(s => deleteAvailabilitySlot(s.id));
    await removeTimeSlot(time);
  };
  
  const handleEditTimeSlot = (index: number, currentTime: string) => {
    const events = getEventsForSlot(currentTime);
    if (events.length > 0) return;
    setEditingTimeSlot(index);
  };
  
  const handleSaveTimeSlot = async (index: number, newTime: string) => {
    setIsSavingTimeSlot(true);
    const oldTime = timeSlots[index];
    const success = await editTimeSlot(oldTime, newTime);
    
    if (success) {
      setEditingTimeSlot(null);
    }
    
    // Delay de segurança para garantir que o estado atualize antes de permitir cliques
    setTimeout(() => {
      setIsSavingTimeSlot(false);
    }, 150);
  };

  const handleAddNewTimeSlot = async () => {
    if (!newTimeInput.trim()) {
      toast.error('Digite um horário válido');
      return;
    }
    const success = await addTimeSlot(newTimeInput);
    if (success) {
      setShowAddTimeSlot(false);
      setNewTimeInput('');
    }
  };

  const handleRemoveFullDay = () => {
    if (fullDaySlot) {
      deleteAvailabilitySlot(fullDaySlot.id);
      toast.success('Dia todo removido');
    }
  };

  const handleCreateAttempt = (actionType: 'session' | 'meeting' | 'personal' | 'task', slotDate: Date, slotTime: string, occupiedByEvent?: UnifiedEvent) => {
    if (occupiedByEvent) {
      setConflictState({ actionType, date: slotDate, time: slotTime, occupiedByEvent });
    } else {
      handleProceedCreate(actionType, slotDate, slotTime);
    }
  };

  const handleProceedCreate = (actionType: 'session' | 'meeting' | 'personal' | 'task', slotDate: Date, slotTime: string) => {
    if (actionType === 'session') {
      (onCreateSession || onCreateSlot)({ date: slotDate, time: slotTime });
    } else if (actionType === 'meeting') {
      onCreateMeeting?.({ date: slotDate, time: slotTime });
    } else if (actionType === 'personal') {
      onCreatePersonalEvent?.({ date: slotDate, time: slotTime });
    } else if (actionType === 'task') {
      onCreateTask?.({ date: slotDate, time: slotTime });
    }
  };

  const handleLiberarHorario = async () => {
    if (!conflictState?.occupiedByEvent) return;
    const event = conflictState.occupiedByEvent;
    
    if (event.type === 'appointment') {
      const apt = event.originalData as any;
      const startMin = timeToMinutes(event.time);
      const targetMin = timeToMinutes(conflictState.time);
      const newDuration = targetMin - startMin;
      
      if (newDuration > 0) {
        await updateAppointment(apt.id, { durationMinutes: newDuration });
        toast.success('Horário liberado com sucesso.');
        // Após liberar, prosseguir com a criação
        handleProceedCreate(conflictState.actionType, conflictState.date, conflictState.time);
      } else {
        toast.error('Não é possível encurtar o evento para esta duração.');
      }
    } else {
      toast.error('Não é possível encurtar este tipo de evento.');
    }
    setConflictState(null);
  };

  return (
    <div className="pb-16 md:pb-4">
      {/* Header: botão + à esquerda, dia da semana centralizado, restaurar padrão à direita */}
      <div className="flex items-center justify-between mb-2 border-b border-border/40 pb-2">
        <Popover open={showAddTimeSlot} onOpenChange={setShowAddTimeSlot}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="flex items-center gap-2">
              <div className="w-24">
                <TimeInput
                  value={newTimeInput}
                  onChange={setNewTimeInput}
                  placeholder="HH:mm"
                />
              </div>
              <Button size="sm" onClick={handleAddNewTimeSlot}>
                Adicionar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="text-sm font-bold text-foreground capitalize">
          {format(date, "EEEE", { locale: ptBR })}
        </div>

        {hasCustomSlots ? (
          <button
            onClick={resetToDefault}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            title="Restaurar horários padrão"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Restaurar padrão</span>
          </button>
        ) : (
          <div className="w-7 h-7" />
        )}
      </div>

      {/* Banner de Dia Todo */}
      {fullDaySlot && (
        <div 
          className="p-4 rounded-lg mb-4 border-2"
          style={{ 
            backgroundColor: fullDaySlot.color ? `${fullDaySlot.color}20` : 'hsl(var(--muted))',
            borderColor: fullDaySlot.color || 'hsl(var(--border))'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {fullDaySlot.color && (
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: fullDaySlot.color }}
                  />
                )}
                <span className="font-medium">{fullDaySlot.label || 'Dia todo ocupado'}</span>
              </div>
              {fullDaySlot.fullDayDescription && (
                <p className="text-sm text-muted-foreground mt-1">
                  {fullDaySlot.fullDayDescription}
                </p>
              )}
            </div>
            <button 
              onClick={handleRemoveFullDay}
              className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1 transition-colors ml-4"
              title="Remover dia todo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-1" ref={slotsContainerRef}>

        {timeSlots.map((time, index) => {
          const startingEvents = dayEvents.filter(event => event.time === time);
          const spanningEvents = dayEvents.filter(event => {
            if (event.time === time) return false;
            const dur = event.durationMinutes !== undefined ? event.durationMinutes : ((event.originalData as any)?.durationMinutes ?? 0);
            if (dur <= 0) return false;
            return isSlotCoveredByEvent(time, event.time, dur);
          });
          const hasStartingEvents = startingEvents.length > 0;
          const hasSpanningEvents = !hasStartingEvents && spanningEvents.length > 0;
          const isOccupied = hasStartingEvents || hasSpanningEvents;
          const isEditing = editingTimeSlot === index;
          
          const blocked = isBlockedSlot(time);
          
          // Se tem dia todo, aplicar cor de fundo do tipo
          const slotBgStyle = fullDaySlot ? {
            backgroundColor: fullDaySlot.color ? `${fullDaySlot.color}10` : undefined
          } : blocked ? {
            backgroundColor: 'hsl(var(--destructive) / 0.08)'
          } : {};

          return (
            <div
              key={`${time}-${index}`}
              className={`relative flex border rounded-md overflow-hidden py-0 my-[2px] mx-0 px-0 ${blocked ? 'border-destructive/30' : 'border-border/40'}`}
              style={slotBgStyle}
            >
              <div className="p-3 w-16 flex-shrink-0 text-right text-sm text-muted-foreground relative bg-muted/30">
                {isEditing ? (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <TimeInput 
                    value={time} 
                    onChange={newTime => handleSaveTimeSlot(index, newTime)} 
                    onBlur={() => setEditingTimeSlot(null)} 
                  />
                  </div>
                ) : (
                  <span 
                    onClick={() => !isOccupied && !blocked && handleEditTimeSlot(index, time)} 
                    className={`block text-xs ${!isOccupied && !blocked ? 'cursor-pointer hover:bg-accent/30 rounded px-1 py-0.5' : ''}`} 
                    title={!isOccupied && !blocked ? 'Clique para editar' : ''}
                  >
                    {time}
                  </span>
                )}
              </div>
              
              <div 
                onClick={() => {
                  if (isEditing || isSavingTimeSlot) return;
                  if (blocked) {
                    setUnlockConfirmTime(time);
                    return;
                  }
                  if (hasSpanningEvents) {
                    onEventClick(spanningEvents[0]);
                    return;
                  }
                  if (!hasStartingEvents) {
                    onCreateSlot({ date, time });
                  }
                }} 
                className={`flex-1 p-2 min-h-[50px] cursor-pointer ${blocked ? 'bg-destructive/5' : 'bg-card/60'}`}
              >
                {hasStartingEvents ? (
                  <div className="space-y-2">
                    {startingEvents.map((event) => (
                      <div key={event.id} onClick={e => e.stopPropagation()}>
                        <UnifiedEventCard event={event} onClick={onEventClick} variant="daily" />
                      </div>
                    ))}
                  </div>
                ) : hasSpanningEvents ? (
                  <div className="space-y-1.5">
                    {spanningEvents.map((spanningEvent) => {
                      const agendaType = spanningEvent.agendaType || (spanningEvent.originalData as any)?.agendaType || 'session';
                      const dur = spanningEvent.durationMinutes !== undefined ? spanningEvent.durationMinutes : ((spanningEvent.originalData as any)?.durationMinutes ?? 0);
                      const endTime = getEventEndTime(spanningEvent.time, dur);
                      const title = agendaType === 'personal' ? spanningEvent.title : (spanningEvent.client || spanningEvent.title);

                      const getSpanningStyle = () => {
                        if (agendaType === 'personal') {
                          return 'border-l-[3px] border-[hsl(var(--event-personal))] bg-[hsl(var(--event-personal-bg))] text-[hsl(var(--event-personal-fg))] dark:text-[hsl(var(--event-personal-fg))]';
                        }
                        if (agendaType === 'meeting') {
                          return 'border-l-[3px] border-[hsl(var(--event-meeting))] bg-[hsl(var(--event-meeting-bg))] text-[hsl(var(--event-meeting-fg))] dark:text-[hsl(var(--event-meeting-fg))]';
                        }
                        if (spanningEvent.type === 'task') {
                          return 'border-l-[3px] border-[hsl(var(--event-task))] bg-[hsl(var(--event-task-bg))] text-[hsl(var(--event-task-fg))] dark:text-[hsl(var(--event-task-fg))]';
                        }
                        return 'border-l-[3px] border-[hsl(var(--event-confirmed))] bg-[hsl(var(--event-confirmed-bg))] text-[hsl(var(--event-confirmed-fg))] dark:text-[hsl(var(--event-confirmed-fg))]';
                      };

                      return (
                        <div
                          key={spanningEvent.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(spanningEvent);
                          }}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-md transition-all hover:opacity-90 cursor-pointer",
                            getSpanningStyle()
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-xs opacity-60">↳</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                                <span className="opacity-75 font-normal">Em andamento:</span>
                                <span className="truncate">{title}</span>
                              </div>
                              <div className="text-[11px] opacity-75 truncate">
                                Iniciado às {spanningEvent.time} · Término previsto às {endTime}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <TimeSlotOptionsMenu
                              onCreateSession={() => handleCreateAttempt('session', date, time, spanningEvent)}
                              onCreateMeeting={() => handleCreateAttempt('meeting', date, time, spanningEvent)}
                              onCreatePersonalEvent={() => handleCreateAttempt('personal', date, time, spanningEvent)}
                              onCreateTask={() => handleCreateAttempt('task', date, time, spanningEvent)}
                              onAvailable={() => handleMarkAvailable(time)}
                              onBlock={() => handleBlockSlot(time)}
                              onRemove={() => handleRemoveTimeSlot(time)}
                              isOccupied={true}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : blocked ? (
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-destructive/15 text-destructive border border-destructive/30">
                      Bloqueado
                    </span>
                    <div onClick={e => e.stopPropagation()}>
                      <TimeSlotOptionsMenu
                        onCreateSession={() => handleCreateAttempt('session', date, time, undefined)}
                        onCreateMeeting={() => handleCreateAttempt('meeting', date, time, undefined)}
                        onCreatePersonalEvent={() => handleCreateAttempt('personal', date, time, undefined)}
                        onCreateTask={() => handleCreateAttempt('task', date, time, undefined)}
                        onAvailable={() => {
                          handleRemoveAvailability(time);
                          if (onOpenAvailability) onOpenAvailability(date, time);
                        }}
                        onBlock={() => {}}
                        onRemove={() => handleRemoveTimeSlot(time)}
                        isBlocked={true}
                        onUnblock={() => handleUnblockSlot(time)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    {(() => {
                      const slot = getAvailabilityForTime(time);
                      return slot ? (
                        <div className="inline-flex items-center gap-2">
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-lunar-text border"
                            style={{ 
                              backgroundColor: slot.color ? `${slot.color}20` : 'hsl(var(--availability) / 0.2)',
                              borderColor: slot.color ? `${slot.color}80` : 'hsl(var(--availability) / 0.5)'
                            }}
                          >
                            {slot.label || 'Disponível'}
                          </span>
                          <button 
                            type="button" 
                            onClick={e => {
                              e.stopPropagation();
                              handleRemoveAvailability(time);
                            }} 
                            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1" 
                            aria-label="Remover disponibilidade" 
                            title="Remover disponibilidade"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remover
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Clique para criar agendamento</span>
                      );
                    })()}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <ConflictIndicator date={date} time={time} />
                      <TimeSlotOptionsMenu
                        onCreateSession={() => handleCreateAttempt('session', date, time, startingEvents[0])}
                        onCreateMeeting={() => handleCreateAttempt('meeting', date, time, startingEvents[0])}
                        onCreatePersonalEvent={() => handleCreateAttempt('personal', date, time, startingEvents[0])}
                        onCreateTask={() => handleCreateAttempt('task', date, time, startingEvents[0])}
                        onAvailable={() => handleMarkAvailable(time)}
                        onBlock={() => handleBlockSlot(time)}
                        onRemove={() => handleRemoveTimeSlot(time)}
                        isOccupied={hasStartingEvents}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AlertDialog para confirmar desbloqueio */}
      <AlertDialog open={!!unlockConfirmTime} onOpenChange={(open) => !open && setUnlockConfirmTime(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desbloquear horário?</AlertDialogTitle>
            <AlertDialogDescription>
              O horário {unlockConfirmTime} está bloqueado. Deseja liberar este horário para agendamentos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => unlockConfirmTime && handleUnblockSlot(unlockConfirmTime)}>
              Desbloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog para conflito de ocupação */}
      <AlertDialog open={!!conflictState} onOpenChange={(open) => !open && setConflictState(null)}>
        <AlertDialogContent className="sm:max-w-[480px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
              <AlertDialogTitle>Horário Ocupado</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-1.5 text-sm leading-relaxed text-left">
              O horário das <span className="font-semibold text-foreground">{conflictState?.time}</span> já está ocupado pela sessão de{' '}
              <strong className="text-foreground font-semibold">
                {conflictState?.occupiedByEvent?.client || conflictState?.occupiedByEvent?.title || 'evento em andamento'}
              </strong>. Escolha como deseja prosseguir:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2.5 py-1">
            <button
              type="button"
              onClick={handleLiberarHorario}
              className="group flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3.5 text-left transition-all hover:border-primary/60 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <div className="mt-0.5 rounded-md bg-primary/15 p-1.5 text-primary shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">Liberar horário</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase tracking-wider shrink-0">
                    Recomendado
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Encurta a sessão anterior para terminar às {conflictState?.time}, liberando a agenda para o novo agendamento.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (conflictState) {
                  handleProceedCreate(conflictState.actionType, conflictState.date, conflictState.time);
                  setConflictState(null);
                }
              }}
              className="group flex items-start gap-3 rounded-lg border border-border/50 bg-card/60 p-3.5 text-left transition-all hover:border-border hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <div className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground group-hover:text-foreground shrink-0">
                <Layers className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground block">
                  Agendar simultaneamente (Sobrepor)
                </span>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Mantém a sessão atual inalterada e cria um novo agendamento simultâneo no mesmo horário (overbooking).
                </p>
              </div>
            </button>
          </div>

          <AlertDialogFooter className="pt-2 sm:justify-end">
            <AlertDialogCancel
              onClick={() => setConflictState(null)}
              className="w-full sm:w-auto text-xs h-9 mt-0"
            >
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}