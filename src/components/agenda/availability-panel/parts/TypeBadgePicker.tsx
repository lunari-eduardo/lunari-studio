import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tag } from 'lucide-react';
import type { AvailabilityType } from '@/types/availability';

export function TypeBadgePicker({ panel }: { panel: any }) {
  const { availabilityTypes, selectedTypeId, setSelectedTypeId, isLoadingTypes } = panel;

  return (
    <div className="space-y-3">
      <Label>Tipo de Disponibilidade</Label>
      {isLoadingTypes ? (
        <div className="text-sm text-muted-foreground animate-pulse">Carregando tipos...</div>
      ) : availabilityTypes.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum tipo criado. Vá na aba "Tipos".</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {availabilityTypes.map((t: AvailabilityType) => {
            const isSelected = selectedTypeId === t.id;
            return (
              <button
                key={t.id}
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
        </div>
      )}
    </div>
  );
}
