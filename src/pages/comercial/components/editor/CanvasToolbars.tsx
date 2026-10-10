import React from 'react';
import { ArrowDown, ArrowUp, Copy, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { BlockData } from '@/hooks/useMaterialEditor';
import { getBlockDef, type FieldCtx } from '../../blocks/registry';
import { BackgroundSwatches, backgroundSwatchColor } from '../../blocks/FieldEditor';
import { DEFAULT_DESIGN_TOKENS } from '../../blocks/design';

type Palette = typeof DEFAULT_DESIGN_TOKENS.colors;
type LayoutOption = { value: string; label: string; description?: string };

/**
 * Escolha de composição da seção: variantes do bloco ou, sem variantes, o select
 * "layout"/"style" do registry (galeria, composição editorial, divisor).
 */
export function layoutChoice(block: BlockData): { path: string; value?: string; options: LayoutOption[] } | null {
  const def = getBlockDef(block.type);
  if (!def) return null;
  if (def.variants?.length) {
    return { path: 'props.variant', value: block.props?.variant ?? def.defaultVariant, options: def.variants };
  }
  const field = def.layoutFields?.find((f) => f.kind === 'select' && (f.key === 'layout' || f.key === 'style'));
  if (!field?.options) return null;
  return { path: `props.${field.key}`, value: block.props?.[field.key] ?? field.options[0]?.value, options: field.options };
}

/** Cartões de composição (inspector e barra do canvas). */
export function VariantPicker({
  options,
  value,
  onChange,
  className,
}: {
  options: LayoutOption[];
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)} role="radiogroup" aria-label="Composição da seção">
      {options.map((v) => (
        <button
          key={v.value}
          type="button"
          role="radio"
          aria-checked={value === v.value}
          onClick={() => onChange(v.value)}
          className={cn(
            'flex flex-col items-start gap-0.5 rounded-xl border p-2.5 text-left transition-colors',
            value === v.value
              ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/30'
              : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
          )}
        >
          <span className="text-xs font-medium leading-tight">{v.label}</span>
          {v.description && <span className="text-[10px] leading-tight opacity-70 line-clamp-2">{v.description}</span>}
        </button>
      ))}
    </div>
  );
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

function ToolButton({ label, onClick, disabled, danger, children }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors disabled:pointer-events-none disabled:opacity-30',
        danger ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

export interface SectionToolbarProps {
  block: BlockData;
  index: number;
  count: number;
  palette: Palette;
  /** Escala do canvas (zoom do editor): a barra compensa para manter o tamanho real. */
  uiScale?: number;
  onSetPath: (path: string, value: any) => void;
  onMove: (direction: 'up' | 'down') => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

// ============================================================
// BARRA DA SEÇÃO SELECIONADA (canvas)
// Caminho de 1 clique para composição e fundo, além de mover,
// duplicar e remover. Fica grudada no topo da seção ao rolar.
// ============================================================
export function SectionToolbar({ block, index, count, palette, uiScale = 1, onSetPath, onMove, onDuplicate, onRemove }: SectionToolbarProps) {
  const def = getBlockDef(block.type);
  const layout = layoutChoice(block);
  const ctx: FieldCtx = { content: block.content ?? {}, props: { ...(block.props ?? {}), variant: block.props?.variant ?? def?.defaultVariant } };
  const bgField = def?.layoutFields?.find((f) => f.key === 'background' && (!f.showIf || f.showIf(ctx)));
  const bgColor = backgroundSwatchColor(block.props?.background, palette);
  const layoutLabel = layout?.options.find((o) => o.value === layout.value)?.label;

  return (
    <div className="pointer-events-none sticky top-3 z-30 h-0" onClick={stop} onDoubleClick={stop}>
      <div
        className="pointer-events-auto absolute right-3 top-0 flex items-center gap-0.5 rounded-xl border border-border/70 bg-background/95 p-1 text-foreground shadow-[0_4px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm"
        style={uiScale !== 1 ? { zoom: 1 / uiScale } : undefined}
      >
        {layout && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-7 max-w-[10rem] items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-foreground hover:bg-muted"
                title="Composição da seção"
              >
                <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{layoutLabel ?? 'Composição'}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 rounded-xl p-3" onClick={stop}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Composição</p>
              <VariantPicker options={layout.options} value={layout.value} onChange={(v) => onSetPath(layout.path, v)} />
            </PopoverContent>
          </Popover>
        )}

        {bgField && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-foreground hover:bg-muted"
                title="Fundo da seção"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-black/15"
                  style={{ backgroundColor: bgColor ?? 'transparent' }}
                />
                Fundo
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto rounded-xl p-3" onClick={stop}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fundo da seção</p>
              <BackgroundSwatches
                value={block.props?.background}
                onChange={(v) => onSetPath('props.background', v)}
                options={bgField.options ?? []}
                palette={palette}
              />
            </PopoverContent>
          </Popover>
        )}

        {(layout || bgField) && <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />}

        <ToolButton label="Mover para cima" onClick={() => onMove('up')} disabled={index === 0}>
          <ArrowUp className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton label="Mover para baixo" onClick={() => onMove('down')} disabled={index === count - 1}>
          <ArrowDown className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton label="Duplicar seção" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton label="Remover seção (Ctrl+Z desfaz)" onClick={onRemove} danger>
          <Trash2 className="h-3.5 w-3.5" />
        </ToolButton>
      </div>
    </div>
  );
}

/** "+" na junção entre seções: abre a biblioteca já com a posição. Na última seção fica por dentro (o documento recorta a borda). */
export function InsertSectionButton({ onClick, uiScale = 1, last }: { onClick: () => void; uiScale?: number; last?: boolean }) {
  return (
    <div className={cn('pointer-events-none absolute inset-x-0 z-30 flex justify-center', last ? 'bottom-3' : '-bottom-3.5')}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        title="Adicionar seção aqui"
        aria-label="Adicionar seção aqui"
        className="pointer-events-auto flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-[11px] font-medium text-foreground opacity-0 shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-opacity hover:bg-muted focus-visible:opacity-100 group-hover:opacity-100"
        style={uiScale !== 1 ? { zoom: 1 / uiScale } : undefined}
      >
        <Plus className="h-3.5 w-3.5" /> Seção
      </button>
    </div>
  );
}
