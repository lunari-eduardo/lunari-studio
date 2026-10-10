import React, { useState } from 'react';
import { BlockData } from '@/hooks/useMaterialEditor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Trash2,
  Copy,
  DownloadCloud,
  Loader2,
  Image as ImageIcon,
  MoreVertical,
  MousePointerClick,
  Type,
  Layout,
  Palette,
  List,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useConfigurationContext } from '@/contexts/ConfigurationContext';
import { getBlockDef, getBlockName, getSectionTitle, BlockField, FieldCtx, FieldGroup } from '../../blocks/registry';
import { pacoteToProposalPackage } from '../../blocks/normalization';
import type { Pacote } from '@/types/configuration';
import { FieldEditor } from '../../blocks/FieldEditor';
import { uploadProposalImage } from '../../blocks/uploadImage';
import { DEFAULT_DESIGN_TOKENS, isHexColor, type ProposalDesignTokens } from '../../blocks/design';
import { VariantPicker } from './CanvasToolbars';

export interface PropertiesSidebarProps {
  block: BlockData;
  blockIndex: number;
  onUpdateBlock: (index: number, data: Record<string, any>) => void;
  onRemoveBlock: (index: number) => void;
  onDuplicateBlock?: (index: number) => void;
  /** Tema atual: cores reais nas amostras de fundo */
  designTokens?: ProposalDesignTokens;
  /** Contexto para os botões de ajuda de texto com IA */
  aiContext?: {
    materialTitle?: string;
    sessionType?: string;
    tone?: string;
  };
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

// ============================================================
// INSPECTOR DA SEÇÃO — acordeão solitário por intenção
// (Textos, Itens, Fotos, Composição, Estilo, Botões e links).
// Grupo de cada campo: `field.group` ou inferido abaixo; campos que a
// variante atual não usa somem (`showIf`). Tema/tipografia são globais
// e ficam no painel esquerdo (aba Estilo).
// ============================================================

const GROUPS: { key: FieldGroup; title: string; icon: LucideIcon }[] = [
  { key: 'text', title: 'Textos', icon: Type },
  { key: 'items', title: 'Itens', icon: List },
  { key: 'media', title: 'Fotos', icon: ImageIcon },
  { key: 'layout', title: 'Composição', icon: Layout },
  { key: 'style', title: 'Estilo', icon: Palette },
  { key: 'actions', title: 'Botões e links', icon: MousePointerClick },
];

const ACTION_FIELD_KEYS = new Set(['btnText', 'btnLink']);

function fieldGroup(field: BlockField, isProp: boolean): FieldGroup {
  if (field.group) return field.group;
  if (ACTION_FIELD_KEYS.has(field.key) || field.kind === 'url') return 'actions';
  if (field.kind === 'image') return 'media';
  if (field.kind === 'list') return 'items';
  if (field.kind === 'align' || field.key === 'layout' || field.key === 'style') return 'layout';
  return isProp ? 'style' : 'text';
}

type Entry = { field: BlockField; isProp: boolean };

/** Resumo do cabeçalho do grupo: até dois valores legíveis ("Creme · Automático"). */
function summarize(entries: Entry[], content: Record<string, any>, props: Record<string, any>, lead?: string): string {
  const parts = lead ? [lead] : [];
  for (const { field: f, isProp } of entries) {
    if (parts.length === 2) break;
    const v = (isProp ? props : content)[f.key];
    let s = '';
    if (f.kind === 'swatch') s = isHexColor(v) ? 'Personalizada' : f.options?.find((o) => o.value === v)?.label ?? '';
    else if (f.kind === 'select') s = f.options?.find((o) => o.value === (v ?? f.options?.[0]?.value))?.label ?? '';
    else if (f.kind === 'list') {
      const n = Array.isArray(v) ? v.length : 0;
      s = `${n} ${(n === 1 ? f.itemLabel ?? 'item' : f.label).toLowerCase()}`;
    } else if (f.kind === 'text' || f.kind === 'textarea') s = typeof v === 'string' ? v.trim() : '';
    if (s) parts.push(s);
  }
  return parts.join(' · ');
}

export function PropertiesSidebar({
  block,
  blockIndex,
  onUpdateBlock,
  onRemoveBlock,
  onDuplicateBlock,
  designTokens,
  aiContext,
  onInteractionStart,
  onInteractionEnd,
}: PropertiesSidebarProps) {
  const { pacotes, produtos } = useConfigurationContext();
  // Sem `key` por bloco: o grupo aberto acompanha o fotógrafo de uma seção para outra
  const [openGroup, setOpenGroup] = useState<string>('text');
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  const def = getBlockDef(block.type);
  const content: Record<string, any> = block.content ?? {};
  const props: Record<string, any> = block.props ?? {};
  const palette = { ...DEFAULT_DESIGN_TOKENS.colors, ...(designTokens?.colors ?? {}) };

  const setContent = (updates: Record<string, any>) => {
    onUpdateBlock(blockIndex, { content: { ...content, ...updates } });
  };

  const setProps = (updates: Record<string, any>) => {
    onUpdateBlock(blockIndex, { props: { ...props, ...updates } });
  };

  const importPackage = (pacote: Pacote) => {
    setContent({ packages: [...(content.packages ?? []), pacoteToProposalPackage(pacote, produtos)] });
    setIsPackageModalOpen(false);
  };

  const handleSlotUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlot(slotKey);
    try {
      const url = await uploadProposalImage(file);
      const slot = { ...((block.props ?? {})[slotKey] ?? {}) };
      setProps({ [slotKey]: { ...slot, image_ref: url } });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar imagem para a nuvem. Verifique sua conexão e tente novamente.');
    } finally {
      setUploadingSlot(null);
      e.target.value = '';
    }
  };

  // Variante resolvida com a padrão: é o que o renderer usa
  const currentVariant = props.variant ?? def?.defaultVariant;
  const ctx: FieldCtx = { content, props: { ...props, variant: currentVariant } };
  const visible = (x: { showIf?: (c: FieldCtx) => boolean }) => !x.showIf || x.showIf(ctx);

  const entries: Entry[] = [
    ...(def?.fields ?? []).filter(visible).map((field) => ({ field, isProp: false })),
    ...(def?.layoutFields ?? []).filter(visible).map((field) => ({ field, isProp: true })),
  ];
  const slots = (def?.propImageSlots ?? []).filter(visible);
  const hasVariants = (def?.variants?.length ?? 0) > 0;
  const variantLabel = def?.variants?.find((v) => v.value === currentVariant)?.label;

  const groups = GROUPS.map((g) => {
    const items = entries.filter((e) => fieldGroup(e.field, e.isProp) === g.key);
    const extra =
      (g.key === 'layout' && hasVariants) ||
      (g.key === 'media' && slots.length > 0) ||
      (g.key === 'items' && block.type === 'PricingTable');
    if (!items.length && !extra) return null;

    let title = g.title;
    let summary: string;
    if (g.key === 'items') {
      const lists = items.filter((e) => e.field.kind === 'list');
      if (lists.length === 1) title = lists[0].field.label;
      summary = summarize(items, content, props);
    } else if (g.key === 'media') {
      const refs = [
        ...items.map((e) => content[e.field.key]),
        ...slots.map((s) => props[s.key]?.image_ref),
      ];
      const filled = refs.filter(Boolean).length;
      summary = filled === 0 ? 'sem foto' : refs.length === 1 ? 'com foto' : `${filled} de ${refs.length} fotos`;
    } else {
      summary = summarize(items, content, props, g.key === 'layout' ? variantLabel : undefined);
    }
    return { ...g, title, summary, items };
  }).filter((g): g is NonNullable<typeof g> => g !== null);

  const groupKeys = groups.map((g) => g.key as string);
  const accordionValue = openGroup === '' || groupKeys.includes(openGroup) ? openGroup : groupKeys[0] ?? '';

  const renderField = ({ field, isProp }: Entry, groupTitle: string, withAi: boolean) => (
    <FieldEditor
      key={field.key}
      field={field.kind === 'list' && field.label === groupTitle ? { ...field, label: '' } : field}
      value={(isProp ? props : content)[field.key]}
      onChange={(v) => (isProp ? setProps : setContent)({ [field.key]: v })}
      aiContext={withAi ? { blockType: block.type, ...aiContext } : undefined}
      ctx={ctx}
      palette={palette}
    />
  );

  return (
    <>
      <div
        className="flex h-full flex-col bg-background select-none"
        onFocusCapture={onInteractionStart}
        onBlurCapture={onInteractionEnd}
        onPointerDownCapture={onInteractionStart}
      >
        {/* CABEÇALHO FIXO DA SEÇÃO */}
        <div className="shrink-0 px-4 py-4 border-b border-border bg-background">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Seção {String(blockIndex + 1).padStart(2, '0')} · {getBlockName(block.type)}
              </span>
              <h2 className="text-base font-semibold text-foreground tracking-tight truncate mt-0.5">
                {getSectionTitle(block)}
              </h2>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
                  title="Mais opções da seção"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onDuplicateBlock && (
                  <>
                    <DropdownMenuItem onClick={() => onDuplicateBlock(blockIndex)} className="gap-2 cursor-pointer">
                      <Copy className="h-4 w-4" />
                      Duplicar seção
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => onRemoveBlock(blockIndex)}
                  className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Remover seção
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* GRUPOS (um aberto por vez) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar select-text" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
          {groups.length === 0 ? (
            <p className="py-12 px-6 text-center text-xs text-muted-foreground">Esta seção não tem ajustes.</p>
          ) : (
            <Accordion type="single" collapsible value={accordionValue} onValueChange={setOpenGroup}>
              {groups.map((g) => (
                <AccordionItem key={g.key} value={g.key} className="border-border/60">
                  <AccordionTrigger className="gap-3 px-4 py-3.5 text-sm hover:no-underline hover:bg-muted/30 data-[state=open]:bg-muted/20">
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      <g.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="shrink-0 font-medium text-foreground">{g.title}</span>
                      {g.summary && (
                        <span className="min-w-0 flex-1 truncate text-right text-xs font-normal text-muted-foreground">
                          {g.summary}
                        </span>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 px-4 pb-5 pt-2">
                    {/* Composição: variantes da seção */}
                    {g.key === 'layout' && hasVariants && (
                      <VariantPicker options={def!.variants!} value={currentVariant} onChange={(v) => setProps({ variant: v })} />
                    )}

                    {/* Itens: importar pacotes cadastrados (Tabela de Preços) */}
                    {g.key === 'items' && block.type === 'PricingTable' && (
                      <Button
                        variant="outline"
                        className="w-full border-dashed gap-2 h-9 text-xs rounded-xl"
                        onClick={() => setIsPackageModalOpen(true)}
                      >
                        <DownloadCloud className="h-3.5 w-3.5" />
                        Importar pacotes cadastrados
                      </Button>
                    )}

                    {g.items.map((e) => renderField(e, g.title, g.key === 'text'))}

                    {/* Fotos: slots da composição (ex.: Editorial photo_a/photo_b) */}
                    {g.key === 'media' &&
                      slots.map((slot) => {
                        const current = props[slot.key]?.image_ref ?? null;
                        const inputId = `upload-${slot.key}-${blockIndex}`;
                        return (
                          <div key={slot.key} className="space-y-2">
                            <Label className="text-xs text-muted-foreground">{slot.label}</Label>
                            <div className="flex gap-3 items-center">
                              <div className="h-16 w-24 shrink-0 rounded-xl border border-border bg-muted/40 flex items-center justify-center overflow-hidden">
                                {current ? (
                                  <img src={current} alt={slot.label} className="h-full w-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                                )}
                              </div>
                              <div className="flex flex-col gap-1.5 flex-1">
                                <Label htmlFor={inputId} className="cursor-pointer">
                                  <div className="flex h-8 w-full items-center justify-center rounded-lg border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                                    {uploadingSlot === slot.key ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                                    {current ? 'Trocar imagem' : 'Enviar imagem'}
                                  </div>
                                  <input
                                    type="file"
                                    id={inputId}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => handleSlotUpload(e, slot.key)}
                                    disabled={uploadingSlot !== null}
                                  />
                                </Label>
                                {current ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-xs h-7 text-destructive hover:bg-destructive/10"
                                    onClick={() => setProps({ [slot.key]: { ...(props[slot.key] ?? {}), image_ref: null } })}
                                  >
                                    Remover foto
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>

      {/* MODAL DE IMPORTAÇÃO DE PACOTES */}
      <Dialog open={isPackageModalOpen} onOpenChange={setIsPackageModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar Pacote</DialogTitle>
            <DialogDescription>
              Selecione um pacote cadastrado no sistema para adicionar à tabela.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto space-y-2 py-4">
            {!pacotes || pacotes.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Nenhum pacote cadastrado nas configurações.
              </div>
            ) : (
              pacotes.map((pacote) => {
                const preview = pacoteToProposalPackage(pacote, produtos);
                return (
                  <div
                    key={pacote.id}
                    onClick={() => importPackage(pacote)}
                    className="flex flex-col p-4 border rounded-xl hover:border-primary cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm">{preview.name}</span>
                      <span className="font-bold text-sm text-primary">{preview.price}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {preview.features.join(' · ') || 'Sem itens inclusos'}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
