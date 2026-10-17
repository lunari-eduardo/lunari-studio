import { useMemo, useState } from 'react';
import { resolveGalleryColorTokens } from '@/components/gallery/themes/tokens';
import { GlobalSettings } from '@/types/gallery';
import { Sparkles, LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoverRenderer } from '@/components/deliver/covers/CoverRenderer';
import { COVER_REGISTRY, DEFAULT_COVER_ID } from '@/components/deliver/covers/registry';
import { SELECTION_COVER_REGISTRY, DEFAULT_SELECTION_COVER_ID } from '@/components/gallery/covers/registry';
import { ThemePreviewCanvas } from '@/components/dashboard/themes/ThemePreviewCanvas';
import { getDemoCoverPhoto, getDemoGridPhotos } from '@/lib/demoCoverPhoto';

interface GalleryThemePreviewBlockProps {
  settings: GlobalSettings;
  studioName?: string;
  studioLogoUrl?: string;
  borderRadius?: string;
  gap?: number;
}

/**
 * Preview real (não mais um mockup com ícones) que mostra como a galeria do
 * cliente fica com as configurações atuais — com um alternador para visualizar
 * como Entrega ou como Seleção, já que boa parte da página afeta os dois tipos.
 */
export function GalleryThemePreviewBlock({
  settings,
  studioName,
  studioLogoUrl,
  gap = 6,
}: GalleryThemePreviewBlockProps) {
  const [previewAs, setPreviewAs] = useState<'entrega' | 'selecao'>('entrega');
  const [previewTab, setPreviewTab] = useState<'cover' | 'grid'>('cover');

  const clientMode = settings.clientTheme === 'system' ? 'light' : (settings.clientTheme || 'light');
  const isDark = clientMode === 'dark';
  const primaryColor = settings.customTheme?.primaryColor || '#D1BE9F';

  const tokens = useMemo(
    () => resolveGalleryColorTokens(clientMode as 'light' | 'dark', primaryColor),
    [clientMode, primaryColor]
  );
  const bg = tokens['--gallery-bg'];
  const bgElevated = tokens['--gallery-bg-elevated'];
  const text = tokens['--gallery-text'];
  const border = tokens['--gallery-border'];

  const demoCoverPhoto = getDemoCoverPhoto('horizontal');
  // Reflete o slider "Espaçamento entre Fotos" (defaultPhotoSpacing) ao vivo no preview do grid.
  const gridThemeOverrides = {
    ...((settings.themeOverrides as any) || {}),
    layout: { ...((settings.themeOverrides as any)?.layout || {}), gap },
  };

  return (
    <div className="lunari-card p-5 space-y-4 shadow-sm border-border/70">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">Preview da Galeria</p>
          <p className="text-[11px] text-muted-foreground">Simulação em tempo real para o cliente</p>
        </div>
        <span
          className="text-[11px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1 shadow-2xs border"
          style={{ backgroundColor: bgElevated, color: text, borderColor: border }}
        >
          {isDark ? '🌙 Escuro' : '☀️ Claro'}
        </span>
      </div>

      {/* Ver como: Entrega / Seleção */}
      <div className="flex items-center bg-muted p-1 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setPreviewAs('entrega')}
          className={cn(
            'h-7 px-3 text-xs font-medium rounded-md transition-colors',
            previewAs === 'entrega' ? 'bg-background shadow-xs font-semibold' : 'text-muted-foreground'
          )}
        >
          Ver como Entrega
        </button>
        <button
          type="button"
          onClick={() => setPreviewAs('selecao')}
          className={cn(
            'h-7 px-3 text-xs font-medium rounded-md transition-colors',
            previewAs === 'selecao' ? 'bg-background shadow-xs font-semibold' : 'text-muted-foreground'
          )}
        >
          Ver como Seleção
        </button>
      </div>

      {previewAs === 'entrega' && (
        <div className="flex items-center bg-muted p-1 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setPreviewTab('cover')}
            className={cn(
              'h-6 px-2.5 text-[11px] font-medium rounded-md gap-1 flex items-center transition-colors',
              previewTab === 'cover' ? 'bg-background shadow-xs font-semibold' : 'text-muted-foreground'
            )}
          >
            <Sparkles className="h-3 w-3 text-[#cbb384]" />
            Capa
          </button>
          <button
            type="button"
            onClick={() => setPreviewTab('grid')}
            className={cn(
              'h-6 px-2.5 text-[11px] font-medium rounded-md gap-1 flex items-center transition-colors',
              previewTab === 'grid' ? 'bg-background shadow-xs font-semibold' : 'text-muted-foreground'
            )}
          >
            <LayoutTemplate className="h-3 w-3" />
            Grid
          </button>
        </div>
      )}

      {/* Frame da Galeria */}
      <div
        className="relative rounded-xl overflow-hidden border shadow-inner aspect-[3/4]"
        style={{ backgroundColor: bg, borderColor: border }}
      >
        {previewAs === 'selecao' || previewTab === 'cover' ? (
          <div className="absolute inset-0 scale-[0.35] origin-top-left w-[286%] h-[286%] pointer-events-none">
            <CoverRenderer
              registry={previewAs === 'selecao' ? SELECTION_COVER_REGISTRY : COVER_REGISTRY}
              coverId={
                previewAs === 'selecao'
                  ? settings.defaultSelectionCoverId || DEFAULT_SELECTION_COVER_ID
                  : settings.defaultCoverId || DEFAULT_COVER_ID
              }
              coverPhoto={demoCoverPhoto}
              fallbackPhoto={demoCoverPhoto}
              sessionName="Ensaio Fotográfico"
              studioName={studioName || 'Lunari Studio'}
              studioLogoUrl={studioLogoUrl}
              primaryColor={primaryColor}
              isDark={isDark}
              onEnter={() => {}}
            />
          </div>
        ) : (
          <ThemePreviewCanvas
            themeId={settings.defaultThemeId || 'lunari'}
            themeOverrides={gridThemeOverrides}
            viewport="desktop"
            skipHero={true}
            isBlueprint={false}
            previewPhotos={getDemoGridPhotos()}
          />
        )}
      </div>

      {previewAs === 'selecao' && (
        <p className="text-[11px] text-muted-foreground">
          A grade de fotos de Seleção usa o layout padrão da plataforma — este preview mostra só a capa.
        </p>
      )}

      {/* Paleta de Cores e Tokens */}
      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Paleta ativa:</span>
          <div className="flex items-center -space-x-1">
            <div
              className="w-4 h-4 rounded-full border shadow-2xs"
              style={{ backgroundColor: bg, borderColor: border }}
              title={`Fundo (${bg})`}
            />
            <div
              className="w-4 h-4 rounded-full border shadow-2xs"
              style={{ backgroundColor: bgElevated, borderColor: border }}
              title={`Superfície (${bgElevated})`}
            />
            <div
              className="w-4 h-4 rounded-full border shadow-2xs ring-1 ring-background"
              style={{ backgroundColor: primaryColor, borderColor: border }}
              title={`Cor Primária (${primaryColor})`}
            />
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground uppercase">{primaryColor}</span>
      </div>
    </div>
  );
}
