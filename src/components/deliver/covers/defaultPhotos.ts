import type { PhotoPaths } from '@/lib/photoUrl';

/**
 * Fotos padrão profissionais utilizadas como fallback quando a galeria ainda não possui fotos.
 * Ambas as imagens retratam um ensaio de alta qualidade com iluminação e estética editorial.
 */

export const DEFAULT_HORIZONTAL_COVER: PhotoPaths = {
  storageKey: '/images/covers/default-cover-horizontal.jpg',
  previewPath: '/images/covers/default-cover-horizontal.jpg',
  width: 1024,
  height: 731,
};

export const DEFAULT_VERTICAL_COVER: PhotoPaths = {
  storageKey: '/images/covers/default-cover-vertical.jpg',
  previewPath: '/images/covers/default-cover-vertical.jpg',
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
  return orientation === 'vertical'
    ? DEFAULT_VERTICAL_COVER.previewPath!
    : DEFAULT_HORIZONTAL_COVER.previewPath!;
}
