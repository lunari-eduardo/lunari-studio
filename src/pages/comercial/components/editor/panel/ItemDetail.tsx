import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronUp, Copy, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FieldEditor } from '../../../blocks/FieldEditor';
import { ITEM_SECTIONS, editedOnCanvas, type BlockField, type FieldCtx } from '../../../blocks/registryDefinitions';
import { itemTitle, neighbors, patchItem, resolveItem, type ItemRef } from '../../../blocks/inspectorFocus';
import { TextsOnCanvas } from './TextsOnCanvas';
import { EYEBROW, FOCUS_RING, useTextsFormOpen } from './panelStyles';

interface ItemDetailShellProps {
  /** Muda ao trocar de item (↑/↓): o foco volta ao título. */
  itemId: string;
  /** "Pacotes › LOTE 1". */
  trail: string;
  title: string;
  /** Posição (base 0) e total na ordem de exibição; setas só com 2 itens ou mais. */
  position?: { index: number; total: number };
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  /** Itens do menu ⋯. */
  menu?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Página de detalhe de um item de lista: cobre o corpo do inspetor (a identidade da seção continua em
 * cima). Cabeçalho fixo com voltar, caminho, título, ↑/↓ entre itens e ⋯; formulário rola.
 */
export function ItemDetailShell({ itemId, trail, title, position, onBack, onPrev, onNext, menu, children }: ItemDetailShellProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true }); // leitor de tela anuncia o item; Tab segue para os controles
  }, [itemId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const target = e.target as HTMLElement;
    if (!e.currentTarget.contains(target)) return; // menus e seletores em portal tratam o próprio Esc
    if (target.closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"]')) return;
    onBack();
  };

  const showSteps = !!position && position.total > 1;
  return (
    <div
      role="region"
      aria-label={`Detalhe: ${title}`}
      onKeyDown={onKeyDown}
      className="absolute inset-0 z-10 flex flex-col bg-background animate-in fade-in-0 slide-in-from-right-2 duration-150 motion-reduce:animate-none"
    >
      <div className="shrink-0 border-b border-border/60 px-3 pb-2.5 pt-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
          <span className="min-w-0 flex-1 truncate text-right text-xs text-muted-foreground">{trail}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 pl-2">
          <h3 ref={titleRef} tabIndex={-1} className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground outline-none">
            {title}
          </h3>
          {showSteps && (
            <>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onPrev} disabled={!onPrev} aria-label="Item anterior" title="Item anterior">
                <ChevronUp />
              </Button>
              <span className="min-w-[2.25rem] text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
                {position.index + 1}/{position.total}
              </span>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-muted hover:text-foreground" onClick={onNext} disabled={!onNext} aria-label="Próximo item" title="Próximo item">
                <ChevronDown />
              </Button>
            </>
          )}
          {menu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Mais ações do item" title="Mais ações">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="flex-1 select-text overflow-y-auto px-4 pt-4" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
        <div className="space-y-5">{children}</div>
      </div>
    </div>
  );
}

interface ItemFieldsProps {
  fields: BlockField[];
  item: Record<string, any>;
  /** Estado da seção (variante resolvida) para o `showIf` dos campos. */
  ctx: FieldCtx;
  onChange: (key: string, value: any) => void;
  /** Recolhe os textos curtos que a arte já edita no lugar ("Editar como formulário"), como no grupo Textos. */
  collapseTexts?: boolean;
}

/** Campos de um item agrupados por afinidade (Identidade, Valores, Conteúdo…); opcionais vão para "Avançado". */
export function ItemFields({ fields, item, ctx, onChange, collapseTexts }: ItemFieldsProps) {
  const [textsOpen, setTextsOpen] = useTextsFormOpen();
  const visible = fields.filter((f) => !f.showIf || f.showIf(ctx));
  const render = (f: BlockField) => (
    <FieldEditor key={f.key} field={f} value={item[f.key]} item={item} ctx={ctx} onChange={(v) => onChange(f.key, v)} />
  );

  const blocks: { key: string; title?: string; fields: BlockField[] }[] = [
    { key: 'general', fields: visible.filter((f) => !f.section) },
    ...ITEM_SECTIONS.map((s) => ({ key: s.key, title: s.title, fields: visible.filter((f) => f.section === s.key) })),
  ].filter((b) => b.fields.length > 0);

  return (
    <>
      {blocks.map((b) => {
        const main = b.fields.filter((f) => !f.advanced);
        const advanced = b.fields.filter((f) => f.advanced);
        const folded = collapseTexts && b.key === 'texts' ? main.filter((f) => editedOnCanvas(f, ctx)) : [];
        const shown = main.filter((f) => !folded.includes(f));
        return (
          <section key={b.key} className="space-y-3">
            {b.title && <h4 className={EYEBROW}>{b.title}</h4>}
            {folded.length > 0 && (
              <TextsOnCanvas count={folded.length} open={textsOpen} onOpenChange={setTextsOpen}>
                {folded.map(render)}
              </TextsOnCanvas>
            )}
            {shown.map(render)}
            {advanced.length > 0 && (
              <Collapsible className="space-y-3">
                <CollapsibleTrigger
                  className={cn(
                    'group flex w-full items-center justify-between rounded-lg px-1 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
                    FOCUS_RING
                  )}
                >
                  <span>Avançado</span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3">{advanced.map(render)}</CollapsibleContent>
              </Collapsible>
            )}
          </section>
        );
      })}
    </>
  );
}

interface ListItemDetailProps {
  content: Record<string, any>;
  /** Campo `list` do schema (itemFields). */
  field: BlockField;
  ctx: FieldCtx;
  refItem: ItemRef;
  /** Atualização de `content` (mesmo `setContent` do painel). */
  onChange: (updates: Record<string, any>) => void;
  onOpen: (ref: ItemRef) => void;
  onBack: () => void;
}

/** Detalhe de um item de lista rica sem grupos (adicionais, depoimentos). Edita por `id`, sem reordenar a lista. */
export function ListItemDetail({ content, field, ctx, refItem, onChange, onOpen, onBack }: ListItemDetailProps) {
  const resolved = resolveItem(content, refItem);
  if (!resolved) return null;
  const items: any[] = content[field.key] ?? [];
  const pos = neighbors(content, refItem);
  const fields = field.itemFields ?? [];
  const label = field.itemLabel ?? 'Item';

  const duplicate = () => {
    const copy = { ...JSON.parse(JSON.stringify(resolved.item)), id: crypto.randomUUID() };
    onChange({ [field.key]: [...items.slice(0, resolved.index + 1), copy, ...items.slice(resolved.index + 1)] });
    onOpen({ list: field.key, key: copy.id });
  };

  return (
    <ItemDetailShell
      itemId={refItem.key}
      trail={field.label}
      title={itemTitle(resolved.item, fields, `${label} ${resolved.index + 1}`)}
      position={{ index: pos.index, total: pos.total }}
      onBack={onBack}
      onPrev={pos.prev ? () => onOpen(pos.prev!) : undefined}
      onNext={pos.next ? () => onOpen(pos.next!) : undefined}
      menu={
        <>
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={duplicate}>
            <Copy className="h-4 w-4" />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            onClick={() => onChange({ [field.key]: items.filter((_, i) => i !== resolved.index) })}
          >
            <Trash2 className="h-4 w-4" />
            Remover
          </DropdownMenuItem>
        </>
      }
    >
      <ItemFields fields={fields} item={resolved.item} ctx={ctx} onChange={(k, v) => onChange(patchItem(content, refItem, { [k]: v }))} />
    </ItemDetailShell>
  );
}
