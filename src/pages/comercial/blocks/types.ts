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
