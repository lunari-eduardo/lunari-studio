import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ContratoSeedTemplate } from '@/utils/contratoSeedTemplates';

export interface CategoryChip {
  value: string;
  label: string;
}

interface CategoryChipsProps {
  seeds: ContratoSeedTemplate[];
  active: string;
  onChange: (value: string) => void;
  allLabel?: string;
}

export function CategoryChips({
  seeds,
  active,
  onChange,
  allLabel = 'Todos',
}: CategoryChipsProps) {
  const chips = useMemo<CategoryChip[]>(() => {
    const unique = new Set<string>();
    for (const s of seeds) {
      if (s.categoria) unique.add(s.categoria);
    }
    const sorted = Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return [
      { value: 'todas', label: allLabel },
      ...sorted.map((cat) => ({ value: cat, label: cat })),
    ];
  }, [seeds, allLabel]);

  if (chips.length <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label="Categorias da biblioteca de contratos"
      className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]"
    >
      {chips.map((chip) => {
        const isActive = active === chip.value;
        return (
          <button
            key={chip.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(chip.value)}
            className={cn(
              'shrink-0 px-3 h-8 rounded-full text-xs font-medium transition-all duration-150',
              'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-gold))]/40',
              isActive
                ? 'bg-[hsl(var(--accent-gold))]/10 text-[hsl(var(--accent-gold))] border-[hsl(var(--accent-gold))]/30 font-semibold'
                : 'bg-background text-muted-foreground border-border/60 hover:text-foreground hover:border-border hover:bg-muted/40'
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
