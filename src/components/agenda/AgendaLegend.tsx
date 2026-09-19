import React from 'react';
import { cn } from '@/lib/utils';

interface AgendaLegendProps {
  className?: string;
  compact?: boolean;
}

export function AgendaLegend({ className, compact = false }: AgendaLegendProps) {
  const items = [
    { label: 'Sessão', color: 'hsl(var(--event-confirmed))' },
    { label: 'Reunião', color: 'hsl(var(--event-meeting))' },
    { label: 'Pessoal', color: 'hsl(var(--event-personal))' },
    { label: 'Tarefa', color: 'hsl(var(--event-task))' },
    { label: 'Disponível', color: 'hsl(var(--event-available))' },
    { label: 'Bloqueado', color: 'hsl(var(--event-blocked))' },
  ];

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]',
        compact ? '' : 'py-1',
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
