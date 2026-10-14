import { BlockData } from '@/hooks/useMaterialEditor';
import { Heading1 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BLOCK_REGISTRY, BlockDefinition } from './registryDefinitions';

export * from './registryDefinitions';
export { normalizeBlocks, BLOCK_UNKNOWN_FALLBACK_TITLE, normalizeBlock } from './normalization';

export function getBlockDef(type: string): BlockDefinition | undefined {
  return BLOCK_REGISTRY[type];
}

export function getBlockName(type: string): string {
  return BLOCK_REGISTRY[type]?.name ?? 'Seção';
}

/** Une os trechos preenchidos num só texto de uma linha ("Sessões de" + "Natal" → "Sessões de Natal"). */
const joinText = (...parts: unknown[]) =>
  parts
    .filter((s): s is string => typeof s === 'string' && !!s.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Nome da seção na lista de estrutura: o título digitado (com o trecho em destaque), senão o nome do tipo. */
export function getSectionTitle(block: BlockData): string {
  const c = block.content;
  return (
    joinText(c?.title, c?.title_italic) ||
    joinText(c?.cta_text, c?.cta_italic) ||
    c?.eyebrow ||
    block.data?.title ||
    getBlockName(block.type)
  );
}

export const ADDABLE_BLOCK_TYPES = Object.keys(BLOCK_REGISTRY).filter((t) => t !== 'text');

export function createBlock(type: string, collection?: string): BlockData {
  const def = BLOCK_REGISTRY[type];
  const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
  if (!def) {
    return { type, id, content: {} };
  }
  const { content, props } = def.factory();
  // Numa proposta de coleção temática, a seção nova já nasce com a 1ª variante da coleção
  const variant = collection ? def.variants?.find((v) => v.collection === collection)?.value : undefined;
  return {
    type,
    id,
    content: JSON.parse(JSON.stringify(content)),
    props: { ...JSON.parse(JSON.stringify(props ?? {})), ...(variant && { variant }) },
  };
}

// Icone default para tipos fora do registry
export const DEFAULT_BLOCK_ICON: LucideIcon = Heading1;
