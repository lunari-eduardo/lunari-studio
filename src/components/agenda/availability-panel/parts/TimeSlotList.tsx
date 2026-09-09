import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X, Clock } from 'lucide-react';
import { TimeInput } from '@/components/ui/time-input';

export function TimeSlotList({ panel, isBlockMode = false }: { panel: any, isBlockMode?: boolean }) {
  const { timeSlots, addTimeSlot, updateTimeSlot, removeTimeSlot } = panel;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Horários</Label>
        <Button variant="ghost" size="sm" onClick={addTimeSlot} className="h-8 px-2 text-xs text-primary">
          <Plus className="w-3 h-3 mr-1" />
          Adicionar
        </Button>
      </div>
      
      {timeSlots.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4 border rounded-md bg-muted/50">
          Nenhum horário adicionado
        </div>
      ) : (
        <div className="space-y-2">
          {timeSlots.map((slot: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <TimeInput
                  value={slot.start}
                  onChange={(v) => updateTimeSlot(idx, 'start', v)}
                  className="pl-9"
                  placeholder="00:00"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeTimeSlot(idx)}
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
