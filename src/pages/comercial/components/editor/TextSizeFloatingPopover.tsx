import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Limites de tamanho por campo de texto.
 * Cada chave corresponde ao campo na interface do conteúdo da capa.
 */
const FIELD_BOUNDS: Record<string, { min: number; max: number; default: number; label: string }> = {
  eyebrow:           { min: 9,  max: 16,  default: 11, label: 'Rótulo Superior' },
  title:             { min: 28, max: 72,  default: 44, label: 'Título Principal' },
  title_italic:      { min: 24, max: 64,  default: 36, label: 'Título Itálico' },
  subtitle:          { min: 14, max: 28,  default: 18, label: 'Subtítulo' },
  photographer_name: { min: 9,  max: 18,  default: 11, label: 'Assinatura' },
  btnText:           { min: 11, max: 18,  default: 14, label: 'Botão' },
};

export interface TextSizePopoverProps {
  /** Campo selecionado no canvas (ex: 'title', 'eyebrow'). */
  fieldKey: string;
  /** Tamanho atual em px (do block.props.typography). */
  currentSize?: number;
  /** Callback ao mudar o tamanho (debounced pelo parent). */
  onChange: (fieldKey: string, size: number) => void;
  /** Elemento âncora para posicionamento. */
  anchorEl: HTMLElement | null;
  /** Fecha o popover. */
  onClose: () => void;
}

export function TextSizeFloatingPopover({
  fieldKey,
  currentSize,
  onChange,
  anchorEl,
  onClose,
}: TextSizePopoverProps) {
  const bounds = FIELD_BOUNDS[fieldKey] ?? { min: 10, max: 72, default: 16, label: fieldKey };
  const [size, setSize] = useState(currentSize ?? bounds.default);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Posicionamento do popover relativo ao âncora (com suporte a scroll e resize)
  useEffect(() => {
    if (!anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      const popoverHeight = 52; // altura estimada do popover
      let top = rect.top - popoverHeight - 8;
      let left = rect.left + rect.width / 2;

      // Se não cabe acima, posicionar abaixo
      if (top < 8) {
        top = rect.bottom + 8;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorEl]);

  // Sync com prop externa
  useEffect(() => {
    setSize(currentSize ?? bounds.default);
  }, [currentSize, bounds.default]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorEl]);

  const commit = useCallback(
    (newSize: number) => {
      const clamped = Math.max(bounds.min, Math.min(bounds.max, newSize));
      setSize(clamped);
      onChange(fieldKey, clamped);
    },
    [fieldKey, onChange, bounds]
  );

  if (!anchorEl) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed z-[999] flex items-center gap-2 rounded-xl bg-neutral-900/95 backdrop-blur-md px-3 py-2 shadow-xl border border-white/10 select-none"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Label */}
      <span className="text-[10px] font-medium text-white/60 tracking-wide uppercase whitespace-nowrap mr-1">
        {bounds.label}
      </span>

      {/* Botão - */}
      <button
        type="button"
        className="h-6 w-6 flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        onClick={() => commit(size - 1)}
        disabled={size <= bounds.min}
      >
        <Minus className="h-3 w-3" />
      </button>

      {/* Slider */}
      <input
        type="range"
        min={bounds.min}
        max={bounds.max}
        step={1}
        value={size}
        onChange={(e) => commit(Number(e.target.value))}
        className="w-20 h-1 appearance-none bg-white/20 rounded-full accent-white cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
      />

      {/* Botão + */}
      <button
        type="button"
        className="h-6 w-6 flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        onClick={() => commit(size + 1)}
        disabled={size >= bounds.max}
      >
        <Plus className="h-3 w-3" />
      </button>

      {/* Valor numérico */}
      <span className="text-xs font-mono text-white/90 w-8 text-center tabular-nums">
        {size}
      </span>

      {/* Reset */}
      <button
        type="button"
        className={cn(
          "h-6 w-6 flex items-center justify-center rounded-md transition-colors",
          size !== bounds.default
            ? 'text-white/70 hover:text-white hover:bg-white/10'
            : 'text-white/20 cursor-default'
        )}
        onClick={() => size !== bounds.default && commit(bounds.default)}
        title="Restaurar padrão"
      >
        <RotateCcw className="h-3 w-3" />
      </button>
    </div>
  );
}

export { FIELD_BOUNDS };
