import { useState, type ReactNode } from 'react';
import { Eye, Moon, Save, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { OptionList } from '@/components/ui/option-list';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { FontSelect } from '@/components/FontSelect';
import { CoverVideoUploader } from '@/components/deliver/CoverVideoUploader';
import { GalleryPreviewDrawer, GalleryPreviewPanel } from '@/components/gallery/preview/GalleryPreviewPanel';
import type { PreviewView } from '@/components/gallery/preview/GalleryLivePreview';
import { COVER_LIST, COVER_REGISTRY, DEFAULT_COVER_ID } from '@/components/deliver/covers/registry';
import { GRID_STYLE_OPTIONS } from '@/components/gallery/themes/glyphs';
import { DEFAULT_THEME_ID } from '@/components/gallery/themes/registry';
import { GaleriaPhoto } from '@/hooks/useSupabaseGalleries';
import { useUserProfile } from '@/hooks/useUserProfile';
import { generatePublicLink } from '@/utils/publicLinks';
import type { GlobalSettings, TitleCaseMode } from '@/types/gallery';

const INHERIT = '__studio_default';

interface DeliverDesignTabProps {
  galleryId: string;
  useCustomTheme: boolean;
  setUseCustomTheme: (custom: boolean) => void;
  activeThemeId: string;
  setActiveThemeId: (id: string) => void;
  themeOverrides: any;
  setThemeOverrides: (overrides: any) => void;
  coverId: string | null;
  setCoverId: (id: string | null) => void;
  coverVideo?: any;
  setCoverVideo?: (data: any) => void;
  coverCinema?: any;
  setCoverCinema?: (data: any) => void;
  photos: GaleriaPhoto[];
  publicToken?: string | null;
  sessionFont: string;
  setSessionFont: (font: string) => void;
  titleCaseMode: TitleCaseMode;
  setTitleCaseMode: (mode: TitleCaseMode) => void;
  clientMode: 'light' | 'dark';
  setClientMode: (mode: 'light' | 'dark') => void;
  sessionName?: string;
  subtitle?: string;
  category?: string;
  eventDate?: Date;
  coverPhotoId?: string | null;
  studioSettings?: GlobalSettings;
  saving: boolean;
  onSave: () => void;
  onUpdateCoverVideo?: (v: any) => Promise<void>;
}

function Block({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <header>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function DeliverDesignTab({
  galleryId,
  useCustomTheme,
  setUseCustomTheme,
  activeThemeId,
  setActiveThemeId,
  themeOverrides,
  setThemeOverrides,
  coverId,
  setCoverId,
  coverVideo,
  setCoverVideo,
  coverCinema,
  setCoverCinema,
  photos,
  publicToken,
  sessionFont,
  setSessionFont,
  titleCaseMode,
  setTitleCaseMode,
  clientMode,
  setClientMode,
  sessionName = 'Ensaio Fotográfico',
  subtitle,
  category,
  eventDate,
  coverPhotoId,
  studioSettings,
  saving,
  onSave,
  onUpdateCoverVideo,
}: DeliverDesignTabProps) {
  const { profile } = useUserProfile();
  const [view, setView] = useState<PreviewView>('cover');

  const studioCoverId = studioSettings?.defaultCoverId || DEFAULT_COVER_ID;
  const studioCover = COVER_REGISTRY[studioCoverId] ?? COVER_REGISTRY[DEFAULT_COVER_ID];
  const studioThemeId = studioSettings?.defaultThemeId || DEFAULT_THEME_ID;
  const studioTheme = GRID_STYLE_OPTIONS.find((t) => t.value === studioThemeId) ?? GRID_STYLE_OPTIONS[0];
  const accountOverrides = ((studioSettings?.themeOverrides as any) || {}) as Record<string, any>;
  const effectiveCoverId = coverId ?? studioCoverId;
  const customGap = themeOverrides?.layout?.gap ?? 8;

  const activeCoverPhoto = photos.find((p) => p.id === coverPhotoId) || photos[0];
  const coverPhoto =
    activeCoverPhoto?.storageKey && !activeCoverPhoto.storageKey.includes('placeholder.svg')
      ? {
          storageKey: activeCoverPhoto.storageKey,
          width: activeCoverPhoto.width,
          height: activeCoverPhoto.height,
          mimeType: activeCoverPhoto.mimeType,
        }
      : undefined;

  // Mesma resolução da galeria pública (gallery-access + ClientDeliverGallery).
  const previewProps = {
    type: 'entrega' as const,
    view,
    onViewChange: setView,
    coverId: effectiveCoverId,
    coverPhoto,
    photos: photos.slice(0, 24),
    galleryId,
    sessionName: sessionName || 'Ensaio Fotográfico',
    subtitle,
    category,
    sessionDate: eventDate,
    studioName: studioSettings?.studioName || 'Lunari Studio',
    studioLogoUrl: studioSettings?.studioLogo,
    fontId: sessionFont,
    titleCaseMode,
    themeId: useCustomTheme ? activeThemeId : studioThemeId,
    themeOverrides: useCustomTheme ? themeOverrides : accountOverrides,
    gap: useCustomTheme ? customGap : accountOverrides.layout?.gap ?? studioSettings?.defaultPhotoSpacing ?? 8,
    primaryColor: studioSettings?.customTheme?.primaryColor,
    backgroundMode: clientMode,
    coverVideo,
    ctaLabel: coverCinema?.ctaLabel,
    contentPosition: coverCinema?.contentPosition,
    overlayIntensity: coverCinema?.overlayIntensity,
  };

  const saveVideo = async (patch: Record<string, unknown>) => {
    const next = { ...coverVideo, ...patch };
    if (onUpdateCoverVideo) await onUpdateCoverVideo(next);
    else setCoverVideo?.(next);
  };

  return (
    <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-start">
      <div className="min-w-0 space-y-8">
        <div className="lg:hidden">
          <GalleryPreviewDrawer {...previewProps} />
        </div>

        <Block title="Capa" description="A primeira tela que o cliente vê.">
          <OptionList
            aria-label="Capa da galeria"
            items={[
              {
                value: INHERIT,
                label: 'Padrão do estúdio',
                description: `${studioCover.name} — definido em Personalização`,
                glyph: studioCover.Thumbnail,
                tag: 'Padrão',
              },
              ...COVER_LIST.map((c) => ({ value: c.id, label: c.name, description: c.description, glyph: c.Thumbnail })),
            ]}
            value={coverId ?? INHERIT}
            onValueChange={(v) => {
              setView('cover');
              setCoverId(v === INHERIT ? null : v);
            }}
          />
        </Block>

        {effectiveCoverId === 'cinema' && (
          <Block title="Vídeo da capa" description="Paisagem (16:9) para computador; vertical (9:16) opcional para celular.">
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <CoverVideoUploader
                galleryId={galleryId}
                contextType="gallery-cover-video"
                value={coverVideo?.desktopKey ? { key: coverVideo.desktopKey, url: undefined } : null}
                onChange={(data) => saveVideo({ desktopKey: data?.key || null, desktopSize: data?.sizeBytes || null })}
                accept="video/mp4,video/webm,video/quicktime"
                maxSizeMB={50}
                label="Vídeo principal (computador)"
                description="Formato paisagem (16:9). Obrigatório."
              />
              <CoverVideoUploader
                galleryId={galleryId}
                contextType="gallery-cover-video"
                value={coverVideo?.mobileKey ? { key: coverVideo.mobileKey, url: undefined } : null}
                onChange={(data) => saveVideo({ mobileKey: data?.key || null, mobileSize: data?.sizeBytes || null })}
                accept="video/mp4,video/webm,video/quicktime"
                maxSizeMB={50}
                label="Vídeo vertical (celular)"
                description="Recomendado para melhor enquadramento (9:16). Opcional."
              />
              <CoverVideoUploader
                galleryId={galleryId}
                contextType="gallery-cover-poster"
                value={coverVideo?.posterKey ? { key: coverVideo.posterKey, url: undefined } : null}
                onChange={(data) => saveVideo({ posterKey: data?.key || null })}
                accept="image/jpeg,image/png,image/webp"
                maxSizeMB={2}
                label="Pôster"
                description="Mostrado antes do vídeo carregar. Sem ele, usa a foto de capa."
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Texto do botão</p>
                <Input
                  placeholder="Ver galeria"
                  maxLength={24}
                  value={coverCinema?.ctaLabel || ''}
                  onChange={(e) => setCoverCinema?.({ ...coverCinema, ctaLabel: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Posição do texto</p>
                <SegmentedControl
                  aria-label="Posição do texto"
                  variant="subtle"
                  size="sm"
                  options={[
                    { value: 'bottom-left', label: 'Inferior esq.' },
                    { value: 'bottom-center', label: 'Inferior centro' },
                    { value: 'center', label: 'Centro' },
                  ]}
                  value={coverCinema?.contentPosition || 'bottom-left'}
                  onValueChange={(v) => setCoverCinema?.({ ...coverCinema, contentPosition: v })}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Escurecimento do vídeo</p>
                <SegmentedControl
                  aria-label="Escurecimento do vídeo"
                  variant="subtle"
                  size="sm"
                  options={[
                    { value: 'soft', label: 'Suave' },
                    { value: 'medium', label: 'Médio' },
                    { value: 'strong', label: 'Forte' },
                  ]}
                  value={coverCinema?.overlayIntensity || 'medium'}
                  onValueChange={(v) => setCoverCinema?.({ ...coverCinema, overlayIntensity: v })}
                />
              </div>
            </div>
          </Block>
        )}

        <Block title="Formato da grade" description="Como as fotos se organizam abaixo da capa.">
          <OptionList
            aria-label="Formato da grade de fotos"
            items={[
              {
                value: INHERIT,
                label: 'Padrão do estúdio',
                description: `${studioTheme.label} — definido em Personalização`,
                glyph: studioTheme.glyph,
                tag: 'Padrão',
              },
              ...GRID_STYLE_OPTIONS,
            ]}
            value={useCustomTheme ? activeThemeId : INHERIT}
            onValueChange={(v) => {
              setView('photos');
              if (v === INHERIT) {
                setUseCustomTheme(false);
              } else {
                setUseCustomTheme(true);
                setActiveThemeId(v);
              }
            }}
          />
          {useCustomTheme && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-foreground">Espaçamento entre fotos</p>
              <div className="flex items-center gap-4">
                <Slider
                  aria-label="Espaçamento entre fotos"
                  value={[customGap]}
                  onValueChange={(vals) => {
                    setView('photos');
                    setThemeOverrides({ ...themeOverrides, layout: { ...(themeOverrides?.layout || {}), gap: vals[0] } });
                  }}
                  min={0}
                  max={40}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 shrink-0 rounded-md border border-border bg-muted/40 py-1 text-center font-mono text-xs tabular-nums text-foreground">
                  {customGap}px
                </span>
              </div>
            </div>
          )}
        </Block>

        <Block title="Tipografia do título">
          <FontSelect
            value={sessionFont}
            onChange={setSessionFont}
            previewText={sessionName || 'Ensaio Fotográfico'}
            titleCaseMode={titleCaseMode}
            onTitleCaseModeChange={setTitleCaseMode}
          />
        </Block>

        <Block title="Modo de exibição">
          <SegmentedControl
            aria-label="Modo de exibição"
            variant="subtle"
            options={[
              { value: 'light', label: 'Claro', icon: Sun },
              { value: 'dark', label: 'Escuro', icon: Moon },
            ]}
            value={clientMode}
            onValueChange={(v) => setClientMode(v as 'light' | 'dark')}
          />
        </Block>

        <div className="flex flex-col gap-2 border-t border-border pt-6 sm:flex-row">
          <Button onClick={onSave} disabled={saving} className="gap-2 rounded-xl sm:flex-1">
            <Save className="h-4 w-4" />
            Salvar design
          </Button>
          {publicToken && (
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => window.open(generatePublicLink({ type: 'gallery', token: publicToken, profile }), '_blank')}
            >
              <Eye className="h-4 w-4" />
              Ver link público
            </Button>
          )}
        </div>
      </div>

      <aside className="hidden lg:sticky lg:top-6 lg:block">
        <GalleryPreviewPanel {...previewProps} />
      </aside>
    </div>
  );
}
