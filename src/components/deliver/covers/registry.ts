import type { CoverVariant } from './types';
import {
  FullscreenThumbnail,
  FloatingFrameThumbnail,
  SplitThumbnail,
  EditorialThumbnail,
} from './thumbnails';

import FullscreenCover from './variants/FullscreenCover';
import FloatingFrameCover from './variants/FloatingFrameCover';
import SplitCover from './variants/SplitCover';
import EditorialCover from './variants/EditorialCover';

export const COVER_REGISTRY: Record<string, CoverVariant> = {
  fullscreen: {
    id: 'fullscreen',
    name: 'Cinemática',
    description: 'Foto em tela cheia com tipografia e metadados ancorados na base',
    Component: FullscreenCover,
    Thumbnail: FullscreenThumbnail,
  },
  'floating-frame': {
    id: 'floating-frame',
    name: 'Passe-partout',
    description: 'Moldura suspensa com proporção adaptativa e acabamento de museu',
    Component: FloatingFrameCover,
    Thumbnail: FloatingFrameThumbnail,
  },
  split: {
    id: 'split',
    name: 'Díptico',
    description: 'Composição editorial em duas colunas com sobreposição elegante',
    Component: SplitCover,
    Thumbnail: SplitThumbnail,
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description: 'Tipografia monumental atravessando a costura da fotografia',
    Component: EditorialCover,
    Thumbnail: EditorialThumbnail,
  },
};


export const DEFAULT_COVER_ID = 'fullscreen';

export const COVER_LIST: CoverVariant[] = Object.values(COVER_REGISTRY);

export function resolveCoverId(id?: string | null): string {
  if (!id) return DEFAULT_COVER_ID;
  if (COVER_REGISTRY[id]) return id;
  if (import.meta.env?.DEV) {
    console.warn(`[Cover] ID desconhecido "${id}" — usando fallback "${DEFAULT_COVER_ID}".`);
  }
  return DEFAULT_COVER_ID;
}
