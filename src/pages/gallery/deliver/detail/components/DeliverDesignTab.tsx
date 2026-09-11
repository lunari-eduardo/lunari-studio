import { useState } from 'react';
import { Smartphone, Tablet, Monitor, Eye, Save, Sparkles, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CoverCatalog } from '@/components/deliver/CoverCatalog';
import { CoverRenderer } from '@/components/deliver/covers/CoverRenderer';
import { IframePreview } from '@/components/deliver/IframePreview';
import { ThemePreviewCanvas } from '@/components/dashboard/themes/ThemePreviewCanvas';
import { THEME_REGISTRY } from '@/components/gallery/themes/registry';
import { FontSelect, getFontFamilyById } from '@/components/FontSelect';
import { GaleriaPhoto } from '@/hooks/useSupabaseGalleries';
import { TitleCaseMode } from '@/types/gallery';
import { PhotoPaths } from '@/lib/photoUrl';
import { cn } from '@/lib/utils';

interface DeliverDesignTabProps {
  useCustomTheme: boolean;
  setUseCustomTheme: (custom: boolean) => void;
  activeThemeId: string;
  setActiveThemeId: (id: string) => void;
  themeOverrides: any;
  setThemeOverrides: (overrides: any) => void;
  coverId: string | null;
  setCoverId: (id: string | null) => void;
  previewViewport: 'mobile' | 'tablet' | 'desktop';
  setPreviewViewport: (vp: 'mobile' | 'tablet' | 'desktop') => void;
  photos: GaleriaPhoto[];
  publicToken?: string | null;
  sessionFont?: string;
  setSessionFont?: (font: string) => void;
  sessionName?: string;
  titleCaseMode?: TitleCaseMode;
  setTitleCaseMode?: (mode: TitleCaseMode) => void;
  subtitle?: string;
  category?: string;
  eventDate?: Date;
  coverPhotoId?: string | null;
  studioSettings?: any;
  saving: boolean;
  onSave: () => void;
}

export function DeliverDesignTab({
  useCustomTheme,
  setUseCustomTheme,
  activeThemeId,
  setActiveThemeId,
  themeOverrides,
  setThemeOverrides,
  coverId,
  setCoverId,
  previewViewport,
  setPreviewViewport,
  photos,
  publicToken,
  sessionFont = 'playfair',
  setSessionFont,
  sessionName = 'Ensaio Fotográfico',
  titleCaseMode = 'normal',
  setTitleCaseMode,
  subtitle,
  category,
  eventDate,
  coverPhotoId,
  studioSettings,
  saving,
  onSave,
}: DeliverDesignTabProps) {
  const [previewTab, setPreviewTab] = useState<'cover' | 'grid'>('cover');

  const activeTheme = THEME_REGISTRY[activeThemeId] || THEME_REGISTRY['lunari'];
  const isDarkTheme = activeTheme?.backgroundMode === 'dark' || themeOverrides?.backgroundMode === 'dark';
  const primaryColor = themeOverrides?.palette?.primary || themeOverrides?.primaryColor || activeTheme?.palette?.primary || '#C6A36A';
  const resolvedFontFamily = getFontFamilyById(sessionFont);

  // Foto de capa selecionada
  const activeCoverPhoto = photos.find((p) => p.id === coverPhotoId) || photos[0] || null;
  const coverPhotoPaths: PhotoPaths | null = activeCoverPhoto
    ? {
        storageKey: activeCoverPhoto.storage_key,
        previewPath: activeCoverPhoto.preview_path,
        width: activeCoverPhoto.width,
        height: activeCoverPhoto.height,
      }
    : null;

  const viewportWidths = {
    mobile: 'w-[375px]',
    tablet: 'w-[768px]',
    desktop: 'w-full',
  };

  return (
    <div className="space-y-8 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna da Esquerda: Controles de Customização */}
        <div className="lg:col-span-1 space-y-8">
          {/* Herança de Tema */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Herança de Tema</h3>
            <p className="text-sm text-muted-foreground">
              Decida se esta galeria segue as regras da sua conta ou tem estilo próprio.
            </p>

            <div className="space-y-3">
              <div
                className={cn(
                  'p-4 border rounded-xl cursor-pointer transition-all',
                  !useCustomTheme
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:bg-muted'
                )}
                onClick={() => setUseCustomTheme(false)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      !useCustomTheme ? 'border-primary' : 'border-muted-foreground'
                    )}
                  >
                    {!useCustomTheme && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">Herdar tema padrão</p>
                    <p className="text-xs text-muted-foreground">
                      Usa o tema definido nas configurações da sua conta.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'p-4 border rounded-xl cursor-pointer transition-all',
                  useCustomTheme
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:bg-muted'
                )}
                onClick={() => setUseCustomTheme(true)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      useCustomTheme ? 'border-primary' : 'border-muted-foreground'
                    )}
                  >
                    {useCustomTheme && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">Personalizar esta galeria</p>
                    <p className="text-xs text-muted-foreground">
                      Escolha um tema e ajustes específicos apenas para este trabalho.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preset de Tema (quando personalizado) */}
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
                        activeThemeId === t.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-primary/50'
                      )}
                    >
                      <span className="text-sm font-medium">{t.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {t.layout.engine === 'editorial-grid' ? 'Editorial' : 'Classic'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <Label className="text-base font-semibold">Ajustes Visuais</Label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Espaçamento (Gap)</Label>
                    <span className="text-xs font-mono">{themeOverrides?.layout?.gap ?? 8}px</span>
                  </div>
                  <Slider
                    value={[themeOverrides?.layout?.gap ?? 8]}
                    onValueChange={(vals) =>
                      setThemeOverrides({
                        ...themeOverrides,
                        layout: { ...(themeOverrides.layout || {}), gap: vals[0] },
                      })
                    }
                    min={0}
                    max={40}
                    step={1}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Capa da Galeria de Entrega (Hero) */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#cbb384]" />
              <Label className="text-base font-semibold">Capa da Galeria (Hero)</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Apresentação inicial em tela cheia independente do tema de fotos.
            </p>
            <CoverCatalog selectedCoverId={coverId} onSelect={setCoverId} />
          </div>

          {/* Tipografia da Sessão */}
          {setSessionFont && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-base font-semibold">Tipografia da Sessão</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Família tipográfica aplicada ao título da sessão na capa.
                </p>
              </div>
              <FontSelect
                value={sessionFont}
                onChange={setSessionFont}
                previewText={sessionName || 'Ensaio Gestante'}
                titleCaseMode={titleCaseMode}
                onTitleCaseModeChange={setTitleCaseMode}
              />
            </div>
          )}

          {/* Botão de Salvar */}
          <div className="pt-4 border-t">
            <Button onClick={onSave} className="w-full gap-2 rounded-xl" disabled={saving}>
              <Save className="h-4 w-4" />
              Salvar Design
            </Button>
          </div>
        </div>

        {/* Coluna da Direita: Área de Prévia Dinâmica */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              {/* Alternador de Modo de Prévia: Capa x Grid */}
              <div className="flex items-center bg-muted p-1 rounded-lg">
                <Button
                  variant={previewTab === 'cover' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-7 px-3 text-xs font-medium rounded-md gap-1.5',
                    previewTab === 'cover' && 'bg-background shadow-xs font-semibold'
                  )}
                  onClick={() => setPreviewTab('cover')}
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#cbb384]" />
                  Capa (Hero)
                </Button>
                <Button
                  variant={previewTab === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-7 px-3 text-xs font-medium rounded-md gap-1.5',
                    previewTab === 'grid' && 'bg-background shadow-xs font-semibold'
                  )}
                  onClick={() => setPreviewTab('grid')}
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  Grid de Fotos
                </Button>
              </div>

              <span className="text-xs text-muted-foreground hidden sm:inline">
                {previewTab === 'cover' ? 'Visualização da Capa' : activeTheme?.name}
              </span>
            </div>

            {/* Alternador de Viewport */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
              <Button
                variant={previewViewport === 'mobile' ? 'secondary' : 'ghost'}
                size="icon"
                className={cn('h-8 w-8', previewViewport === 'mobile' && 'bg-background shadow-sm')}
                onClick={() => setPreviewViewport('mobile')}
                title="Visualização Mobile"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
              <Button
                variant={previewViewport === 'tablet' ? 'secondary' : 'ghost'}
                size="icon"
                className={cn('h-8 w-8', previewViewport === 'tablet' && 'bg-background shadow-sm')}
                onClick={() => setPreviewViewport('tablet')}
                title="Visualização Tablet"
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={previewViewport === 'desktop' ? 'secondary' : 'ghost'}
                size="icon"
                className={cn('h-8 w-8', previewViewport === 'desktop' && 'bg-background shadow-sm')}
                onClick={() => setPreviewViewport('desktop')}
                title="Visualização Desktop"
              >
                <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Canvas da Prévia */}
          <div className="min-h-[600px] h-[72vh] bg-zinc-200 dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden relative group shadow-lg flex items-center justify-center p-2 sm:p-6">
            <div
              className={cn(
                'h-full bg-background shadow-2xl border border-border/40 overflow-hidden transition-all duration-500 ease-in-out relative flex flex-col',
                viewportWidths[previewViewport]
              )}
            >
              {previewTab === 'cover' ? (
                /* Prévia Interativa da Capa com Paridade Total usando Iframe para isolamento de CSS (vh/vw e media queries) */
                <IframePreview title="Preview da Capa">
                  <CoverRenderer
                    coverId={coverId}
                    coverPhoto={coverPhotoPaths}
                    sessionName={sessionName || 'Ensaio Fotográfico'}
                    subtitle={subtitle}
                    sessionDate={eventDate}
                    category={category}
                    studioName={studioSettings?.studio_name || 'Lunari Studio'}
                    sessionFont={resolvedFontFamily}
                    titleCaseMode={titleCaseMode}
                    isDark={isDarkTheme}
                    primaryColor={primaryColor}
                    onEnter={() => setPreviewTab('grid')}
                  />
                </IframePreview>
              ) : (
                /* Prévia do Grid de Fotos do Tema */
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

            {/* Ação rápida para ver link público em nova aba */}
            {publicToken && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-30 pointer-events-none group-hover:pointer-events-auto">
                <Button
                  variant="secondary"
                  className="gap-2 rounded-full shadow-lg"
                  onClick={() => window.open(`/g/${publicToken}`, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                  Ver link público
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
