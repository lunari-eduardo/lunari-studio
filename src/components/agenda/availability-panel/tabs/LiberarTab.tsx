import { Button } from '@/components/ui/button';
import { PeriodPicker } from '../parts/PeriodPicker';
import { TimeSlotList } from '../parts/TimeSlotList';
import { TypeBadgePicker } from '../parts/TypeBadgePicker';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function LiberarTab({ panel }: { panel: any }) {
  const { liberarMode, setLiberarMode, isSaving, handleLiberar } = panel;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <PeriodPicker panel={panel} />

        <div className="space-y-3">
          <Label>Como deseja adicionar?</Label>
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn("flex-1 rounded-md text-xs h-8", liberarMode === 'create' ? 'bg-background shadow-sm' : 'hover:bg-transparent text-muted-foreground')}
              onClick={() => setLiberarMode('create')}
            >
              Apenas Novos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("flex-1 rounded-md text-xs h-8", liberarMode === 'replace' ? 'bg-background shadow-sm' : 'hover:bg-transparent text-muted-foreground')}
              onClick={() => setLiberarMode('replace')}
            >
              Substituir Existentes
            </Button>
          </div>
        </div>

        <TypeBadgePicker panel={panel} />
        
        <TimeSlotList panel={panel} />
      </div>

      <div className="shrink-0 p-4 border-t bg-background flex justify-end">
        <Button onClick={handleLiberar} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Horários
        </Button>
      </div>
    </div>
  );
}
