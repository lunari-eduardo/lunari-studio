import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, Image as ImageIcon, GripVertical, Plus, Sparkles, Wand2, AlignLeft, AlignCenter, AlignRight, AlignJustify, Pipette, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
import { BlockField, FieldCtx } from './registry';
import { uploadProposalImage } from './uploadImage';
import { useAiFieldRewrite } from '@/hooks/useProposalAI';
import { DEFAULT_DESIGN_TOKENS, isHexColor } from './design';

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
          <Label className="text-xs text-muted-foreground cursor-pointer select-none" htmlFor={field.key}>
            {field.label}
          </Label>
          <Switch
            id={field.key}
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

    default:
      return null;
  }
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
  const inputId = `img-${field.key}-${Math.random().toString(36).slice(2, 7)}`;

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
