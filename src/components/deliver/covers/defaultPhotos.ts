import type { PhotoPaths } from '@/lib/photoUrl';

/**
 * Fotos padrão profissionais utilizadas como fallback quando a galeria ainda não possui fotos.
 * Ambas as imagens retratam um ensaio de alta qualidade com iluminação e estética editorial.
 * Substituídas pelas fotos do casal em campo ao entardecer (Unsplash).
 */

export const DEFAULT_HORIZONTAL_COVER: PhotoPaths = {
  storageKey: 'horizontal-cover',
  previewPath: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1500&auto=format&fit=crop',
  width: 1500,
  height: 1000,
};

export const DEFAULT_VERTICAL_COVER: PhotoPaths = {
  storageKey: 'vertical-cover',
  previewPath: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1000&auto=format&fit=crop',
  width: 1000,
  height: 1500,
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
    ? 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1000&auto=format&fit=crop'
    : 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1500&auto=format&fit=crop';
}
