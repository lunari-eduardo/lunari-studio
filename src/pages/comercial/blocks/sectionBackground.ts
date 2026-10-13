import type { BlockData } from '@/hooks/useMaterialEditor';
import { getBlockDef, type BlockField, type FieldCtx } from './registry';
import { backgroundSwatchColor, contrastRatio, type ProposalDesignTokens } from './design';

type Palette = NonNullable<ProposalDesignTokens['colors']>;

/** Campo de fundo que a seção oferece na variante atual (ausente = a seção não tem fundo escolhível). */
export function sectionBackgroundField(block: BlockData): BlockField | undefined {
  const def = getBlockDef(block.type);
  const ctx: FieldCtx = {
    content: block.content ?? {},
    props: { ...(block.props ?? {}), variant: block.props?.variant ?? def?.defaultVariant },
  };
  return def?.layoutFields?.find((f) => f.key === 'background' && (!f.showIf || f.showIf(ctx)));
}

// Cor de texto fixa escolhida no painel → cor real (mesmos valores de textColorClass)
const FIXED_TEXT: Record<string, (p: Palette) => string | undefined> = {
  dark: () => '#171717',
  black: () => '#000000',
  light: () => '#FFFFFF',
  warm: (p) => p.taupe,
  accent: (p) => p.accent,
};

/**
 * Usa o mesmo fundo em todas as seções que têm o campo (as demais ficam como estão).
 * Texto fixo que perderia a leitura no novo fundo (< 3:1) volta para "Automático".
 * `palette` já mesclada com o padrão. Devolve os blocos e quantas seções mudaram.
 */
export function applyBackgroundToAll(blocks: BlockData[], value: string, palette: Palette): { blocks: BlockData[]; changed: number } {
  const bg = backgroundSwatchColor(value, palette);
  let changed = 0;
  const next = blocks.map((block) => {
    if (!sectionBackgroundField(block) || block.props?.background === value) return block;
    changed++;
    const props: Record<string, any> = { ...(block.props ?? {}), background: value };
    const fixed = FIXED_TEXT[props.text_color]?.(palette);
    if (bg && fixed && contrastRatio(fixed, bg) < 3) props.text_color = 'default';
    return { ...block, props };
  });
  return { blocks: next, changed };
}
