import { Asterisk, Clock, Folder } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// Regras puras da Tabela de Preços (sem JSX: testadas em scripts/test_template_instantiation.ts)

export type PackageGroupComposition = 'editorial' | 'divider' | 'banner';

/**
 * Grupo de pacotes: camada organizacional dentro da mesma PricingTable (`content.groups`).
 * O pacote aponta para ele por `packages[].group_id`. A chave é `key`, nunca `id`: duplicar a
 * seção e instanciar modelos renovam todo `id` de lista e quebrariam essa referência.
 */
export interface PackageGroup {
  key: string;
  title?: string;
  subtitle?: string;
  composition?: PackageGroupComposition;
  /** Começa numa seção própria de tela cheia (só vale se algo vem antes dele). */
  new_page?: boolean;
  /** Período ou validade ("Até 15 de outubro"). */
  period?: string;
  /** Texto explicativo do grupo. */
  note?: string;
  /** Observação sobre os preços (mudança entre lotes). */
  price_note?: string;
  icon?: string;
}

/** Trecho da seção exibido de uma vez: os pacotes sem grupo ou os de um grupo. */
export interface PackagePage {
  group?: PackageGroup;
  /** Posição em `content.groups`; -1 = pacotes sem grupo. */
  groupIndex: number;
  /** `idx` = posição real em `content.packages` (é o caminho da edição inline). */
  entries: { pkg: any; idx: number }[];
  /** Seção própria de tela cheia. */
  newPage: boolean;
  first: boolean;
  last: boolean;
  /** Segue o fluxo da página anterior/seguinte: sem respiro de seção entre elas. */
  joinsPrev: boolean;
  joinsNext: boolean;
}

/** O que cada variante da PricingTable recebe quando renderiza só uma página da seção. */
export interface PackageSlice {
  hideHeader?: boolean;
  hideFooter?: boolean;
  /** Cabeçalho do grupo, entre o cabeçalho da seção e os pacotes. */
  lead?: ReactNode;
  /** Falso quando o grupo seguinte continua o fluxo: o respiro de cima dele é o espaço entre os dois. */
  padBottom?: boolean;
}

/** Zera o respiro de baixo da seção cujo grupo seguinte continua o fluxo (junto de `py-*`). Margem do cabeçalho não serve: colapsaria para fora da seção. */
export const slicePad = (s?: PackageSlice): string => (s?.padBottom === false ? 'pb-0 @md:pb-0' : '');

/** Chave do grupo do pacote; ausente ou desconhecida (grupo removido) = '' (sem grupo). */
export function packageGroupKey(pkg: any, groups?: PackageGroup[]): string {
  const id = pkg?.group_id;
  return id && groups?.some((g) => g.key === id) ? id : '';
}

/**
 * Páginas da seção na ordem de exibição: pacotes sem grupo primeiro, depois cada grupo na
 * ordem de `groups` (dentro do grupo vale a ordem relativa de `packages`). Grupo vazio só
 * entra com `includeEmpty` (editor); sem grupos devolve uma única página sem grupo.
 */
export function buildPackagePages(content: any, { includeEmpty = false } = {}): PackagePage[] {
  const packages: any[] = Array.isArray(content?.packages) ? content.packages : [];
  const groups: PackageGroup[] = Array.isArray(content?.groups) ? content.groups : [];
  const buckets: { group?: PackageGroup; groupIndex: number; entries: PackagePage['entries'] }[] = [
    { groupIndex: -1, entries: [] },
    ...groups.map((group, groupIndex) => ({ group, groupIndex, entries: [] as PackagePage['entries'] })),
  ];
  packages.forEach((pkg, idx) => {
    const key = packageGroupKey(pkg, groups);
    buckets[key ? groups.findIndex((g) => g.key === key) + 1 : 0].entries.push({ pkg, idx });
  });

  const kept = buckets.filter((b) => b.entries.length > 0 || (includeEmpty && b.group));
  return kept.map((b, i) => {
    const newPage = !!b.group?.new_page && i > 0;
    return {
      ...b,
      newPage,
      first: i === 0,
      last: i === kept.length - 1,
      joinsPrev: i > 0 && !newPage,
      joinsNext: i < kept.length - 1 && !kept[i + 1].group?.new_page,
    };
  });
}

/** Preço exibido em todas as variantes: `price_cash` (seeds editoriais) tem prioridade sobre `price`. */
export const displayPrice = (pkg: any): string => pkg?.price_cash || pkg?.price || '';

/** Edição inline grava no campo que está sendo exibido: trocar de variante nunca "perde" o preço. */
export const priceEditPath = (pkg: any, idx: number) => `packages.${idx}.${pkg?.price_cash ? 'price_cash' : 'price'}`;

/**
 * Ícone do item pelo texto (determinístico; ordem importa: "1 look, 40m de sessão" é duração).
 * Sem correspondência = null (losango neutro), nunca um ícone de sentido errado.
 */
export function featureIcon(text: string): LucideIcon | null {
  const t = (text || '').toLowerCase();
  if (/\bextra|adiciona/.test(t)) return Asterisk;
  if (/\d+\s*(h(?![a-z])|hora|m(in)?(?![a-z]))|sess[aã]o|dura[cç][aã]o|prazo|\d+\s*dias/.test(t)) return Clock;
  if (/foto|arquivo|digita|impress|[aá]lbum|galeria/.test(t)) return Folder;
  return null;
}

/**
 * Preço editorial ("R$" pequeno, valor grande, centavos menores): "R$ 1.190" / "R$ 35,00".
 * Texto em outro formato ("A partir de R$ 490") = null: é exibido como foi digitado.
 */
export function splitPrice(text: string): { currency: string; amount: string; cents?: string } | null {
  const m = /^\s*(R\$)\s*(\d{1,3}(?:\.\d{3})+|\d+)(,\d{1,2})?\s*$/.exec(text || '');
  return m ? { currency: m[1], amount: m[2], cents: m[3] } : null;
}

/** Item que começa com quantidade ("10 fotografias digitais") → número em destaque + rótulo; senão null. */
export function splitLeadingNumber(text: string): { num: string; label: string } | null {
  const m = /^\s*(\d{1,4})\s+(\S.*)$/.exec(text || '');
  return m ? { num: m[1], label: m[2].trim() } : null;
}

/**
 * Deslocamento da numeração de cada PricingTable "magazine": continua de um grupo para o
 * outro ("01 02 | 03") mesmo quando pacotes são adicionados/removidos. 'restart' zera;
 * 'none' oculta e não consome números.
 */
export function computePackageNumberOffsets(blocks: { type: string; content?: any; data?: any; props?: any }[]) {
  const offsets = new Map<object, number>();
  let count = 0;
  for (const b of blocks) {
    if (b.type !== 'PricingTable' || b.props?.variant !== 'magazine') continue;
    if (b.props?.numbering === 'restart') count = 0;
    offsets.set(b, count);
    if (b.props?.numbering !== 'none') count += (b.content || b.data)?.packages?.length ?? 0;
  }
  return offsets;
}

// ---------- Edição de pacotes e grupos por `id`/`key` (painel: árvore + detalhe) ----------
// Nunca por índice: o array `packages` não é reordenado a cada edição e a ordem dos outros grupos não muda.

/**
 * Reordena só os pacotes de `ids` (um grupo): eles continuam ocupando as mesmas posições do array,
 * na nova ordem. Pacotes de outros grupos não se mexem.
 */
export function reorderWithin<T extends { id?: string }>(packages: T[], ids: string[], activeId: string, overId: string): T[] {
  const slots = packages.flatMap((p, i) => (p.id && ids.includes(p.id) ? [i] : []));
  const scoped = slots.map((i) => packages[i]);
  const from = scoped.findIndex((p) => p.id === activeId);
  const to = scoped.findIndex((p) => p.id === overId);
  if (from < 0 || to < 0 || from === to) return packages;
  const [moved] = scoped.splice(from, 1);
  scoped.splice(to, 0, moved);
  const next = [...packages];
  slots.forEach((slot, k) => {
    next[slot] = scoped[k];
  });
  return next;
}

/** Muda o grupo de um pacote (`''` = sem grupo) sem tirá-lo do lugar no array. */
export function movePackageToGroup<T extends { id?: string; group_id?: string }>(packages: T[], id: string, groupKey: string): T[] {
  return packages.map((p) => {
    if (p.id !== id) return p;
    const { group_id: _old, ...rest } = p;
    return (groupKey ? { ...rest, group_id: groupKey } : rest) as T;
  });
}

/** Remove o grupo e mantém os pacotes dele (ficam sem grupo). */
export function removeGroupKeepingPackages(content: any, key: string): { groups: PackageGroup[]; packages: any[] } {
  const groups: PackageGroup[] = Array.isArray(content?.groups) ? content.groups : [];
  const packages: any[] = Array.isArray(content?.packages) ? content.packages : [];
  return {
    groups: groups.filter((g) => g.key !== key),
    packages: packages.map((p) => {
      if (p.group_id !== key) return p;
      const { group_id: _old, ...rest } = p;
      return rest;
    }),
  };
}

/** Cópia do pacote logo abaixo do original, no mesmo grupo, com `id` novo. */
export function duplicatePackageAfter<T extends { id?: string }>(packages: T[], id: string, newId: string): T[] {
  const i = packages.findIndex((p) => p.id === id);
  if (i < 0) return packages;
  const copy = { ...JSON.parse(JSON.stringify(packages[i])), id: newId };
  return [...packages.slice(0, i + 1), copy, ...packages.slice(i + 1)];
}
