import { Asterisk, Clock, Folder } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Regras puras da Tabela de Preços (sem JSX: testadas em scripts/test_template_instantiation.ts)

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
