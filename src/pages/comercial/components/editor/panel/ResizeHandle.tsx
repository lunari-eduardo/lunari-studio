import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { FOCUS_RING, clampWidth } from './panelStyles';

interface ResizeHandleProps {
  /** Aresta do painel onde a alça fica: 'left' = painel da direita (arrastar para a esquerda o alarga). */
  edge: 'left' | 'right';
  min: number;
  /** Maior largura que ainda deixa espaço ao canvas (lida a cada arrasto). */
  getMax: () => number;
  /** Largura atual do painel, medida no DOM. */
  getWidth: () => number;
  /** Valor atual, só para `aria-valuenow` (ausente = padrão responsivo). */
  value?: number;
  /** `null` volta ao padrão responsivo. */
  onChange: (width: number | null) => void;
  label: string;
}

/**
 * Alça de redimensionar de uma coluna do editor (~30 linhas em vez de `react-resizable-panels`,
 * que só trabalha em %, e aqui a largura é em px). Arrasto, setas (Shift = passo maior),
 * Home/End (mínimo/máximo) e duplo clique ou Enter (volta ao padrão).
 */
export function ResizeHandle({ edge, min, getMax, getWidth, value, onChange, label }: ResizeHandleProps) {
  const drag = useRef<{ startX: number; startW: number; max: number; pending: number; raf: number } | null>(null);
  // Arrastar para a esquerda alarga o painel da direita; para a direita alarga o da esquerda
  const grow = edge === 'left' ? -1 : 1;
  const maxNow = () => Math.max(min, getMax());

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault(); // não inicia seleção de texto
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // o arrasto continua mesmo com o ponteiro sobre o canvas
    } catch {
      /* ponteiro sem captura (ex.: evento sintético): o arrasto segue pelos eventos da própria alça */
    }
    const w = getWidth();
    drag.current = { startX: e.clientX, startW: w, max: maxNow(), pending: w, raf: 0 };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.pending = clampWidth(d.startW + grow * (e.clientX - d.startX), min, d.max);
    // no máximo uma atualização por quadro: o canvas recalcula a escala a cada largura nova
    if (!d.raf) {
      d.raf = requestAnimationFrame(() => {
        d.raf = 0;
        onChange(d.pending);
      });
    }
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    cancelAnimationFrame(d.raf);
    if (d.pending !== d.startW) onChange(d.pending);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 48 : 16;
    const move = (delta: number) => {
      e.preventDefault();
      onChange(clampWidth(getWidth() + delta, min, maxNow()));
    };
    if (e.key === 'ArrowRight') move(grow * step);
    else if (e.key === 'ArrowLeft') move(-grow * step);
    else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(maxNow());
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onChange(null);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`${label} (setas ajustam; Enter restaura o padrão)`}
      aria-valuemin={min}
      aria-valuemax={maxNow()}
      aria-valuenow={value}
      tabIndex={0}
      title="Arraste para redimensionar · duplo clique restaura"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onDoubleClick={() => onChange(null)}
      onKeyDown={onKeyDown}
      className={cn(
        'group/handle absolute inset-y-0 z-20 w-1.5 cursor-col-resize touch-none select-none',
        edge === 'left' ? '-left-[3px]' : '-right-[3px]',
        FOCUS_RING
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover/handle:bg-primary/40 group-active/handle:bg-primary/60"
      />
    </div>
  );
}
