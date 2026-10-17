import { useState, type ReactNode } from 'react';
import type { PreviewView } from '@/components/gallery/preview/GalleryLivePreview';
import { Moon, Sun } from 'lucide-react';
import { FontSelect } from '@/components/FontSelect';
import { OptionList } from '@/components/ui/option-list';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { GalleryPreviewDrawer, GalleryPreviewPanel } from '@/components/gallery/preview/GalleryPreviewPanel';
import { COVER_LIST, COVER_REGISTRY, DEFAULT_COVER_ID } from '@/components/deliver/covers/registry';
import { GRID_STYLE_OPTIONS } from '@/components/gallery/themes/glyphs';
import { DEFAULT_THEME_ID } from '@/components/gallery/themes/registry';
import type { GlobalSettings, TitleCaseMode } from '@/types/gallery';

const INHERIT = '__studio_default';

interface DeliverCreateStep2VisualProps {
  coverId: string | null;
  setCoverId: (id: string | null) => void;
  useCustomTheme: boolean;
  setUseCustomTheme: (custom: boolean) => void;
  activeThemeId: string;
  setActiveThemeId: (id: string) => void;
  sessionFont: string;
  setSessionFont: (font: string) => void;
  titleCaseMode: TitleCaseMode;
  setTitleCaseMode: (mode: TitleCaseMode) => void;
  clientMode: 'light' | 'dark';
  setClientMode: (mode: 'light' | 'dark') => void;
  photoSpacing: number;
  settings?: GlobalSettings;
  sessionName: string;
  subtitle?: string;
  category?: string;
  eventDate?: Date;
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

export function DeliverCreateStep2Visual({
  coverId,
  setCoverId,
  useCustomTheme,
  setUseCustomTheme,
  activeThemeId,
  setActiveThemeId,
  sessionFont,
  setSessionFont,
  titleCaseMode,
  setTitleCaseMode,
  clientMode,
  setClientMode,
  photoSpacing,
  settings,
  sessionName,
  subtitle,
  category,
  eventDate,
}: DeliverCreateStep2VisualProps) {
  const studioCoverId = settings?.defaultCoverId || DEFAULT_COVER_ID;
  const studioCover = COVER_REGISTRY[studioCoverId] ?? COVER_REGISTRY[DEFAULT_COVER_ID];
  const studioThemeId = settings?.defaultThemeId || DEFAULT_THEME_ID;
  const studioTheme = GRID_STYLE_OPTIONS.find((t) => t.value === studioThemeId) ?? GRID_STYLE_OPTIONS[0];
  const accountOverrides = ((settings?.themeOverrides as any) || {}) as Record<string, any>;

  const effectiveCoverId = coverId ?? studioCoverId;
  const [view, setView] = useState<PreviewView>('cover');

  // Mesma resolução da galeria pública (gallery-access): tema herdado usa os ajustes da conta.
  const previewProps = {
    type: 'entrega' as const,
    view,
    onViewChange: setView,
    coverId: effectiveCoverId,
    sessionName: sessionName.trim() || 'Ensaio Fotográfico',
    subtitle,
    category,
    sessionDate: eventDate,
    studioName: settings?.studioName || 'Lunari Studio',
    studioLogoUrl: settings?.studioLogo,
    fontId: sessionFont,
    titleCaseMode,
    themeId: useCustomTheme ? activeThemeId : studioThemeId,
    themeOverrides: useCustomTheme ? {} : accountOverrides,
    gap: useCustomTheme ? photoSpacing : accountOverrides.layout?.gap ?? photoSpacing,
    primaryColor: settings?.customTheme?.primaryColor,
    backgroundMode: clientMode,
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-start">
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
          {effectiveCoverId === 'cinema' && (
            <p className="rounded-xl bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
              O vídeo da capa é enviado na próxima etapa, junto com as fotos.
            </p>
          )}
        </Block>

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
        </Block>

        <Block title="Tipografia do título">
          <FontSelect
            value={sessionFont}
            onChange={setSessionFont}
            previewText={sessionName.trim() || 'Ensaio Fotográfico'}
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
      </div>

      <aside className="hidden lg:sticky lg:top-6 lg:block">
        <GalleryPreviewPanel {...previewProps} />
      </aside>
    </div>
  );
}
