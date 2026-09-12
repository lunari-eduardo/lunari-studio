import type { PhotoPaths } from '@/lib/photoUrl';

/**
 * Fotos padrão profissionais utilizadas como fallback quando a galeria ainda não possui fotos.
 * Imagem 2 (horizontal) e Imagem 3 (vertical) enviadas pelo fotógrafo.
 */

export const DEFAULT_HORIZONTAL_COVER_URL = '/images/covers/default-cover-horizontal.jpg';
export const DEFAULT_VERTICAL_COVER_URL = '/images/covers/default-cover-vertical.jpg';

export const DEFAULT_HORIZONTAL_COVER: PhotoPaths = {
  storageKey: DEFAULT_HORIZONTAL_COVER_URL,
  previewPath: DEFAULT_HORIZONTAL_COVER_URL,
  thumbPath: DEFAULT_HORIZONTAL_COVER_URL,
  width: 1024,
  height: 731,
};

export const DEFAULT_VERTICAL_COVER: PhotoPaths = {
  storageKey: DEFAULT_VERTICAL_COVER_URL,
  previewPath: DEFAULT_VERTICAL_COVER_URL,
  thumbPath: DEFAULT_VERTICAL_COVER_URL,
  width: 576,
  height: 1024,
};

/**
 * Retorna a foto padrão correspondente à orientação desejada.
 * Se nenhuma orientação for indicada, assume horizontal para desktop e vertical para mobile/dípticos.
 */
export function getFallbackCoverPhoto(orientation: 'horizontal' | 'vertical' = 'horizontal'): PhotoPaths {
  return orientation === 'vertical' ? DEFAULT_VERTICAL_COVER : DEFAULT_HORIZONTAL_COVER;
}

/**
 * Retorna a URL direta da imagem de fallback.
 */
export function getFallbackCoverUrl(orientation: 'horizontal' | 'vertical' = 'horizontal'): string {
  return orientation === 'vertical' ? DEFAULT_VERTICAL_COVER_URL : DEFAULT_HORIZONTAL_COVER_URL;
}
