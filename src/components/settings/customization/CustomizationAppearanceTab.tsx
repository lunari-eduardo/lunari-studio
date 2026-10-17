import { useEffect, useState, type ReactNode } from 'react';
import { Sun, Moon, Monitor, Plus } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { FontSelect } from '@/components/FontSelect';
import { OptionList } from '@/components/ui/option-list';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  UnderlineTabs,
  UnderlineTabsContent,
  UnderlineTabsList,
  UnderlineTabsTrigger,
} from '@/components/ui/underline-tabs';
import { WatermarkSettings } from '@/components/settings/WatermarkSettings';
import { CustomColorPickerModal } from '@/components/settings/customization/CustomColorPickerModal';
import { GalleryPreviewDrawer, GalleryPreviewPanel } from '@/components/gallery/preview/GalleryPreviewPanel';
import type { PreviewGalleryType, PreviewView } from '@/components/gallery/preview/GalleryLivePreview';
import { COVER_LIST, DEFAULT_COVER_ID } from '@/components/deliver/covers/registry';
import { SELECTION_COVER_LIST, DEFAULT_SELECTION_COVER_ID } from '@/components/gallery/covers/registry';
import { GRID_STYLE_OPTIONS } from '@/components/gallery/themes/glyphs';
import { GlobalSettings, TitleCaseMode } from '@/types/gallery';
import { UpdateSettingsOptions } from '@/hooks/useGallerySettings';
import { cn } from '@/lib/utils';

interface CustomizationAppearanceTabProps {
  settings: GlobalSettings;
  updateSettings: (data: Partial<GlobalSettings>, options?: UpdateSettingsOptions) => void;
  studioLogoUrl?: string;
  studioName?: string;
}

// Cores padrão com nomes simples e diretos
const PRESET_COLORS = [
  { label: 'Dourado Lunari', value: '#D1BE9F' },
  { label: 'Marrom', value: '#804621' },
  { label: 'Terracota', value: '#c46426' },
  { label: 'Verde', value: '#99b691' },
  { label: 'Azul', value: '#6fb6bf' },
  { label: 'Lilás', value: '#b489bb' },
  { label: 'Grafite', value: '#343433' },
];

type Scope = 'geral' | 'entrega' | 'selecao';

const MODE_OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Automático', icon: Monitor },
];

const MODE_HINT: Record<string, string> = {
  light: 'A galeria abre sempre no modo claro.',
  dark: 'A galeria abre sempre no modo escuro.',
  system: 'Segue o modo claro ou escuro do dispositivo do cliente.',
};

const coverItems = (list: typeof COVER_LIST) =>
  list.map((c) => ({ value: c.id, label: c.name, description: c.description, glyph: c.Thumbnail }));

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-5 rounded-[20px] border border-border bg-card p-5 shadow-[0_8px_24px_rgba(0,0,0,0.03)] sm:p-6">
      <header>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CustomizationAppearanceTab({
  settings,
  updateSettings,
  studioLogoUrl,
  studioName,
}: CustomizationAppearanceTabProps) {
  const [scope, setScope] = useState<Scope>('geral');
  const [previewType, setPreviewType] = useState<PreviewGalleryType>('entrega');
  const [previewView, setPreviewView] = useState<PreviewView>('cover');
  const [titleCaseMode, setTitleCaseMode] = useState<TitleCaseMode>('normal');
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);

  const themeOverrides = ((settings.themeOverrides as any) || {}) as Record<string, any>;
  // O gap do tema (global) vence o defaultPhotoSpacing nas entregas; um único controle grava os dois.
  const savedGap = themeOverrides.layout?.gap ?? settings.defaultPhotoSpacing ?? 8;
  const [spacing, setSpacing] = useState<number>(savedGap);
  useEffect(() => setSpacing(savedGap), [savedGap]);

  const primaryColor = settings.customTheme?.primaryColor || '#D1BE9F';
  const preset = PRESET_COLORS.find((p) => p.value.toLowerCase() === primaryColor.toLowerCase());

  const changeScope = (next: string) => {
    setScope(next as Scope);
    if (next !== 'geral') setPreviewType(next as PreviewGalleryType);
  };

  const handlePrimaryColorChange = (color: string) => {
    const formatted = color.startsWith('#') ? color : `#${color}`;
    const current = settings.customTheme || {
      id: 'custom',
      name: 'Custom',
      backgroundMode: 'light' as const,
      accentColor: formatted,
      emphasisColor: formatted,
    };
    updateSettings({ themeType: 'custom', customTheme: { ...current, primaryColor: formatted } });
  };

  const commitSpacing = (value: number) => {
    const layout = { ...(themeOverrides.layout || {}), gap: value };
    delete (layout as any).density; // densidade vem sempre do estilo escolhido
    updateSettings({ defaultPhotoSpacing: value, themeOverrides: { ...themeOverrides, layout } as any });
  };

  const previewProps = {
    type: scope === 'geral' ? previewType : (scope as PreviewGalleryType),
    onTypeChange: scope === 'geral' ? setPreviewType : undefined,
    view: previewView,
    onViewChange: setPreviewView,
    coverId:
      (scope === 'geral' ? previewType : scope) === 'selecao'
        ? settings.defaultSelectionCoverId || DEFAULT_SELECTION_COVER_ID
        : settings.defaultCoverId || DEFAULT_COVER_ID,
    sessionName: 'Ensaio Fotográfico',
    category: 'Ensaio',
    studioName: studioName || 'Lunari Studio',
    studioLogoUrl,
    fontId: settings.lastSessionFont,
    titleCaseMode,
    themeId: settings.defaultThemeId || 'lunari',
    themeOverrides,
    gap: spacing,
    primaryColor,
    backgroundMode: (settings.clientTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark',
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start">
      <CustomColorPickerModal
        open={isColorModalOpen}
        onOpenChange={setIsColorModalOpen}
        currentColor={primaryColor}
        onApplyColor={handlePrimaryColorChange}
      />

      <div className="min-w-0">
        <UnderlineTabs value={scope} onValueChange={changeScope}>
          <UnderlineTabsList>
            <UnderlineTabsTrigger value="geral">Todas as galerias</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="entrega">Entrega</UnderlineTabsTrigger>
            <UnderlineTabsTrigger value="selecao">Seleção</UnderlineTabsTrigger>
          </UnderlineTabsList>

          <div className="pt-4 lg:hidden">
            <GalleryPreviewDrawer {...previewProps} />
          </div>

          <UnderlineTabsContent value="geral" className="mt-6 space-y-6">
            <Section title="Exibição para o cliente" description="Vale para galerias de entrega e de seleção.">
              <Field label="Modo de exibição" hint={MODE_HINT[settings.clientTheme || 'system']}>
                <SegmentedControl
                  aria-label="Modo de exibição"
                  variant="subtle"
                  options={MODE_OPTIONS}
                  value={settings.clientTheme || 'system'}
                  onValueChange={(v) => updateSettings({ clientTheme: v as GlobalSettings['clientTheme'] })}
                />
              </Field>

              <Field
                label="Cor de destaque"
                hint={
                  <>
                    {preset?.label ?? 'Personalizada'} ·{' '}
                    <span className="font-mono uppercase">{primaryColor}</span> — botões e seleções da galeria
                  </>
                }
              >
                <div role="radiogroup" aria-label="Cor de destaque" className="flex flex-wrap items-center gap-2.5">
                  {PRESET_COLORS.map((p) => {
                    const selected = preset?.value === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={p.label}
                        title={p.label}
                        onClick={() => handlePrimaryColorChange(p.value)}
                        className={cn(
                          'h-8 w-8 rounded-full border border-black/10 transition-transform hover:scale-105',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                          selected && 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                        )}
                        style={{ backgroundColor: p.value }}
                      />
                    );
                  })}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!preset}
                    aria-label="Cor personalizada"
                    title="Cor personalizada"
                    onClick={() => setIsColorModalOpen(true)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                      preset
                        ? 'border-dashed border-border hover:border-accent-gold/60 hover:text-foreground'
                        : 'border-black/10 ring-2 ring-foreground ring-offset-2 ring-offset-card'
                    )}
                    style={preset ? undefined : { backgroundColor: primaryColor }}
                  >
                    {preset && <Plus className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </Field>

              <Field label="Tipografia do título" hint="Fonte sugerida ao criar novas galerias.">
                <FontSelect
                  value={settings.lastSessionFont || 'playfair'}
                  onChange={(font) => updateSettings({ lastSessionFont: font })}
                  previewText="Ensaio Fotográfico"
                  titleCaseMode={titleCaseMode}
                  onTitleCaseModeChange={setTitleCaseMode}
                />
              </Field>
            </Section>
          </UnderlineTabsContent>

          <UnderlineTabsContent value="entrega" className="mt-6 space-y-6">
            <Section title="Capa padrão" description="Primeira tela das novas galerias de entrega. Dá para trocar em cada galeria.">
              <OptionList
                aria-label="Capa padrão das galerias de entrega"
                items={coverItems(COVER_LIST)}
                value={settings.defaultCoverId || DEFAULT_COVER_ID}
                onValueChange={(id) => {
                  setPreviewView('cover');
                  updateSettings({ defaultCoverId: id });
                }}
              />
            </Section>

            <Section title="Grade de fotos" description="Como as fotos se organizam abaixo da capa.">
              <Field label="Estilo">
                <OptionList
                  aria-label="Estilo da grade de fotos"
                  items={GRID_STYLE_OPTIONS}
                  value={settings.defaultThemeId || 'lunari'}
                  onValueChange={(id) => {
                    setPreviewView('photos');
                    updateSettings({ defaultThemeId: id });
                  }}
                />
              </Field>
              <Field label="Espaçamento entre fotos">
                <div className="flex items-center gap-4">
                  <Slider
                    aria-label="Espaçamento entre fotos"
                    value={[spacing]}
                    onValueChange={(v) => {
                      setPreviewView('photos');
                      setSpacing(v[0]);
                    }}
                    onValueCommit={(v) => commitSpacing(v[0])}
                    min={0}
                    max={40}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 shrink-0 rounded-md border border-border bg-muted/40 py-1 text-center font-mono text-xs tabular-nums text-foreground">
                    {spacing}px
                  </span>
                </div>
              </Field>
            </Section>
          </UnderlineTabsContent>

          <UnderlineTabsContent value="selecao" className="mt-6 space-y-6">
            <Section title="Capa" description="Cabeçalho exibido no topo de todas as galerias de seleção.">
              <OptionList
                aria-label="Capa das galerias de seleção"
                items={coverItems(SELECTION_COVER_LIST)}
                value={settings.defaultSelectionCoverId || DEFAULT_SELECTION_COVER_ID}
                onValueChange={(id) => updateSettings({ defaultSelectionCoverId: id })}
              />
            </Section>

            <Section title="Proteção de imagem" description="Marca d'água aplicada às fotos enviadas para seleção.">
              <WatermarkSettings />
            </Section>
          </UnderlineTabsContent>
        </UnderlineTabs>
      </div>

      <aside className="hidden lg:sticky lg:top-6 lg:block">
        <GalleryPreviewPanel {...previewProps} />
      </aside>
    </div>
  );
}
