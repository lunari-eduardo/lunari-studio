import React from 'react';
import { Pin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FOCUS_RING, ROW_SELECTED } from './panelStyles';

interface PinnedBarProps {
  label: string;
  context: string;
  thumb?: string;
  /** O item fixado é o que está aberto agora. */
  current: boolean;
  onGo: () => void;
  onUnpin: () => void;
}

/** Barra de 1 linha do item fixado: fora da rolagem, nunca renderiza formulário. Clicar leva ao item. */
export function PinnedBar({ label, context, thumb, current, onGo, onUnpin }: PinnedBarProps) {
  return (
    <div className="shrink-0 border-b border-border/60 bg-background px-3 py-1.5">
      <div className={cn('flex items-center gap-1 rounded-lg border pr-1 transition-colors', current ? ROW_SELECTED : 'border-border/60 hover:bg-muted/40')}>
        <button
          type="button"
          onClick={onGo}
          aria-label={`Ir para o item fixado: ${label}`}
          className={cn('flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pl-2 text-left', FOCUS_RING)}
        >
          {/* Ouro só no glifo (DNA §7/§11) */}
          <Pin aria-hidden className="h-3.5 w-3.5 shrink-0 fill-current text-accent-gold" />
          {thumb && <img src={thumb} alt="" className="h-5 w-5 shrink-0 rounded object-cover" />}
          <span className={cn('min-w-0 truncate text-xs text-foreground', current ? 'font-semibold' : 'font-medium')}>{label}</span>
          <span className="min-w-0 shrink truncate text-xs text-muted-foreground">{context}</span>
        </button>
        <Button variant="ghost" size="icon-sm" className="h-7 w-7 shrink-0 text-muted-foreground/70 hover:bg-muted hover:text-foreground" onClick={onUnpin} aria-label="Desafixar" title="Desafixar">
          <X />
        </Button>
      </div>
    </div>
  );
}
