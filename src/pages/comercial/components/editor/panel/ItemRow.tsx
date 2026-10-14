import React from 'react';
import { ChevronRight, GripVertical, MoreHorizontal } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FOCUS_RING, ROW_SELECTED } from './panelStyles';

interface ItemRowProps {
  /** Identidade estável (`id` do item): chave do arrasto e da linha. */
  id: string;
  /** Marca da linha para devolver o foco ao voltar do detalhe (`lista:chave`). */
  rowKey: string;
  title: string;
  subtitle?: string;
  thumb?: string;
  /** Última linha aberta. */
  selected?: boolean;
  onOpen: () => void;
  /** Itens do menu ⋯ (DropdownMenuItem…). */
  menu?: React.ReactNode;
}

/** Linha navegável de uma lista rica: arrastar, abrir o detalhe (›) e ações no ⋯. Receita do `HubRow` de Finanças. */
export function ItemRow({ id, rowKey, title, subtitle, thumb, selected, onOpen, menu }: ItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      data-item-row={rowKey}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group/row relative flex items-center gap-1 rounded-lg border pl-1 pr-1 transition-colors',
        selected ? ROW_SELECTED : 'border-border/60 bg-background hover:bg-muted/40',
        isDragging && 'z-10 shadow-[0_4px_30px_rgba(0,0,0,0.08)]'
      )}
    >
      <button
        type="button"
        className={cn('flex h-8 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/50 hover:text-foreground active:cursor-grabbing', FOCUS_RING)}
        title="Arrastar para reordenar"
        aria-label="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={onOpen}
        className={cn('flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-2 text-left', FOCUS_RING)}
      >
        {thumb ? (
          <img src={thumb} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />
        ) : (
          <span aria-hidden className="h-8 w-8 shrink-0 rounded-md bg-muted/60" />
        )}
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm font-medium text-foreground', selected && 'font-semibold')}>{title}</span>
          {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      </button>

      {menu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground/70 hover:bg-muted hover:text-foreground" aria-label={`Ações de ${title}`} title="Ações">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
