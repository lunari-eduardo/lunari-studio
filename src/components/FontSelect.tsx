import { Type, CaseSensitive, CaseUpper } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger } from
'@/components/ui/tooltip';
import { TitleCaseMode } from '@/types/gallery';
import { applyTitleCase } from '@/lib/textTransform';

export interface FontOption {
  id: string;
  name: string;
  family: string;
  weightTitle: number;
  letterSpacing: string;
  affinity: string;
  category: string;
}

export const GALLERY_FONTS: FontOption[] = [
  {
    id: 'bodoni',
    name: 'Bodoni Moda',
    family: '"Bodoni Moda", Didot, "Times New Roman", serif',
    weightTitle: 600,
    letterSpacing: '-0.01em',
    affinity: 'Editorial',
    category: 'Didone alto contraste',
  },
  {
    id: 'playfair',
    name: 'Playfair Display',
    family: '"Playfair Display", Georgia, serif',
    weightTitle: 500,
    letterSpacing: '-0.005em',
    affinity: 'Editorial / Díptico',
    category: 'Serif clássica editorial',
  },
  {
    id: 'cormorant-garamond',
    name: 'Cormorant Garamond',
    family: '"Cormorant Garamond", Garamond, serif',
    weightTitle: 500,
    letterSpacing: '0',
    affinity: 'Passe-partout',
    category: 'Serif fina e romântica',
  },
  {
    id: 'dm-serif',
    name: 'DM Serif Display',
    family: '"DM Serif Display", Georgia, serif',
    weightTitle: 400,
    letterSpacing: '-0.01em',
    affinity: 'Cinemática',
    category: 'Serif densa de manchete',
  },
  {
    id: 'instrument-serif',
    name: 'Instrument Serif',
    family: '"Instrument Serif", Georgia, serif',
    weightTitle: 400,
    letterSpacing: '0',
    affinity: 'Editorial',
    category: 'Serif moderna condensada',
  },
  {
    id: 'syne',
    name: 'Syne',
    family: '"Syne", system-ui, sans-serif',
    weightTitle: 700,
    letterSpacing: '-0.02em',
    affinity: 'Cinemática',
    category: 'Sans display geométrica',
  },
  {
    id: 'jost',
    name: 'Jost',
    family: '"Jost", system-ui, sans-serif',
    weightTitle: 400,
    letterSpacing: '0.02em',
    affinity: 'Díptico',
    category: 'Sans geométrica Bauhaus',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    family: '"Outfit", system-ui, sans-serif',
    weightTitle: 400,
    letterSpacing: '0.01em',
    affinity: 'Passe-partout',
    category: 'Sans contemporânea',
  },
  {
    id: 'marcellus',
    name: 'Marcellus',
    family: '"Marcellus", "Times New Roman", serif',
    weightTitle: 400,
    letterSpacing: '0.04em',
    affinity: 'Díptico',
    category: 'Romana lapidar, luxo',
  },
  {
    id: 'italiana',
    name: 'Italiana',
    family: '"Italiana", Didot, serif',
    weightTitle: 400,
    letterSpacing: '0.08em',
    affinity: 'Passe-partout',
    category: 'Display fina, alta-costura',
  },
];

const LEGACY_FONT_ALIASES: Record<string, string> = {
  cormorant: 'cormorant-garamond',
  'source-serif': 'playfair',
  imperial: 'instrument-serif',
  league: 'italiana',
  allura: 'cormorant-garamond',
  amatic: 'marcellus',
  shadows: 'syne',
  raleway: 'jost',
  quicksand: 'outfit',
};

export const DEFAULT_GALLERY_FONT = GALLERY_FONTS[1]; // Playfair Display

export function resolveFontId(fontId: string | undefined): string {
  if (!fontId) return DEFAULT_GALLERY_FONT.id;
  if (GALLERY_FONTS.some((f) => f.id === fontId)) return fontId;
  if (LEGACY_FONT_ALIASES[fontId]) return LEGACY_FONT_ALIASES[fontId];
  return DEFAULT_GALLERY_FONT.id;
}

export function getFontConfigById(fontId: string | undefined): FontOption {
  const resolvedId = resolveFontId(fontId);
  return GALLERY_FONTS.find((f) => f.id === resolvedId) || DEFAULT_GALLERY_FONT;
}

// Helper function to get font family from ID
export function getFontFamilyById(fontId: string | undefined): string {
  return getFontConfigById(fontId).family;
}

interface FontSelectProps {
  value: string;
  onChange: (value: string) => void;
  previewText?: string;
  titleCaseMode?: TitleCaseMode;
  onTitleCaseModeChange?: (mode: TitleCaseMode) => void;
}

const TITLE_CASE_MODES: {mode: TitleCaseMode;icon: typeof Type;label: string;}[] = [
  { mode: 'normal', icon: Type, label: 'Normal (como digitado)' },
  { mode: 'uppercase', icon: CaseSensitive, label: 'MAIÚSCULAS' },
  { mode: 'titlecase', icon: CaseUpper, label: 'Início De Palavras' }
];

export function FontSelect({
  value,
  onChange,
  previewText = 'Ensaio Gestante',
  titleCaseMode = 'normal',
  onTitleCaseModeChange
}: FontSelectProps) {
  const selectedFont = getFontConfigById(value);

  const currentModeIndex = TITLE_CASE_MODES.findIndex((m) => m.mode === titleCaseMode);
  const currentModeConfig = TITLE_CASE_MODES[currentModeIndex] || TITLE_CASE_MODES[0];
  const IconComponent = currentModeConfig.icon;

  const handleToggleCaseMode = () => {
    if (!onTitleCaseModeChange) return;
    const nextIndex = (currentModeIndex + 1) % TITLE_CASE_MODES.length;
    onTitleCaseModeChange(TITLE_CASE_MODES[nextIndex].mode);
  };

  const displayText = applyTitleCase(previewText, titleCaseMode);

  return (
    <div className="space-y-3">
      <Select value={resolveFontId(value)} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione uma fonte">
            <span style={{ fontFamily: selectedFont.family, fontWeight: selectedFont.weightTitle }}>
              {selectedFont.name}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {GALLERY_FONTS.map((font) => (
            <SelectItem
              key={font.id}
              value={font.id}
              className="py-2.5"
            >
              <div className="flex items-center justify-between w-full gap-4">
                <span
                  style={{ fontFamily: font.family, fontWeight: font.weightTitle }}
                  className="text-base"
                >
                  {font.name}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground opacity-60 font-sans shrink-0">
                  {font.affinity}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Preview Box with Case Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-muted/30 rounded-lg p-4 min-h-[56px] flex items-center">
          <span
            style={{
              fontFamily: selectedFont.family,
              fontWeight: selectedFont.weightTitle,
              letterSpacing: selectedFont.letterSpacing,
            }}
            className="text-xl md:text-2xl leading-tight"
          >
            {displayText || 'Preview'}
          </span>
        </div>
        {onTitleCaseModeChange && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleToggleCaseMode}
                  className="shrink-0 h-10 w-10"
                >
                  <IconComponent className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentModeConfig.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
