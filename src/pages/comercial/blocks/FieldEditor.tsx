import React, { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, Image as ImageIcon, GripVertical, Plus, Sparkles, Wand2, AlignLeft, AlignCenter, AlignRight, AlignJustify, Pipette, ChevronDown, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BlockField, FieldCtx, fillGallerySlots } from './registry';
import { uploadProposalImage, uploadMultipleProposalImages } from './uploadImage';
import { useAiFieldRewrite } from '@/hooks/useProposalAI';
import { DEFAULT_DESIGN_TOKENS, isHexColor } from './design';
import { ICON_GROUPS, ICON_NONE, PROPOSAL_ICONS, suggestIcon } from './icons';

type Palette = typeof DEFAULT_DESIGN_TOKENS.colors;

interface FieldEditorProps {
  field: BlockField;
  value: any;
  onChange: (value: any) => void;
  /** Contexto para a IA ajudar neste campo */
  aiContext?: {
    blockType: string;
    materialTitle?: string;
    sessionType?: string;
    tone?: string;
  };
  /** Sufixo de unicidade para o estado de loading da IA (itens de lista) */
  aiKeySuffix?: string;
  /** Estado da seção: aplica `showIf` aos subcampos de listas */
  ctx?: FieldCtx;
  /** Cores do tema atual (amostras de fundo) */
  palette?: Palette;
  /** Item da lista que contém o campo (iconlist lê os `features` do mesmo item) */
  item?: Record<string, any>;
}

// ============================================================
// FIELD EDITOR — renderiza um campo do schema do registry.
// Todos os formulários do painel de propriedades são gerados
// a partir daqui; adicionar um campo novo = editar o registry.
// ============================================================

const AI_ACTIONS = [
  { key: 'improve', label: 'Melhorar', description: 'Mais fluidez e persuasão' },
  { key: 'rewrite', label: 'Reescrever', description: 'Outra abordagem criativa' },
  { key: 'shorten', label: 'Encurtar', description: 'Direto ao ponto' },
  { key: 'expand', label: 'Ampliar', description: 'Mais detalhes e benefícios' },
] as const;

/** Rótulo + menu de IA (para campos textuais). Sem aiContext, rótulo simples. */
function FieldLabelWithAi({ field, value, onChange, aiContext, aiKeySuffix }: FieldEditorProps & { value: string }) {
  const { rewrite, pendingField } = useAiFieldRewrite();
  const fieldKey = aiContext ? `${aiContext.blockType}.${field.key}${aiKeySuffix ? `.${aiKeySuffix}` : ''}` : field.key;
  const isPending = pendingField === fieldKey;

  if (!aiContext) {
    return <Label className="text-xs text-muted-foreground">{field.label}</Label>;
  }

  const runAi = async (action: string) => {
    if (!value?.trim()) {
      toast.info('Escreva algum texto primeiro para a IA melhorar.');
      return;
    }
    const result = await rewrite({
      action: action as any,
      blockType: aiContext.blockType,
      fieldLabel: field.label,
      currentText: value,
      context: { materialTitle: aiContext.materialTitle, sessionType: aiContext.sessionType, tone: aiContext.tone },
      fieldKey,
    });
    if (result) {
      onChange(result);
      toast.success('Texto atualizado pela IA. Revise antes de publicar!');
    }
  };

  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Discreto: aparece ao passar o mouse ou focar o campo (group/field) */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 px-2 text-[10px] gap-1 text-primary hover:text-primary transition-opacity',
              'opacity-0 group-hover/field:opacity-100 group-focus-within/field:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100',
              isPending && 'opacity-100'
            )}
            disabled={isPending}
            title="Ajuda de texto com IA"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            IA
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {AI_ACTIONS.map((a) => (
            <DropdownMenuItem key={a.key} onClick={() => runAi(a.key)} className="gap-2 py-2 cursor-pointer">
              <Wand2 className="h-3.5 w-3.5 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm">{a.label}</span>
                <span className="text-[10px] text-muted-foreground">{a.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FieldEditor(props: FieldEditorProps) {
  const { field, value, onChange } = props;
  const uid = useId();

  switch (field.kind) {
    case 'text':
      return (
        <div className="group/field space-y-2">
          <FieldLabelWithAi {...props} value={value ?? ''} />
          <Input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      );

    case 'textarea':
      return (
        <div className="group/field space-y-2">
          <FieldLabelWithAi {...props} value={value ?? ''} />
          <Textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="min-h-[80px]"
          />
        </div>
      );

    case 'url':
      return (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Input
            type="url"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      );

    case 'select':
      return (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Select value={value ?? field.options?.[0]?.value ?? ''} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between py-1.5 gap-2">
          <Label className="text-xs text-muted-foreground cursor-pointer select-none" htmlFor={uid}>
            {field.label}
          </Label>
          <Switch
            id={uid}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      );

    case 'color':
      return (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-input p-0.5 bg-background"
            />
            <Input
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="h-8 font-mono text-xs"
            />
          </div>
        </div>
      );

    case 'stringlist':
      return (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Textarea
            value={Array.isArray(value) ? value.join('\n') : ''}
            onChange={(e) => onChange(e.target.value.split('\n'))}
            placeholder={field.placeholder}
            className="min-h-[100px] font-mono text-xs"
          />
        </div>
      );

    case 'swatch':
      return (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <BackgroundSwatches
            value={value}
            onChange={onChange}
            options={field.options ?? []}
            palette={props.palette ?? DEFAULT_DESIGN_TOKENS.colors}
          />
        </div>
      );

    case 'align':
      return <AlignField field={field} value={value} onChange={onChange} />;

    case 'image':
      return <ImageField field={field} value={value} onChange={onChange} />;

    case 'list':
      return <ListField field={field} value={value} onChange={onChange} ctx={props.ctx} />;

    case 'gallery':
      return <GalleryField field={field} value={value} onChange={onChange} />;

    case 'icon':
      return (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <IconPicker
            value={value}
            onChange={onChange}
            {...(field.autoIcon && { defaultLabel: 'Automático', autoKey: field.autoIcon(props.item) })}
          />
        </div>
      );

    case 'iconlist':
      return <IconListField field={field} value={value} onChange={onChange} item={props.item} />;

    default:
      return null;
  }
}

/** Um ícone por item incluso (mesma posição de `features`); vazio = automático pelo texto. */
function IconListField({ field, value, onChange, item }: FieldEditorProps) {
  const features: string[] = Array.isArray(item?.features) ? item.features : [];
  const icons: string[] = Array.isArray(value) ? value : [];
  const rows = features.map((text, i) => ({ text, i })).filter(({ text }) => text?.trim());
  const setAt = (i: number, v: string) => {
    const next = Array.from({ length: Math.max(icons.length, i + 1) }, (_, k) => icons[k] ?? '');
    next[i] = v;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Escreva os itens inclusos acima para escolher os ícones.</p>
      ) : (
        rows.map(({ text, i }) => (
          <div key={i} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={text}>
              {text}
            </span>
            <div className="w-[9.5rem] shrink-0">
              <IconPicker value={icons[i]} onChange={(v) => setAt(i, v)} defaultLabel="Automático" autoKey={suggestIcon(text)} />
            </div>
          </div>
        ))
      )}
      <p className="text-[11px] leading-snug text-muted-foreground">"Automático" escolhe pelo texto do item.</p>
    </div>
  );
}

/** Catálogo visual de ícones: o fotógrafo escolhe pela forma, nunca digitando nomes técnicos. */
function IconPicker({
  value,
  onChange,
  defaultLabel = 'Padrão da seção',
  autoKey,
}: {
  value: unknown;
  onChange: (v: string) => void;
  defaultLabel?: string;
  /** Ícone que o "padrão" mostra (ex.: sugerido pelo texto). */
  autoKey?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const current = typeof value === 'string' ? value : '';
  const def = PROPOSAL_ICONS[current] ?? (!current && autoKey ? PROPOSAL_ICONS[autoKey] : undefined);
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  const option = (v: string, label: string) => (
    <button
      type="button"
      onClick={() => pick(v)}
      aria-pressed={current === v}
      className={cn(
        'h-8 rounded-lg border px-2 text-[11px] font-medium transition-colors',
        current === v ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-muted'
      )}
    >
      {label}
    </button>
  );

  const triggerLabel = current === ICON_NONE ? 'Sem ícone' : !current ? defaultLabel : def?.label ?? defaultLabel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-xs text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {def && current !== ICON_NONE ? (
            <def.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          ) : (
            <span className="h-4 w-4 shrink-0 rounded-full border border-dashed border-muted-foreground/50" />
          )}
          <span className="flex-1 truncate text-left">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[17.5rem] rounded-xl p-3">
        <div className="mb-3 grid grid-cols-2 gap-1.5">
          {option('', defaultLabel)}
          {option(ICON_NONE, 'Sem ícone')}
        </div>
        <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
          {ICON_GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
              <div className="grid grid-cols-6 gap-1">
                {Object.entries(PROPOSAL_ICONS)
                  .filter(([, d]) => d.group === group)
                  .map(([key, d]) => (
                    <button
                      key={key}
                      type="button"
                      title={d.label}
                      aria-label={d.label}
                      aria-pressed={current === key}
                      onClick={() => pick(key)}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                        current === key ? 'border-primary bg-primary/10 text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <d.icon className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Esquerda', icon: AlignLeft },
  { value: 'center', label: 'Centro', icon: AlignCenter },
  { value: 'right', label: 'Direita', icon: AlignRight },
  { value: 'justify', label: 'Justificado', icon: AlignJustify },
];

/** Controle segmentado de alinhamento de texto. */
function AlignField({ field, value, onChange }: { field: BlockField; value: any; onChange: (v: any) => void }) {
  const current = typeof value === 'string' && value ? value : 'left';
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      <div className="grid grid-cols-4 gap-1 rounded-lg border border-input p-1 bg-background">
        {ALIGN_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            aria-label={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex h-8 items-center justify-center rounded-md transition-colors',
              current === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <opt.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ImageField({ field, value, onChange }: FieldEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputId = useId();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadProposalImage(file);
      onChange(url);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar imagem para a nuvem. Verifique sua conexão e tente novamente.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      <div className="flex gap-3 items-center">
        <div className="h-20 w-32 shrink-0 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt={field.label} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <Label htmlFor={inputId} className="cursor-pointer">
            <div className="flex h-8 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
              {value ? 'Trocar imagem' : 'Enviar imagem'}
            </div>
            <input
              type="file"
              id={inputId}
              className="hidden"
              accept="image/*"
              onChange={handleUpload}
              disabled={isUploading}
            />
          </Label>
          {value ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-8 text-destructive hover:bg-destructive/10"
              onClick={() => onChange('')}
            >
              Remover
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Fundo da seção → cor do tema que a amostra mostra
const SWATCH_COLOR: Record<string, keyof Palette> = {
  white: 'white',
  cream: 'cream',
  linen: 'linen',
  stone: 'stone',
  taupe: 'taupe',
  dark: 'ink',
};

/** Cor real de um fundo de seção (slot do tema ou cor livre); ausente = undefined. */
export function backgroundSwatchColor(value: unknown, palette: Palette): string | undefined {
  if (isHexColor(value)) return value;
  const key = typeof value === 'string' ? SWATCH_COLOR[value] : undefined;
  return key ? palette[key] : undefined;
}

/** Amostras da paleta do tema + cor livre. Exportado para a barra da seção no canvas. */
export function BackgroundSwatches({
  value,
  onChange,
  options,
  palette,
}: {
  value: any;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  palette: Palette;
}) {
  const custom = isHexColor(value) ? value : null;
  const [hexDraft, setHexDraft] = useState(custom ?? '');
  useEffect(() => setHexDraft(custom ?? ''), [custom]);
  const selectedLabel = custom ? 'Personalizada' : options.find((o) => o.value === value)?.label;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Fundo da seção">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            aria-label={o.label}
            title={o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-7 w-7 rounded-full border border-black/10 transition-transform',
              value === o.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-110'
            )}
            style={{ backgroundColor: palette[SWATCH_COLOR[o.value] ?? 'white'] }}
          />
        ))}
        {/* Cor livre: seletor nativo do sistema */}
        <label
          title="Cor personalizada"
          className={cn(
            'relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-black/10 transition-transform',
            custom ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-110'
          )}
          style={{ background: custom ?? 'conic-gradient(from 90deg, #E8C9B5, #D4AF37, #8C7B6E, #3F4A5A, #9FB3A5, #E8C9B5)' }}
        >
          {!custom && <Pipette className="h-3 w-3 text-white drop-shadow" />}
          <input
            type="color"
            aria-label="Cor personalizada"
            value={custom ?? '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{selectedLabel ?? 'Padrão da seção'}</span>
        {custom && (
          <Input
            value={hexDraft}
            onChange={(e) => {
              setHexDraft(e.target.value);
              if (isHexColor(e.target.value)) onChange(e.target.value);
            }}
            className="h-7 w-24 font-mono text-[11px]"
            aria-label="Código da cor"
          />
        )}
      </div>
    </div>
  );
}

function SortableThumb({ id, src, onRemove }: { id: string; src?: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group/thumb relative aspect-square cursor-grab touch-none overflow-hidden rounded-lg border border-border/60 bg-muted/40 active:cursor-grabbing',
        isDragging && 'z-10 shadow-[0_4px_30px_rgba(0,0,0,0.12)]'
      )}
      title="Arraste para reordenar"
      // O arrasto nativo de imagem do navegador roubaria o gesto do dnd-kit
      onDragStart={(e) => e.preventDefault()}
      {...attributes}
      {...listeners}
    >
      {src ? (
        <img src={src} alt="" className="pointer-events-none h-full w-full object-cover" draggable={false} />
      ) : (
        // Espaço do modelo ainda sem foto: a próxima foto enviada entra aqui
        <span className="flex h-full w-full items-center justify-center border-2 border-dashed border-border text-muted-foreground/50">
          <ImageIcon className="h-4 w-4" />
        </span>
      )}
      <button
        type="button"
        // Isola do arrastar: ponteiro e teclado (Enter/Espaço) aqui removem, não iniciam o arrasto
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        aria-label="Remover foto"
        title="Remover foto"
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover/thumb:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/** Fotos da galeria: envio em lote (clique ou arrastar arquivos) + miniaturas reordenáveis. */
function GalleryField({ field, value, onChange }: FieldEditorProps) {
  const images: Record<string, any>[] = Array.isArray(value) ? value : [];
  // O envio leva segundos: ao terminar, as fotos entram na galeria atual (não na de quando começou)
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const ids = images.map((img, idx) => String(img.id ?? `img-${idx}`));
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // Único por instância: o painel existe 2x no celular (coluna + gaveta) e o rótulo acionaria o input errado
  const inputId = useId();
  const filled = images.filter((img) => img?.image_ref).length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length || progress) return;
    try {
      const { urls, failed } = await uploadMultipleProposalImages(list, (done, total) => setProgress({ done, total }));
      if (urls.length) onChange(fillGallerySlots(imagesRef.current, urls));
      if (failed) toast.error(`${failed} foto(s) não foram enviadas. Verifique a conexão e tente de novo.`);
    } finally {
      setProgress(null);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(images, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(e.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-5 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30',
          progress && 'pointer-events-none'
        )}
      >
        {progress ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              Enviando {progress.done} de {progress.total}…
            </span>
          </>
        ) : (
          <>
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Arraste várias fotos ou clique para escolher</span>
            <span className="text-[11px] text-muted-foreground">JPG, PNG ou WebP · otimizadas automaticamente</span>
          </>
        )}
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          disabled={!!progress}
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {images.length > 0 && (
        <>
          <p className="text-[11px] text-muted-foreground">
            {filled} {filled === 1 ? 'foto' : 'fotos'}
            {images.length > filled && ` · ${images.length - filled} ${images.length - filled === 1 ? 'espaço vazio' : 'espaços vazios'}`}
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-4 gap-1.5">
                {images.map((img, idx) => (
                  <SortableThumb
                    key={ids[idx]}
                    id={ids[idx]}
                    src={img?.image_ref || undefined}
                    onRemove={() => onChange(images.filter((_, i) => i !== idx))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Arraste para reordenar. Tamanho e proporção de cada foto: clique nela na arte.
          </p>
        </>
      )}
    </div>
  );
}

/** Resumo de um item fechado: primeiros textos preenchidos ("Duração · 2 a 8 horas"). */
function itemSummary(item: Record<string, any>, fields: BlockField[]): string {
  return fields
    .filter((f) => f.kind === 'text' || f.kind === 'textarea')
    .map((f) => item[f.key])
    .filter((v): v is string => typeof v === 'string' && !!v.trim())
    .slice(0, 2)
    .join(' · ');
}

function SortableListItem({
  id,
  title,
  thumb,
  onRemove,
  children,
}: {
  id: string;
  title: string;
  thumb?: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <AccordionItem
      ref={setNodeRef}
      value={id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group/item rounded-xl border border-border/60 bg-background',
        isDragging && 'relative z-10 shadow-[0_4px_30px_rgba(0,0,0,0.08)]'
      )}
    >
      <div className="flex items-center gap-1 pl-1 pr-1">
        <button
          type="button"
          className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
          title="Arrastar para reordenar"
          aria-label="Arrastar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        {thumb && <img src={thumb} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />}
        <AccordionPrimitive.Header className="flex min-w-0 flex-1">
          <AccordionPrimitive.Trigger className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2.5 text-left text-xs font-medium [&[data-state=open]>svg]:rotate-180">
            <span className="truncate">{title}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200" />
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/item:opacity-100 focus-visible:opacity-100"
          onClick={onRemove}
          title="Remover"
          aria-label="Remover"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <AccordionContent className="space-y-3 px-3 pb-3 pt-1">{children}</AccordionContent>
    </AccordionItem>
  );
}

/** Lista de itens: um aberto por vez, resumo no cabeçalho, arrastar para reordenar. */
function ListField({ field, value, onChange, ctx }: FieldEditorProps) {
  const items: Record<string, any>[] = Array.isArray(value) ? value : [];
  const itemFields = (field.itemFields ?? []).filter((sub) => !sub.showIf || !ctx || sub.showIf(ctx));
  const ids = items.map((item, idx) => String(item.id ?? `item-${idx}`));
  const [openId, setOpenId] = useState('');
  const imageKey = itemFields.find((f) => f.kind === 'image')?.key;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateItem = (idx: number, itemKey: string, itemValue: any) => {
    const next = [...items];
    next[idx] = { ...next[idx], [itemKey]: itemValue };
    onChange(next);
  };

  const addItem = () => {
    const item = field.itemFactory ? field.itemFactory() : {};
    onChange([...items, item]);
    setOpenId(String(item.id ?? `item-${items.length}`)); // abre o item novo
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(items, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        {/* Sem rótulo quando o cabeçalho do grupo já nomeia a lista */}
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <Button variant="outline" size="sm" className="h-7 rounded-lg text-[11px]" onClick={addItem}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          Nenhum item ainda.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <Accordion type="single" collapsible value={openId} onValueChange={setOpenId} className="space-y-1.5">
              {items.map((item, idx) => (
                <SortableListItem
                  key={ids[idx]}
                  id={ids[idx]}
                  title={itemSummary(item, itemFields) || `${field.itemLabel ?? 'Item'} ${idx + 1}`}
                  thumb={imageKey && typeof item[imageKey] === 'string' && item[imageKey] ? item[imageKey] : undefined}
                  onRemove={() => onChange(items.filter((_, i) => i !== idx))}
                >
                  {itemFields.map((sub) => (
                    <FieldEditor
                      key={sub.key}
                      field={sub}
                      value={item[sub.key]}
                      item={item}
                      onChange={(v) => updateItem(idx, sub.key, v)}
                    />
                  ))}
                </SortableListItem>
              ))}
            </Accordion>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
