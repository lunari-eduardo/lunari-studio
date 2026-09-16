import type { PhotoPaths } from '@/lib/photoUrl';
import type { TitleCaseMode } from '@/types/gallery';
import type { ComponentType, LazyExoticComponent } from 'react';

export interface CoverVariantProps {
  coverPhoto: PhotoPaths | null;
  /** Foto extra usada como poster de fallback (ex: primeira foto da galeria).
   *  Usado por CinemaCover quando nem o poster customizado nem a coverPhoto
   *  produzem uma imagem renderizável. */
  fallbackPhoto?: PhotoPaths | null;
  sessionName: string;
  subtitle?: string;
  sessionDate?: string | Date | null;
  category?: string;
  issueNumber?: string;
  studioName?: string;
  sessionFont?: string;
  titleCaseMode?: TitleCaseMode;
  isDark?: boolean;
  textColor?: string;
  textOverlayColor?: string;
  primaryColor?: string;
  coverVideo?: {
    desktopKey: string;
    mobileKey?: string | null;
    posterKey?: string | null;
  } | null;
  ctaLabel?: string;
  contentPosition?: 'bottom-left' | 'center' | 'bottom-center';
  overlayIntensity?: 'soft' | 'medium' | 'strong';
  onEnter: () => void;
}

export interface CoverVariant {
  id: string;
  name: string;
  description: string;
  /** Aceita componente estático ou lazy — ambos renderizam em JSX. */
  Component: ComponentType<CoverVariantProps> | LazyExoticComponent<ComponentType<CoverVariantProps>>;
  Thumbnail: ComponentType<{ className?: string }>;
}
