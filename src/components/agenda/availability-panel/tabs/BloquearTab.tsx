import { Button } from '@/components/ui/button';
import { PeriodPicker } from '../parts/PeriodPicker';
import { TimeSlotList } from '../parts/TimeSlotList';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function BloquearTab({ panel }: { panel: any }) {
  const { blockMode, setBlockMode, isSaving, handleBloquear, handleRemoveInRange } = panel;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <PeriodPicker panel={panel} />

        <div className="space-y-3">
          <Label>O que bloquear?</Label>
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn("flex-1 rounded-md text-xs h-8", blockMode === 'fullDay' ? 'bg-background shadow-sm' : 'hover:bg-transparent text-muted-foreground')}
              onClick={() => setBlockMode('fullDay')}
            >
              Dia Inteiro
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("flex-1 rounded-md text-xs h-8", blockMode === 'specific' ? 'bg-background shadow-sm' : 'hover:bg-transparent text-muted-foreground')}
              onClick={() => setBlockMode('specific')}
            >
              Horários Específicos
            </Button>
          </div>
        </div>

        {blockMode === 'specific' && <TimeSlotList panel={panel} isBlockMode={true} />}

        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2 mt-6">
          <h4 className="text-sm font-medium text-destructive">Remoção Definitiva</h4>
          <p className="text-xs text-destructive/80">
            Você também pode apagar completamente todas as disponibilidades do período selecionado.
          </p>
          <Button variant="destructive" size="sm" onClick={handleRemoveInRange} disabled={isSaving} className="w-full">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apagar tudo no período
          </Button>
        </div>
      </div>

      <div className="shrink-0 p-4 border-t bg-background flex justify-end">
        <Button onClick={handleBloquear} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Aplicar Bloqueio
        </Button>
      </div>
    </div>
  );
}
