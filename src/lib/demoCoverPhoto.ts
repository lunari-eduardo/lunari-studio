import { DEMO_PHOTOS } from '@/components/dashboard/themes/demoPhotos';
import {
  DEFAULT_HORIZONTAL_COVER,
  DEFAULT_VERTICAL_COVER,
} from '@/components/deliver/covers/defaultPhotos';

/**
 * Fonte única da foto de demonstração usada em previews (catálogos de capa,
 * preview da Personalização). Centraliza a troca: quando a foto de referência
 * definitiva do fotógrafo chegar, basta atualizar este arquivo (ou os arquivos
 * que ele referencia) em vez de caçar imports espalhados pelo app.
 */
export function getDemoGridPhotos() {
  return DEMO_PHOTOS;
}

export function getDemoCoverPhoto(orientation: 'horizontal' | 'vertical' = 'horizontal') {
  return orientation === 'vertical' ? DEFAULT_VERTICAL_COVER : DEFAULT_HORIZONTAL_COVER;
}
