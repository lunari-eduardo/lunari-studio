import React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, Copy, LayoutGrid, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { BlockData } from '@/hooks/useMaterialEditor';
import { getBlockDef, GALLERY_SPAN_OPTIONS, IMAGE_RATIO_OPTIONS, type FieldCtx } from '../../blocks/registry';
import { uploadProposalImage } from '../../blocks/uploadImage';
import { BackgroundSwatches, backgroundSwatchColor } from '../../blocks/FieldEditor';
import { DEFAULT_DESIGN_TOKENS } from '../../blocks/design';
import { forCollection, optionsFor, useProposalCollection } from '../../blocks/collections';

type Palette = typeof DEFAULT_DESIGN_TOKENS.colors;
type LayoutOption = { value: string; label: string; description?: string };

/**
 * Escolha de composição da seção: variantes do bloco ou, sem variantes, o select
 * "layout"/"style" do registry (galeria, composição editorial, divisor).
 */
export function layoutChoice(block: BlockData, collection?: string): { path: string; value?: string; options: LayoutOption[] } | null {
  const def = getBlockDef(block.type);
  if (!def) return null;
  if (def.variants?.length) {
    const value = block.props?.variant ?? def.defaultVariant;
    // Proposta de coleção temática: variantes dela; modelo padrão: as padrão (a aplicada nunca some)
    const options = forCollection(def.variants, collection, (v) => v.value === value);
    return { path: 'props.variant', value, options };
  }
  const field = def.layoutFields?.find((f) => f.kind === 'select' && (f.key === 'layout' || f.key === 'style'));
  if (!field?.options) return null;
  const current = block.props?.[field.key] ?? field.options[0]?.value;
  return { path: `props.${field.key}`, value: current, options: optionsFor(field.options, collection, current) };
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
  const layout = layoutChoice(block, useProposalCollection());
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

        <ToolButton label="Mover para cima (Alt+↑)" onClick={() => onMove('up')} disabled={index === 0}>
          <ArrowUp className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton label="Mover para baixo (Alt+↓)" onClick={() => onMove('down')} disabled={index === count - 1}>
          <ArrowDown className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton label="Duplicar seção (Ctrl+D)" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton label="Remover seção (Delete)" onClick={onRemove} danger>
          <Trash2 className="h-3.5 w-3.5" />
        </ToolButton>
      </div>
    </div>
  );
}

// ============================================================
// BARRA DA FOTO (galeria) — clique simples numa foto no canvas
// Trocar · tamanho (grade) ou proporção (mosaico) · mover · remover.
// Portal no body: fora do zoom do canvas, posicionada pela foto.
// ============================================================
export interface GalleryImageToolbarProps {
  anchorEl: HTMLElement;
  /** Disposição da galeria: define quais ajustes existem para a foto. */
  layout: string;
  image: Record<string, any>;
  index: number;
  count: number;
  onSet: (key: string, value: any) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onClose: () => void;
}

const MASONRY_RATIOS = IMAGE_RATIO_OPTIONS.map((o) => ({ ...o, label: o.value === 'auto' ? 'Original' : o.label.replace(/.*\((.*)\)/, '$1') }));

function Segmented({ options, value, onChange, label }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-6 rounded-md px-2 text-[11px] font-medium transition-colors',
            value === o.value ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function GalleryImageToolbar({ anchorEl, layout, image, index, count, onSet, onMove, onRemove, onClose }: GalleryImageToolbarProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const [uploading, setUploading] = React.useState(false);

  // Acompanha a foto (rolagem, redimensionamento e mudança de tamanho na grade)
  React.useLayoutEffect(() => {
    const place = () => {
      if (!anchorEl.isConnected) return onClose();
      const r = anchorEl.getBoundingClientRect();
      const h = ref.current?.offsetHeight ?? 40;
      const top = r.top - h - 10 >= 8 ? r.top - h - 10 : Math.min(r.bottom + 10, window.innerHeight - h - 8);
      const half = (ref.current?.offsetWidth ?? 360) / 2 + 8;
      setPos({ top, left: Math.min(Math.max(r.left + r.width / 2, half), window.innerWidth - half) });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(anchorEl);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [anchorEl, onClose]);

  // Fecha com Esc ou clique fora (a própria foto reabre/mantém)
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchorEl.contains(t)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorEl, onClose]);

  const replace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      onSet('image_ref', await uploadProposalImage(file));
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar imagem. Verifique a conexão e tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  return createPortal(
    <div
      ref={ref}
      role="toolbar"
      aria-label="Ajustes da foto"
      onMouseDown={stop}
      onClick={stop}
      className="fixed z-[999] flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border/70 bg-background/95 p-1 text-foreground shadow-[0_4px_30px_rgba(0,0,0,0.14)] backdrop-blur-sm"
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? 0 }}
    >
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium hover:bg-muted disabled:opacity-60"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5 text-muted-foreground" />}
        Trocar
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={replace} />

      {layout === 'grid' && (
        <Segmented label="Tamanho na grade" options={GALLERY_SPAN_OPTIONS} value={image.span ?? 'normal'} onChange={(v) => onSet('span', v)} />
      )}
      {layout === 'masonry' && (
        <Segmented label="Proporção da foto" options={MASONRY_RATIOS} value={image.ratio ?? 'auto'} onChange={(v) => onSet('ratio', v)} />
      )}

      <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
      <ToolButton label="Mover para trás" onClick={() => onMove(-1)} disabled={index === 0}>
        <ArrowLeft className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton label="Mover para frente" onClick={() => onMove(1)} disabled={index === count - 1}>
        <ArrowRight className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton label="Remover foto (Ctrl+Z desfaz)" onClick={onRemove} danger>
        <Trash2 className="h-3.5 w-3.5" />
      </ToolButton>
    </div>,
    document.body
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
