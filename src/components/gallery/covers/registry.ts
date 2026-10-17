import type { CoverVariant } from '@/components/deliver/covers/types';
import {
  MinimalLogoThumbnail,
  FramedPortraitThumbnail,
  HorizontalBandThumbnail,
} from './thumbnails';
import MinimalLogoCover from './variants/MinimalLogoCover';
import FramedPortraitCover from './variants/FramedPortraitCover';
import HorizontalBandCover from './variants/HorizontalBandCover';

/**
 * Catálogo de capas de galerias de Seleção — propositalmente separado de
 * COVER_REGISTRY (Entrega): modelos mais leves, sem o peso cinematográfico.
 */
export const SELECTION_COVER_REGISTRY: Record<string, CoverVariant> = {
  'minimal-logo': {
    id: 'minimal-logo',
    name: 'Minimalista',
    description: 'Logo do estúdio centralizado com o nome da sessão — discreto e silencioso',
    Component: MinimalLogoCover,
    Thumbnail: MinimalLogoThumbnail,
  },
  'framed-portrait': {
    id: 'framed-portrait',
    name: 'Retrato emoldurado',
    description: 'Foto vertical única com moldura fina e legenda abaixo, tom de convite',
    Component: FramedPortraitCover,
    Thumbnail: FramedPortraitThumbnail,
  },
  'horizontal-band': {
    id: 'horizontal-band',
    name: 'Faixa horizontal',
    description: 'Banner baixo com foto de fundo sutil e texto sobreposto',
    Component: HorizontalBandCover,
    Thumbnail: HorizontalBandThumbnail,
  },
};

export const DEFAULT_SELECTION_COVER_ID = 'minimal-logo';

export const SELECTION_COVER_LIST: CoverVariant[] = Object.values(SELECTION_COVER_REGISTRY);
