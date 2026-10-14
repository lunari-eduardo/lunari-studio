import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { BlockData } from '@/hooks/useMaterialEditor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Trash2,
  Copy,
  Pin,
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
import { cn } from '@/lib/utils';
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
import { getBlockDef, getBlockName, getSectionTitle, editedOnCanvas, BlockField, FieldCtx, FieldGroup } from '../../blocks/registry';
import { pacoteToProposalPackage } from '../../blocks/normalization';
import type { Pacote } from '@/types/configuration';
import { FieldEditor } from '../../blocks/FieldEditor';
import { PackageDetail, PackageGroupsField } from './PackageGroupsField';
import { uploadProposalImage } from '../../blocks/uploadImage';
import { DEFAULT_DESIGN_TOKENS, backgroundSwatchColor, type ProposalDesignTokens } from '../../blocks/design';
import { VariantPicker } from './CanvasToolbars';
import { forCollection, useProposalCollection } from '../../blocks/collections';
import { EYEBROW, FOCUS_RING, useTextsFormOpen } from './panel/panelStyles';
import { TextsOnCanvas } from './panel/TextsOnCanvas';
import { ListItemDetail } from './panel/ItemDetail';
import { InspectorNavContext, type InspectorNav } from './panel/InspectorNav';
import { resolveItem, sameRef, type ItemRef, type PanelMemory, type PinRef, type ResolvedPin } from '../../blocks/inspectorFocus';
import { PinnedBar } from './panel/PinnedBar';

export interface PropertiesSidebarProps {
  block: BlockData;
  blockIndex: number;
  onUpdateBlock: (index: number, data: Record<string, any>) => void;
  onRemoveBlock: (index: number) => void;
  onDuplicateBlock?: (index: number) => void;
  /** Ausente = sem "Usar em todas as seções" no campo de fundo. */
  onApplyBackgroundToAll?: (value: string) => void;
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
  /** Classes extras do cabeçalho (no drawer do celular, abre espaço para o botão X do Sheet). */
  headerClassName?: string;
  /**
   * O que o painel lembra desta seção (item em detalhe, última linha aberta, grupos recolhidos). Vive na
   * página: sobrevive à troca de seção e ao Sheet do celular. Sem `onMemoryChange`, as listas ricas
   * voltam ao acordeão no lugar.
   */
  memory?: PanelMemory;
  onMemoryChange?: (patch: Partial<PanelMemory>) => void;
  /** Item fixado da proposta (1 por vez), já resolvido (ausente = nada fixado ou o item não existe mais). */
  pin?: PinRef | null;
  pinInfo?: ResolvedPin | null;
  onPinChange?: (pin: PinRef | null) => void;
  /** Leva ao item fixado (seleciona a seção, rola a arte e abre o detalhe). */
  onGoToPin?: () => void;
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
  if (field.kind === 'image' || field.kind === 'gallery') return 'media';
  if (field.kind === 'list') return 'items';
  if (field.kind === 'align' || field.key === 'layout' || field.key === 'style') return 'layout';
  return isProp ? 'style' : 'text';
}

type Entry = { field: BlockField; isProp: boolean };

/** Resumo do cabeçalho do grupo: até dois valores legíveis ("#F3ECE2 · Automático"). */
function summarize(
  entries: Entry[],
  content: Record<string, any>,
  props: Record<string, any>,
  palette: NonNullable<ProposalDesignTokens['colors']>,
  lead?: string
): string {
  const parts = lead ? [lead] : [];
  for (const { field: f, isProp } of entries) {
    if (parts.length === 2) break;
    const v = (isProp ? props : content)[f.key];
    let s = '';
    // Código da cor resolvida: o nome do slot ("Branco") não acompanha a cor editada no tema
    if (f.kind === 'swatch') s = backgroundSwatchColor(v, palette)?.toUpperCase() ?? '';
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
  onApplyBackgroundToAll,
  designTokens,
  aiContext,
  onInteractionStart,
  onInteractionEnd,
  headerClassName,
  memory,
  onMemoryChange,
  pin,
  pinInfo,
  onPinChange,
  onGoToPin,
}: PropertiesSidebarProps) {
  const { pacotes, produtos } = useConfigurationContext();
  const collection = useProposalCollection();
  // Sem `key` por bloco: o grupo aberto acompanha o fotógrafo de uma seção para outra
  const [openGroup, setOpenGroup] = useState<string>('text');
  const [textsFormOpen, toggleTextsForm] = useTextsFormOpen();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollMemo = useRef<Record<string, number>>({}); // rolagem da lista, por seção
  // Importação de pacotes cadastrados: null = fechada; '' = sem grupo; senão, a chave do grupo de destino
  const [importTarget, setImportTarget] = useState<string | null>(null);
  const [imported, setImported] = useState<Record<string, number>>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const uid = useId();

  const def = getBlockDef(block.type);
  const content: Record<string, any> = block.content ?? {};
  const props: Record<string, any> = block.props ?? {};
  const palette = { ...DEFAULT_DESIGN_TOKENS.colors, ...(designTokens?.colors ?? {}) };

  // Uploads terminam depois de outras edições: grava sobre a seção mais recente, não a do clique
  // (só se ainda for a mesma seção: se o fotógrafo trocou de seção no meio, vale o estado capturado)
  const blockRef = useRef(block);
  blockRef.current = block;
  const latest = () => (blockRef.current.id === block.id ? blockRef.current : block);

  const setContent = (updates: Record<string, any>) => {
    onUpdateBlock(blockIndex, { content: { ...(latest().content ?? {}), ...updates } });
  };

  const setProps = (updates: Record<string, any>) => {
    onUpdateBlock(blockIndex, { props: { ...(latest().props ?? {}), ...updates } });
  };

  const openImport = (target: string) => {
    setImported({});
    setImportTarget(target);
  };

  // A janela fica aberta: o fotógrafo marca vários pacotes de uma vez e conclui
  const importPackage = (pacote: Pacote) => {
    const item = { ...pacoteToProposalPackage(pacote, produtos), ...(importTarget && { group_id: importTarget }) };
    setContent({ packages: [...(latest().content?.packages ?? []), item] });
    setImported((m) => ({ ...m, [pacote.id]: (m[pacote.id] ?? 0) + 1 }));
  };
  const importGroupTitle = importTarget
    ? (content.groups as any[] | undefined)?.find((g) => g.key === importTarget)?.title?.trim()
    : '';

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
  // Proposta de coleção temática: variantes dela; modelo padrão: as padrão (a aplicada nunca some)
  const variants = forCollection(def?.variants ?? [], collection, (v) => v.value === currentVariant);
  const hasVariants = variants.length > 1; // uma opção só não é escolha
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
      summary = summarize(items, content, props, palette);
    } else if (g.key === 'media') {
      const refs = [
        ...items.flatMap((e) =>
          e.field.kind === 'gallery' ? (content[e.field.key] ?? []).map((img: any) => img?.image_ref) : [content[e.field.key]]
        ),
        ...slots.map((s) => props[s.key]?.image_ref),
      ];
      const filled = refs.filter(Boolean).length;
      summary = filled === 0 ? 'sem foto' : refs.length === 1 ? 'com foto' : `${filled} de ${refs.length} fotos`;
    } else {
      summary = summarize(items, content, props, palette, g.key === 'layout' ? variantLabel : undefined);
    }
    return { ...g, title, summary, items };
  }).filter((g): g is NonNullable<typeof g> => g !== null);

  // Grupo Textos: o que tem gêmeo garantido na arte vai para o formulário recolhido
  const onCanvasEntries = (groups.find((g) => g.key === 'text')?.items ?? []).filter((e) => !e.isProp && editedOnCanvas(e.field, ctx));

  const groupKeys = groups.map((g) => g.key as string);
  const accordionValue = openGroup === '' || groupKeys.includes(openGroup) ? openGroup : groupKeys[0] ?? '';

  // ---- Fixar (1 por vez): fixar outro substitui; fixar o que já está fixado desafixa ----
  const pinnedHere: ItemRef | null = pin?.blockId === block.id ? pin.item ?? null : null;
  const sectionPinned = pin?.blockId === block.id && !pin.item;
  const togglePinItem = (ref: ItemRef) =>
    onPinChange?.(sameRef(pinnedHere, ref) ? null : { blockId: block.id!, item: ref });
  const toggleSectionPin = () => onPinChange?.(sectionPinned ? null : { blockId: block.id! });

  // ---- Detalhe de um item (pacote, grupo, adicional, depoimento): cobre o corpo; a lista fica montada por baixo ----
  const detailRef: ItemRef | null = memory?.item ?? null;
  const detailLists = def?.fields.filter((f) => f.kind === 'list') ?? [];
  const closeDetail = () => onMemoryChange?.({ item: null });
  const openDetail = (ref: ItemRef) => onMemoryChange?.({ item: ref, last: ref });
  let detailNode: React.ReactNode = null;
  if (detailRef && onMemoryChange && resolveItem(content, detailRef)) {
    const packagesField = block.type === 'PricingTable' ? detailLists.find((f) => f.key === 'packages') : undefined;
    const listField = detailLists.find((f) => f.key === detailRef.list);
    if (packagesField && (detailRef.list === 'packages' || detailRef.list === 'groups')) {
      detailNode = (
        <PackageDetail
          content={content}
          field={packagesField}
          ctx={ctx}
          refItem={detailRef}
          onChange={setContent}
          onImport={openImport}
          onOpen={openDetail}
          onBack={closeDetail}
          pinned={pinnedHere}
          onTogglePin={onPinChange ? togglePinItem : undefined}
        />
      );
    } else if (listField?.presentation === 'detail') {
      detailNode = <ListItemDetail content={content} field={listField} ctx={ctx} refItem={detailRef} onChange={setContent} onOpen={openDetail} onBack={closeDetail} pinned={pinnedHere} onTogglePin={onPinChange ? togglePinItem : undefined} />;
    }
  }
  const hasDetail = !!detailNode;

  const nav: InspectorNav | null = onMemoryChange
    ? {
        last: memory?.last ?? null,
        openItem: openDetail,
        collapsed: memory?.collapsed,
        setCollapsed: (keys) => onMemoryChange({ collapsed: keys }),
        pinned: pinnedHere,
        togglePin: togglePinItem,
      }
    : null;

  // A rolagem da lista volta ao ponto em que estava ao reabrir a seção
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollMemo.current[block.id ?? ''] ?? 0;
  }, [block.id]);

  // Ao voltar do detalhe: a linha de origem fica à vista, marcada e com o foco (teclado não se perde)
  const hadDetail = useRef(false);
  useEffect(() => {
    if (hadDetail.current && !hasDetail && memory?.last) {
      const row = scrollRef.current?.querySelector<HTMLElement>(`[data-item-row="${memory.last.list}:${memory.last.key}"]`);
      row?.scrollIntoView({ block: 'nearest' });
      row?.querySelector<HTMLElement>('button:not([aria-label^="Arrastar"])')?.focus({ preventScroll: true });
    }
    hadDetail.current = hasDetail;
  }, [hasDetail, memory?.last]);

  const renderField = ({ field, isProp }: Entry, groupTitle: string, withAi: boolean) => (
    <FieldEditor
      key={field.key}
      field={field.kind === 'list' && field.label === groupTitle ? { ...field, label: '' } : field}
      value={(isProp ? props : content)[field.key]}
      onChange={(v) => (isProp ? setProps : setContent)({ [field.key]: v })}
      aiContext={withAi ? { blockType: block.type, ...aiContext } : undefined}
      ctx={ctx}
      palette={palette}
      onApplyAll={onApplyBackgroundToAll}
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
        <div className={cn('shrink-0 px-4 py-4 border-b border-border bg-background', headerClassName)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className={EYEBROW}>
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
                  aria-label="Mais opções da seção"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onPinChange && (
                  <DropdownMenuItem onClick={toggleSectionPin} className="gap-2 cursor-pointer">
                    <Pin className="h-4 w-4" />
                    {sectionPinned ? 'Desafixar seção' : 'Fixar seção'}
                  </DropdownMenuItem>
                )}
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

        {/* ITEM FIXADO: 1 linha fora da rolagem; clicar leva ao item (mesmo de outra seção) */}
        {pin && pinInfo && onGoToPin && onPinChange && (
          <PinnedBar
            label={pinInfo.label}
            context={pinInfo.context}
            thumb={pinInfo.thumb}
            current={pin.blockId === block.id && (pin.item ? sameRef(detailRef, pin.item) : !hasDetail)}
            onGo={onGoToPin}
            onUnpin={() => onPinChange(null)}
          />
        )}

        {/* CORPO: grupos (um aberto por vez) e, por cima, o detalhe do item aberto */}
        <InspectorNavContext.Provider value={nav}>
        <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={(e) => {
            if (!hasDetail) scrollMemo.current[block.id ?? ''] = e.currentTarget.scrollTop;
          }}
          // Com o detalhe aberto a lista fica montada (rolagem e grupos recolhidos preservados) por baixo da página de
          // detalhe, que é opaca; `inert` a tira do foco e da leitura. Sem `invisible`: a transição de visibilidade
          // do acordeão deixava a linha de origem sem foco no 1º quadro depois de voltar.
          {...(hasDetail ? ({ inert: '' } as Record<string, string>) : {})}
          aria-hidden={hasDetail || undefined}
          className="h-full overflow-y-auto custom-scrollbar select-text"
          style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}
        >
          {groups.length === 0 ? (
            <p className="py-12 px-6 text-center text-xs text-muted-foreground">Esta seção não tem ajustes.</p>
          ) : (
            <Accordion type="single" collapsible value={accordionValue} onValueChange={setOpenGroup}>
              {groups.map((g) => (
                <AccordionItem key={g.key} value={g.key} className="border-border/60">
                  {/* Grupo aberto: fundo mais firme + barra lateral + título em semibold (não depende só do chevron) */}
                  <AccordionTrigger
                    className={cn(
                      'group relative gap-3 px-4 py-3.5 text-sm hover:no-underline hover:bg-muted/30 data-[state=open]:bg-muted/40 focus-visible:ring-inset',
                      FOCUS_RING,
                      'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-transparent before:transition-colors data-[state=open]:before:bg-foreground'
                    )}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      <g.icon className="h-4 w-4 shrink-0 text-muted-foreground group-data-[state=open]:text-foreground" />
                      <span className="shrink-0 font-medium text-foreground group-data-[state=open]:font-semibold">{g.title}</span>
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
                      <VariantPicker options={variants} value={currentVariant} onChange={(v) => setProps({ variant: v })} />
                    )}

                    {/* Itens: importar pacotes cadastrados (Tabela de Preços) */}
                    {g.key === 'items' && block.type === 'PricingTable' && (
                      <Button
                        variant="outline"
                        className="w-full border-dashed gap-2 h-9 text-xs rounded-xl"
                        onClick={() => openImport('')}
                      >
                        <DownloadCloud className="h-3.5 w-3.5" />
                        Importar pacotes cadastrados
                      </Button>
                    )}

                    {/* Textos curtos que a arte já edita no lugar: formulário recolhido (A′ e longos seguem visíveis) */}
                    {g.key === 'text' && onCanvasEntries.length > 0 && (
                      <TextsOnCanvas count={onCanvasEntries.length} open={textsFormOpen} onOpenChange={toggleTextsForm}>
                        {onCanvasEntries.map((e) => renderField(e, g.title, true))}
                      </TextsOnCanvas>
                    )}

                    {g.items
                      .filter((e) => g.key !== 'text' || !onCanvasEntries.includes(e))
                      .map((e) =>
                        block.type === 'PricingTable' && e.field.key === 'packages' ? (
                          <PackageGroupsField key="packages" content={content} field={e.field} ctx={ctx} onChange={setContent} onImport={openImport} />
                        ) : (
                          renderField(e, g.title, g.key === 'text')
                        )
                      )}

                    {/* Fotos: slots da composição (ex.: Editorial photo_a/photo_b) */}
                    {g.key === 'media' &&
                      slots.map((slot) => {
                        const current = props[slot.key]?.image_ref ?? null;
                        const inputId = `${uid}-${slot.key}`; // único por instância do painel
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
                                  <div className="flex h-8 w-full items-center justify-center rounded-lg border border-input bg-background px-3 text-xs font-medium hover:bg-muted hover:text-foreground">
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
        {detailNode}
        </div>
        </InspectorNavContext.Provider>
      </div>

      {/* MODAL DE IMPORTAÇÃO DE PACOTES */}
      <Dialog open={importTarget !== null} onOpenChange={(open) => !open && setImportTarget(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Importar pacotes</DialogTitle>
            <DialogDescription>
              {importTarget
                ? `Selecione os pacotes cadastrados para adicionar a "${importGroupTitle || 'este grupo'}".`
                : 'Selecione os pacotes cadastrados no sistema para adicionar à tabela.'}
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
                    role="button"
                    tabIndex={0}
                    onClick={() => importPackage(pacote)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        importPackage(pacote);
                      }
                    }}
                    className="flex flex-col p-4 border rounded-xl hover:border-primary cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm">{preview.name}</span>
                      <span className="flex items-center gap-2">
                        {imported[pacote.id] > 0 && (
                          <span className="text-[11px] font-medium text-emerald-600">
                            Adicionado{imported[pacote.id] > 1 ? ` ×${imported[pacote.id]}` : ''}
                          </span>
                        )}
                        <span className="font-bold text-sm text-primary">{preview.price}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {preview.features.join(' · ') || 'Sem itens inclusos'}
                    </p>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setImportTarget(null)}>
              Concluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
