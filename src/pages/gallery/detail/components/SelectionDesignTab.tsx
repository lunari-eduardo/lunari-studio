import { useEffect, useState } from 'react';
import { Smartphone, Monitor, Sparkles, LayoutTemplate, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CoverCatalog } from '@/components/deliver/CoverCatalog';
import { CoverRenderer } from '@/components/deliver/covers/CoverRenderer';
import { IframePreview } from '@/components/deliver/IframePreview';
import { ThemePreviewCanvas } from '@/components/dashboard/themes/ThemePreviewCanvas';
import { THEME_REGISTRY, DEFAULT_THEME_ID } from '@/components/gallery/themes/registry';
import {
  SELECTION_COVER_REGISTRY,
  SELECTION_COVER_LIST,
  DEFAULT_SELECTION_COVER_ID,
} from '@/components/gallery/covers/registry';
import { getDemoCoverPhoto } from '@/lib/demoCoverPhoto';
import { PRESET_COLORS } from '@/components/settings/customization/CustomizationAppearanceTab';
import { useSupabaseGalleries, Galeria, GaleriaPhoto } from '@/hooks/useSupabaseGalleries';
import { useSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';

interface SelectionDesignTabProps {
  gallery: Galeria;
  photos: GaleriaPhoto[];
}

export function SelectionDesignTab({ gallery, photos }: SelectionDesignTabProps) {
  const { updateGallery } = useSupabaseGalleries({ enabled: false });
  const { settings: studioSettings } = useSettings();

  const [useCustomTheme, setUseCustomTheme] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string>(DEFAULT_THEME_ID);
  const [themeOverrides, setThemeOverrides] = useState<any>({});
  const [coverId, setCoverId] = useState<string | null>(null);
  const [previewViewport, setPreviewViewport] = useState<'mobile' | 'desktop'>('desktop');
  const [previewTab, setPreviewTab] = useState<'cover' | 'grid'>('cover');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUseCustomTheme(gallery.useCustomTheme || false);
    setActiveThemeId(gallery.themeId || DEFAULT_THEME_ID);
    setThemeOverrides(gallery.themeOverrides || {});
    setCoverId(gallery.coverId ?? null);
  }, [gallery.id]);

  const activeTheme = THEME_REGISTRY[activeThemeId] || THEME_REGISTRY[DEFAULT_THEME_ID];

  const photographerCustomColor =
    (studioSettings as any)?.customTheme?.primaryColor || (studioSettings as any)?.primaryColor;
  const primaryColor = useCustomTheme
    ? (themeOverrides?.palette?.primary || photographerCustomColor || (activeTheme as any)?.palette?.primary || '#C6A36A')
    : (photographerCustomColor || (activeTheme as any)?.palette?.primary || '#C6A36A');

  const resolvedCoverId = coverId ?? studioSettings?.defaultSelectionCoverId ?? DEFAULT_SELECTION_COVER_ID;
  const firstPhoto = photos[0] || null;
  const demoPhoto = getDemoCoverPhoto('horizontal');
  const coverPhoto = firstPhoto
    ? {
        storageKey: firstPhoto.storageKey || demoPhoto.storageKey,
        previewPath: (firstPhoto as any).preview_path || (firstPhoto as any).previewPath || firstPhoto.storageKey || demoPhoto.previewPath,
        width: firstPhoto.width || demoPhoto.width,
        height: firstPhoto.height || demoPhoto.height,
      }
    : demoPhoto;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGallery({
        id: gallery.id,
        data: {
          themeId: useCustomTheme ? activeThemeId : null,
          useCustomTheme,
          themeOverrides,
          coverId,
        },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 mt-2">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Coluna da Esquerda: Controles */}
        <div className="lg:col-span-1 space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Herança de Tema</h3>
            <p className="text-sm text-muted-foreground">
              Decida se esta galeria segue as regras da sua conta ou tem estilo próprio.
            </p>
            <div className="space-y-3">
              <div
                className={cn(
                  'p-4 border rounded-xl cursor-pointer transition-all',
                  !useCustomTheme ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted'
                )}
                onClick={() => setUseCustomTheme(false)}
              >
                <p className="font-medium text-sm">Herdar tema padrão</p>
                <p className="text-xs text-muted-foreground">Usa o tema definido nas configurações da sua conta.</p>
              </div>
              <div
                className={cn(
                  'p-4 border rounded-xl cursor-pointer transition-all',
                  useCustomTheme ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted'
                )}
                onClick={() => setUseCustomTheme(true)}
              >
                <p className="font-medium text-sm">Personalizar esta galeria</p>
                <p className="text-xs text-muted-foreground">Escolha um tema e ajustes específicos apenas para este trabalho.</p>
              </div>
            </div>
          </div>

          {useCustomTheme && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Selecione o Preset</Label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(THEME_REGISTRY).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setActiveThemeId(t.id)}
                      className={cn(
                        'flex flex-col gap-2 p-3 border rounded-xl cursor-pointer transition-all text-center',
                        activeThemeId === t.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'
                      )}
                    >
                      <span className="text-sm font-medium">{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <Label className="text-base font-semibold">Ajustes Visuais</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Cor de Destaque / Botões</Label>
                    <span className="text-xs font-mono uppercase text-muted-foreground">{primaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() =>
                          setThemeOverrides({ ...themeOverrides, palette: { ...(themeOverrides.palette || {}), primary: c.value } })
                        }
                        className={cn(
                          'w-6 h-6 rounded-full border transition-all cursor-pointer hover:scale-110',
                          primaryColor.toLowerCase() === c.value.toLowerCase()
                            ? 'ring-2 ring-primary ring-offset-2 scale-110 border-transparent'
                            : 'border-border/60 opacity-85 hover:opacity-100'
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Espaçamento (Gap)</Label>
                    <span className="text-xs font-mono">{themeOverrides?.layout?.gap ?? 8}px</span>
                  </div>
                  <Slider
                    value={[themeOverrides?.layout?.gap ?? 8]}
                    onValueChange={(vals) =>
                      setThemeOverrides({ ...themeOverrides, layout: { ...(themeOverrides.layout || {}), gap: vals[0] } })
                    }
                    min={0}
                    max={40}
                    step={1}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#cbb384]" />
              <Label className="text-base font-semibold">Capa da Galeria</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Cabeçalho exibido ao cliente no topo da galeria de seleção.
            </p>
            <CoverCatalog
              selectedCoverId={coverId}
              onSelect={setCoverId}
              coverList={SELECTION_COVER_LIST}
              defaultCoverId={DEFAULT_SELECTION_COVER_ID}
            />
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSave} className="w-full gap-2 rounded-xl" disabled={saving}>
              <Save className="h-4 w-4" />
              Salvar Design
            </Button>
          </div>
        </div>

        {/* Coluna da Direita: Preview */}
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-6 self-start">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center bg-muted p-1 rounded-lg">
              <Button
                variant={previewTab === 'cover' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('h-7 px-3 text-xs font-medium rounded-md gap-1.5', previewTab === 'cover' && 'bg-background shadow-xs font-semibold')}
                onClick={() => setPreviewTab('cover')}
              >
                <Sparkles className="h-3.5 w-3.5 text-[#cbb384]" />
                Capa
              </Button>
              <Button
                variant={previewTab === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('h-7 px-3 text-xs font-medium rounded-md gap-1.5', previewTab === 'grid' && 'bg-background shadow-xs font-semibold')}
                onClick={() => setPreviewTab('grid')}
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                Grid de Fotos
              </Button>
            </div>

            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={previewViewport === 'mobile' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('h-7 px-2.5 text-xs font-medium rounded-md gap-1.5', previewViewport === 'mobile' && 'bg-background shadow-xs font-semibold')}
                onClick={() => setPreviewViewport('mobile')}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Smartphone</span>
              </Button>
              <Button
                variant={previewViewport === 'desktop' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('h-7 px-2.5 text-xs font-medium rounded-md gap-1.5', previewViewport === 'desktop' && 'bg-background shadow-xs font-semibold')}
                onClick={() => setPreviewViewport('desktop')}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </Button>
            </div>
          </div>

          <div className="min-h-[520px] h-[calc(100vh-200px)] max-h-[700px] bg-zinc-950/85 dark:bg-black/95 rounded-2xl border border-border/60 overflow-hidden relative flex items-center justify-center p-3 sm:p-6">
            <div
              className={cn(
                'bg-background overflow-hidden transition-all duration-300 ease-in-out relative flex flex-col',
                previewViewport === 'mobile'
                  ? 'w-[320px] sm:w-[340px] aspect-[9/16] max-h-full rounded-[28px] ring-1 ring-border/50 shadow-2xl'
                  : 'w-full max-w-[960px] aspect-[16/9] max-h-full rounded-xl shadow-2xl border border-border/40'
              )}
            >
              {previewTab === 'cover' ? (
                <IframePreview title="Preview da Capa" viewport={previewViewport}>
                  <CoverRenderer
                    registry={SELECTION_COVER_REGISTRY}
                    coverId={resolvedCoverId}
                    coverPhoto={coverPhoto}
                    sessionName={gallery.nomeSessao || 'Sessão de Fotos'}
                    studioName={studioSettings?.studioName || 'Lunari Studio'}
                    studioLogoUrl={studioSettings?.studioLogo || null}
                    isDark={false}
                    primaryColor={primaryColor}
                    onEnter={() => {}}
                  />
                </IframePreview>
              ) : (
                <div className="w-full h-full relative overflow-hidden flex flex-col">
                  <ThemePreviewCanvas
                    themeId={activeThemeId}
                    themeOverrides={themeOverrides}
                    viewport={previewViewport}
                    skipHero={true}
                    isBlueprint={false}
                    previewPhotos={photos.slice(0, 12)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
