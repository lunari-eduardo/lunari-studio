import { useEffect, useMemo, useRef } from 'react';
import { IframePreview } from '@/components/deliver/IframePreview';
import { CoverRenderer } from '@/components/deliver/covers/CoverRenderer';
import { resolveCoverId } from '@/components/deliver/covers/registry';
import { DeliverPhotoGrid } from '@/components/deliver/DeliverPhotoGrid';
import { GalleryThemeProvider } from '@/hooks/useGalleryDisplayTheme';
import { ClientAlbumsView } from '@/pages/gallery/client/components/ClientAlbumsView';
import { buildClientThemeStyles } from '@/pages/gallery/client/hooks/useClientGalleryTheme';
import { getFontFamilyById } from '@/components/FontSelect';
import { getDemoCoverPhoto, getDemoGridPhotos } from '@/lib/demoCoverPhoto';
import type { PhotoPaths } from '@/lib/photoUrl';
import type { CoverVariantProps } from '@/components/deliver/covers/types';
import type { Gallery, GalleryPhoto, TitleCaseMode } from '@/types/gallery';

export type PreviewGalleryType = 'entrega' | 'selecao';
export type PreviewViewport = 'desktop' | 'mobile';
export type PreviewView = 'cover' | 'photos';

export interface GalleryLivePreviewProps {
  type: PreviewGalleryType;
  viewport: PreviewViewport;
  /** Só Entrega: posiciona o preview na capa ou na grade de fotos. */
  view?: PreviewView;
  coverId?: string | null;
  sessionName: string;
  subtitle?: string;
  sessionDate?: string | Date | null;
  category?: string;
  studioName?: string;
  studioLogoUrl?: string | null;
  fontId?: string;
  titleCaseMode?: TitleCaseMode;
  themeId?: string;
  themeOverrides?: any;
  gap?: number;
  primaryColor?: string;
  backgroundMode: 'light' | 'dark';
  /** Foto real de capa; sem ela, usa a foto de demonstração. */
  coverPhoto?: PhotoPaths | null;
  /** Fotos reais da galeria para a grade (Entrega); sem elas, usa as de demonstração. */
  photos?: any[];
  galleryId?: string;
  coverVideo?: CoverVariantProps['coverVideo'];
  ctaLabel?: string;
  contentPosition?: CoverVariantProps['contentPosition'];
  overlayIntensity?: CoverVariantProps['overlayIntensity'];
}

const DEMO_FOLDERS = [
  { id: 'demo-a', nome: 'Ensaio', ordem: 0 },
  { id: 'demo-b', nome: 'Detalhes', ordem: 1 },
  { id: 'demo-c', nome: 'Família', ordem: 2 },
];

function demoSelectionPhotos(cover: PhotoPaths): GalleryPhoto[] {
  const toPhoto = (p: any, i: number, folderId: string): GalleryPhoto => ({
    id: `demo-${i}`,
    filename: p.storageKey,
    originalFilename: p.originalFilename ?? p.storageKey,
    thumbnailUrl: p.thumbPath ?? p.previewPath,
    previewUrl: p.previewPath,
    originalUrl: p.previewPath,
    width: p.width,
    height: p.height,
    isSelected: false,
    isFavorite: false,
    order: i,
    folderId,
  } as GalleryPhoto);
  const grid = getDemoGridPhotos();
  return [
    toPhoto(cover, 0, DEMO_FOLDERS[0].id),
    ...grid.map((p, i) => toPhoto(p, i + 1, DEMO_FOLDERS[i % DEMO_FOLDERS.length].id)),
  ];
}

/**
 * Preview fiel da galeria pública dentro de um iframe com viewport real
 * (1280×720 / 375×667): capas que usam 100svh preenchem a tela como no site
 * do cliente, sem áreas vazias. Reaproveita os componentes de produção.
 */
export function GalleryLivePreview(props: GalleryLivePreviewProps) {
  const { type, viewport, view = 'cover', backgroundMode } = props;
  const isDark = backgroundMode === 'dark';
  const sessionFont = getFontFamilyById(props.fontId);

  return (
    <IframePreview
      title={type === 'entrega' ? 'Prévia da galeria de entrega' : 'Prévia da galeria de seleção'}
      viewport={viewport}
      colorScheme={backgroundMode}
    >
      {type === 'entrega' ? (
        <DeliverPreview {...props} view={view} isDark={isDark} sessionFont={sessionFont} />
      ) : (
        <SelectionPreview {...props} />
      )}
    </IframePreview>
  );
}

function DeliverPreview({
  view,
  isDark,
  sessionFont,
  coverId,
  coverPhoto,
  sessionName,
  subtitle,
  sessionDate,
  category,
  studioName,
  titleCaseMode,
  themeId,
  themeOverrides,
  gap,
  primaryColor,
  backgroundMode,
  photos,
  galleryId,
  coverVideo,
  ctaLabel,
  contentPosition,
  overlayIntensity,
}: GalleryLivePreviewProps & { view: PreviewView; isDark: boolean; sessionFont: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const bg = isDark ? '#0E0E0E' : '#FAF9F7';
  const demoCover = getDemoCoverPhoto('horizontal');

  const overrides = useMemo(
    () => ({ ...(themeOverrides || {}), layout: { ...(themeOverrides?.layout || {}), ...(gap !== undefined ? { gap } : {}) } }),
    [themeOverrides, gap]
  );

  // scrollTo no container (e não scrollIntoView): evita rolar também a página do Studio.
  const scrollToView = (target: PreviewView, smooth: boolean) => {
    const container = scrollRef.current;
    if (!container) return;
    // +2: com o iframe escalado, o arredondamento deixava 1px da capa visível no topo da grade.
    const top = target === 'photos' ? (gridRef.current?.offsetTop ?? 0) + 2 : 0;
    container.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToView(view, true);
  }, [view]);

  return (
    <div ref={scrollRef} className="relative h-full w-full overflow-y-auto" style={{ backgroundColor: bg }}>
      <div className="h-full">
        <CoverRenderer
          coverId={resolveCoverId(coverId)}
          coverPhoto={coverPhoto ?? demoCover}
          fallbackPhoto={demoCover}
          sessionName={sessionName}
          subtitle={subtitle}
          sessionDate={sessionDate}
          category={category}
          studioName={studioName}
          sessionFont={sessionFont}
          titleCaseMode={titleCaseMode}
          isDark={isDark}
          primaryColor={primaryColor}
          coverVideo={coverVideo}
          ctaLabel={ctaLabel}
          contentPosition={contentPosition}
          overlayIntensity={overlayIntensity}
          onEnter={() => scrollToView('photos', true)}
        />
      </div>
      <div ref={gridRef}>
        <GalleryThemeProvider
          activeThemeId={themeId}
          themeOverrides={overrides}
          backgroundMode={backgroundMode}
          customPrimaryColor={primaryColor}
        >
          <DeliverPhotoGrid
            photos={(photos && photos.length > 0 ? photos : getDemoGridPhotos()) as any}
            onPhotoClick={() => {}}
            onDownload={() => {}}
            galleryId={galleryId ?? 'demo'}
            bgColor={bg}
          />
        </GalleryThemeProvider>
      </div>
    </div>
  );
}

function SelectionPreview({
  coverId,
  sessionName,
  studioName,
  studioLogoUrl,
  fontId,
  titleCaseMode,
  primaryColor,
  backgroundMode,
}: GalleryLivePreviewProps) {
  const orientation = coverId === 'framed-portrait' ? 'vertical' : 'horizontal';
  const photos = useMemo(() => demoSelectionPhotos(getDemoCoverPhoto(orientation)), [orientation]);
  const themeStyles = useMemo(
    () => buildClientThemeStyles(backgroundMode, primaryColor),
    [backgroundMode, primaryColor]
  );
  // ClientAlbumsView só lê sessionName e settings (fonte por id, caixa do título).
  const gallery = { sessionName, settings: { sessionFont: fontId, titleCaseMode } } as unknown as Gallery;

  return (
    <div className="h-full w-full overflow-y-auto">
      <ClientAlbumsView
        gallery={gallery}
        galleryFolders={DEMO_FOLDERS}
        localPhotos={photos}
        studioLogoUrl={studioLogoUrl}
        studioName={studioName}
        selectionCoverId={coverId}
        themeStyles={themeStyles}
        effectiveBackgroundMode={backgroundMode}
        onSelectFolder={() => {}}
      />
    </div>
  );
}
