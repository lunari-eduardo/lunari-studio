/**
 * CategoryChips — linha horizontal de chips de categoria (estilo referência).
 *
 * Usado na aba "Biblioteca Lunari" para filtro rápido por categoria.
 *  • Scroll horizontal em telas pequenas.
 *  • Estado ativo destacado com fundo dourado (paleta Lunari).
 *  • Sem cor extra: usa --accent-gold e tons neutros.
 *  • Sem mock: categorias vêm do banco de templates (`useMemo` sobre lista).
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { FormularioTemplate } from '@/types/formulario';

export interface CategoryChip {
  value: string; // valor usado para filtrar (slug ou nome original)
  label: string;
}

interface CategoryChipsProps {
  /** Lista completa de templates — categorias distintas são derivadas. */
  templates: FormularioTemplate[];
  /** Categoria ativa atual ("todas" = sem filtro). */
  active: string;
  /** Callback ao trocar a categoria. */
  onChange: (value: string) => void;
  /** Label do chip "todos". Default: "Todos". */
  allLabel?: string;
}

export function CategoryChips({
  templates,
  active,
  onChange,
  allLabel = 'Todos',
}: CategoryChipsProps) {
  /** Categorias distintas vindas dos templates do banco — sem mock. */
  const chips = useMemo<CategoryChip[]>(() => {
    const unique = new Set<string>();
    for (const t of templates) {
      if (t.categoria) unique.add(t.categoria);
    }
    // Ordenar alfabeticamente para previsibilidade.
    const sorted = Array.from(unique).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return [
      { value: 'todas', label: allLabel },
      ...sorted.map((cat) => ({ value: cat, label: cat })),
    ];
  }, [templates, allLabel]);

  if (chips.length <= 1) return null; // nada além de "Todos"

  return (
    <div
      role="tablist"
      aria-label="Categorias da biblioteca"
      className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]"
    >
      {chips.map((chip) => {
        const isActive = active === chip.value;
        return (
          <button
            key={chip.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(chip.value)}
            className={cn(
              'shrink-0 px-3 h-8 rounded-full text-xs font-medium transition-all duration-150',
              'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-gold))]/40',
              isActive
                ? 'bg-[hsl(var(--accent-gold))]/10 text-[hsl(var(--accent-gold))] border-[hsl(var(--accent-gold))]/30'
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
