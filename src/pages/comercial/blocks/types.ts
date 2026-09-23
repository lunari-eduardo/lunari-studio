export type CoverVariant =
  | 'minimal-center'
  | 'poster-split'
  | 'seam-side'
  | 'hero-full'
  | 'editorial-diptych'
  | 'floating-frame';

export type CoverOrientation = 'portrait' | 'landscape';

export interface CoverTypography {
  eyebrowSize?: number;
  titleSize?: number;
  titleItalicSize?: number;
  subtitleSize?: number;
  photographerSize?: number;
  ctaSize?: number;
}

export interface CoverBlockData {
  eyebrow?: string;
  title?: string;
  title_regular?: string; // Legado
  title_italic?: string;
  subtitle?: string;
  photographer_name?: string;
  btnText?: string;
  btnLink?: string;
  image_url?: string;
  photo_b?: string; // Para o díptico
}

export interface CoverBlockProps {
  variant?: CoverVariant;
  orientation?: CoverOrientation;
  align?: 'left' | 'center' | 'right' | 'justify';
  background?: string;
  text_color?: string;
  typography?: CoverTypography;
  focal_point?: { x: number; y: number };
}

/**
 * Extrai a orientação da proposta a partir dos blocos ou configurações globais.
 * Padrão: 'portrait' (formato editorial/mobile/A4).
 */
export function getProposalOrientation(
  blocks?: Array<{ type: string; props?: any; data?: any; content?: any }>,
  globalSettings?: any,
  explicitOrientation?: CoverOrientation
): CoverOrientation {
  if (explicitOrientation) return explicitOrientation;
  if (!blocks || !Array.isArray(blocks)) {
    return (globalSettings?.orientation as CoverOrientation) ?? 'portrait';
  }

  const coverBlock = blocks.find((b) => b.type === 'CoverBlock' || b.type === 'cover');
  if (coverBlock?.props?.orientation) {
    return coverBlock.props.orientation as CoverOrientation;
  }
  const globalBlock = blocks.find((b) => b.type === 'global_settings');
  if (globalBlock?.data?.orientation || globalBlock?.props?.orientation) {
    return (globalBlock.data?.orientation || globalBlock.props?.orientation) as CoverOrientation;
  }
  if (globalSettings?.orientation) {
    return globalSettings.orientation as CoverOrientation;
  }
  return 'portrait';
}
