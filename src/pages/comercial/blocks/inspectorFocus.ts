import { buildPackagePages, packageGroupKey } from './pricing';
import { BLOCK_REGISTRY } from './registryDefinitions';
import { getBlockName, getSectionTitle } from './registry';

// ============================================================
// Foco do inspetor: qual item de lista está em detalhe e o que o painel lembra de cada seção.
// Estado de UI puro (fora do documento, do histórico e do autosave). A referência é por `id`
// (ou `key`, nos grupos de pacotes), nunca por índice: reordenar, duplicar e trocar de modelo não a quebram.
// ============================================================

/** `list` = chave da lista em `content` ('packages', 'groups', 'items'…); `key` = `id` do item (ou `key` do grupo). */
export interface ItemRef {
  list: string;
  key: string;
}

/** O que o painel lembra de uma seção ao trocar de seção ou fechar o Sheet. */
export interface PanelMemory {
  /** Item em detalhe (ausente/null = lista). */
  item?: ItemRef | null;
  /** Última linha aberta: volta marcada na lista. */
  last?: ItemRef | null;
  /** Grupos recolhidos na árvore de pacotes (ausente = regra padrão). */
  collapsed?: string[];
}

export const itemKey = (list: string, item: any): string => (list === 'groups' ? item?.key : item?.id) ?? '';

export const sameRef = (a?: ItemRef | null, b?: ItemRef | null): boolean => !!a && !!b && a.list === b.list && a.key === b.key;

const listOf = (content: any, list: string): any[] => (Array.isArray(content?.[list]) ? content[list] : []);

/** O item da referência na seção atual, ou null (removido, outra variante, outra seção): o painel volta à lista. */
export function resolveItem(content: any, ref?: ItemRef | null): { index: number; item: any } | null {
  if (!ref?.key) return null;
  const items = listOf(content, ref.list);
  const index = items.findIndex((it) => itemKey(ref.list, it) === ref.key);
  return index < 0 ? null : { index, item: items[index] };
}

/** Referências na ordem em que a arte as mostra (pacotes: sem grupo primeiro, depois cada grupo; demais: ordem do array). */
export function displayOrder(content: any, list: string): ItemRef[] {
  const keys =
    list === 'packages'
      ? buildPackagePages(content, { includeEmpty: true }).flatMap((p) => p.entries.map((e) => itemKey(list, e.pkg)))
      : listOf(content, list).map((it) => itemKey(list, it));
  return keys.filter(Boolean).map((key) => ({ list, key }));
}

/** Posição do item na ordem de exibição e vizinhos (setas ↑/↓ do detalhe). */
export function neighbors(content: any, ref: ItemRef) {
  const order = displayOrder(content, ref.list);
  const at = order.findIndex((r) => sameRef(r, ref));
  return {
    index: at,
    total: order.length,
    prev: at > 0 ? order[at - 1] : null,
    next: at >= 0 && at < order.length - 1 ? order[at + 1] : null,
  };
}

/** Atualização de `content` que muda campos de um item pelo `id`/`key`, sem reordenar a lista. */
export function patchItem(content: any, ref: ItemRef, patch: Record<string, any>): Record<string, any> {
  return { [ref.list]: listOf(content, ref.list).map((it) => (itemKey(ref.list, it) === ref.key ? { ...it, ...patch } : it)) };
}

/** Título do item no detalhe: o campo "de nome" (name/title/author/label) ou o primeiro texto preenchido. */
export function itemTitle(item: Record<string, any>, fields: { key: string; kind: string }[], fallback: string): string {
  const text = (k: string) => (typeof item[k] === 'string' ? item[k].trim() : '');
  for (const k of ['name', 'title', 'author', 'label']) if (text(k)) return text(k);
  const first = fields.find((f) => (f.kind === 'text' || f.kind === 'textarea') && text(f.key));
  return first ? text(first.key) : fallback;
}

// ---------- Item fixado (1 por vez) ----------

/** Seção ou item de lista fixado no topo do painel. Por `id`/`key`: sobrevive a reordenar, duplicar e trocar de modelo. */
export interface PinRef {
  blockId: string;
  /** Ausente = a própria seção. */
  item?: ItemRef;
}

export interface ResolvedPin {
  /** Posição atual da seção. */
  index: number;
  label: string;
  /** "Pacotes · LOTE 1" / tipo da seção. */
  context: string;
  thumb?: string;
}

/** O fixado na proposta atual, ou null se a seção ou o item deixou de existir (o registro é mantido: o undo o traz de volta). */
export function resolvePin(blocks: { id?: string; type: string; content?: any; data?: any }[], pin?: PinRef | null): ResolvedPin | null {
  if (!pin?.blockId) return null;
  const index = blocks.findIndex((b) => b.id === pin.blockId);
  if (index < 0) return null;
  const block = blocks[index];
  const section = getSectionTitle(block as any);
  if (!pin.item) return { index, label: section, context: getBlockName(block.type) };

  const found = resolveItem(block.content, pin.item);
  if (!found) return null;
  const { list } = pin.item;
  const item = found.item;
  if (list === 'groups') {
    return { index, label: item.title?.trim() || `Grupo ${found.index + 1}`, context: section };
  }
  if (list === 'packages') {
    const groups = Array.isArray(block.content?.groups) ? block.content.groups : [];
    const key = packageGroupKey(item, groups);
    const g = groups.find((x: any) => x.key === key);
    return {
      index,
      label: item.name?.trim() || 'Novo pacote',
      context: g ? `${g.title?.trim() || 'Grupo'} · ${section}` : section,
      thumb: typeof item.image_ref === 'string' && item.image_ref ? item.image_ref : undefined,
    };
  }
  const field = BLOCK_REGISTRY[block.type]?.fields.find((f) => f.key === list);
  const fields = field?.itemFields ?? [];
  const imageKey = fields.find((f) => f.kind === 'image')?.key;
  return {
    index,
    label: itemTitle(item, fields, `${field?.itemLabel ?? 'Item'} ${found.index + 1}`),
    context: section,
    thumb: imageKey && typeof item[imageKey] === 'string' && item[imageKey] ? item[imageKey] : undefined,
  };
}
