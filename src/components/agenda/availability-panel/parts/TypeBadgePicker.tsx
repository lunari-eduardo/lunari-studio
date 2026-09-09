import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tag, Plus } from 'lucide-react';
import type { AvailabilityType } from '@/types/availability';

export function TypeBadgePicker({ panel }: { panel: any }) {
  const { availabilityTypes, selectedTypeId, setSelectedTypeId, isLoadingTypes, goToTiposTab } = panel;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Tipo de Disponibilidade</Label>
      </div>
      {isLoadingTypes ? (
        <div className="text-sm text-muted-foreground animate-pulse">Carregando tipos...</div>
      ) : availabilityTypes.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhum tipo criado.{' '}
          {goToTiposTab && (
            <button
              type="button"
              onClick={goToTiposTab}
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              Criar tipo agora
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {availabilityTypes.map((t: AvailabilityType) => {
            const isSelected = selectedTypeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTypeId(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                  isSelected
                    ? "border-transparent ring-2 ring-offset-1 ring-offset-background"
                    : "bg-background hover:bg-muted"
                )}
                style={{
                  backgroundColor: isSelected ? t.color : undefined,
                  color: isSelected ? '#fff' : t.color,
                  borderColor: isSelected ? t.color : t.color + '40',
                  '--tw-ring-color': t.color
                } as any}
              >
                <Tag className="w-3 h-3" />
                {t.name}
              </button>
            );
          })}

          {goToTiposTab && (
            <button
              type="button"
              onClick={goToTiposTab}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all border border-dashed border-border hover:border-primary/60 text-muted-foreground hover:text-foreground bg-background hover:bg-muted/60"
              title="Criar novo tipo de disponibilidade"
            >
              <Plus className="w-3 h-3" />
              <span>Criar Novo</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
