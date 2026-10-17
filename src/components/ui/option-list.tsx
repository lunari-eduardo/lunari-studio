import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '@/lib/utils';

export interface OptionListItem {
  value: string;
  label: string;
  description?: string;
  /** Glifo esquemático pequeno (ex.: Thumbnail de capa). Decorativo: o rótulo carrega o significado. */
  glyph?: React.ComponentType<{ className?: string }>;
  /** Marcação neutra à direita do rótulo (ex.: "Padrão"). */
  tag?: string;
  disabled?: boolean;
}

interface OptionListProps {
  items: OptionListItem[];
  value: string;
  onValueChange: (value: string) => void;
  'aria-label': string;
  className?: string;
}

/**
 * Lista seletora (grupo de rádio) do Design System: uma linha por opção,
 * selecionado em tom neutro (DNA §9.10 — nunca dourado no estado selecionado),
 * hover com borda dourada sutil e foco visível. Setas do teclado navegam.
 */
export function OptionList({ items, value, onValueChange, className, ...aria }: OptionListProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      aria-label={aria['aria-label']}
      // minmax(0,1fr): sem isso a coluna implícita cresce até o texto truncado e estoura no celular.
      className={cn('grid w-full grid-cols-[minmax(0,1fr)] gap-1.5', className)}
    >
      {items.map((item) => {
        const Glyph = item.glyph;
        return (
          <RadioGroupPrimitive.Item
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              'group flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors',
              'hover:border-accent-gold/60 hover:bg-muted/30',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              'data-[state=checked]:border-foreground/70 data-[state=checked]:bg-muted/40',
              'disabled:pointer-events-none disabled:opacity-50'
            )}
          >
            {Glyph && (
              <span
                aria-hidden
                className="flex h-9 w-14 shrink-0 overflow-hidden rounded-md border border-border/70 text-foreground/70"
              >
                <Glyph className="h-full w-full" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
                {item.tag && (
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
                    {item.tag}
                  </span>
                )}
              </span>
              {item.description && (
                <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.description}</span>
              )}
            </span>
            <span
              aria-hidden
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border transition-colors group-data-[state=checked]:border-foreground"
            >
              <span className="h-2 w-2 rounded-full bg-foreground opacity-0 transition-opacity group-data-[state=checked]:opacity-100" />
            </span>
          </RadioGroupPrimitive.Item>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}
