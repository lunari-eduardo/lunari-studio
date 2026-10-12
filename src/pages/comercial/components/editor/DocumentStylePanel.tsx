import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DESIGN_PRESETS } from '@/hooks/useProposalAI';
import { forCollection, useProposalCollection } from '../../blocks/collections';
import {
  DEFAULT_DESIGN_TOKENS,
  PROPOSAL_FONTS,
  ensureFontLoaded,
  type FontKind,
  type ProposalDesignTokens,
  type ProposalShape,
} from '../../blocks/design';

// ============================================================
// ESTILO DO DOCUMENTO (painel esquerdo, aba "Estilo")
// Tudo aqui vale para a proposta inteira: tema pronto, paleta,
// tipografia e cantos. O inspector da direita cuida só da seção.
// ============================================================

type ColorKey = keyof NonNullable<ProposalDesignTokens['colors']>;

const PALETTE: { key: ColorKey; label: string }[] = [
  { key: 'white', label: 'Branco' },
  { key: 'cream', label: 'Creme' },
  { key: 'linen', label: 'Linho' },
  { key: 'stone', label: 'Pedra' },
  { key: 'taupe', label: 'Taupe' },
  { key: 'accent', label: 'Acento' },
  { key: 'ink', label: 'Tinta' },
];

// Caligráficas ficam fora de títulos e corpo (legibilidade de textos longos); fontes só de
// caixa-alta (sem itálico) ficam fora dos destaques. `empty` = papel opcional que herda de outro.
const FONT_ROLES: {
  key: 'display' | 'highlight' | 'script' | 'body' | 'accent';
  label: string;
  fallback: string;
  kinds: FontKind[];
  allowDisplayOnly: boolean;
  empty?: string;
  sample: string;
}[] = [
  { key: 'display', label: 'Títulos', fallback: 'Playfair Display', kinds: ['serif', 'sans'], allowDisplayOnly: true, sample: 'Sessões de Natal' },
  { key: 'highlight', label: 'Destaques em itálico', fallback: '', kinds: ['serif', 'script'], allowDisplayOnly: false, empty: 'Itálico dos títulos', sample: 'memórias' },
  { key: 'script', label: 'Caligrafia (capa e assinatura)', fallback: '', kinds: ['script'], allowDisplayOnly: false, empty: 'Igual aos destaques', sample: 'Natal' },
  { key: 'body', label: 'Corpo do texto', fallback: 'Inter', kinds: ['serif', 'sans'], allowDisplayOnly: false, sample: 'Momentos em família' },
  { key: 'accent', label: 'Números e preços', fallback: '', kinds: ['serif', 'sans'], allowDisplayOnly: true, empty: 'Igual aos títulos', sample: 'R$ 1.190' },
];

const KIND_LABEL: Record<FontKind, string> = { serif: 'Serifadas', sans: 'Sem serifa', script: 'Caligráficas' };

const SHAPES: { value: ProposalShape | undefined; label: string; preview: string }[] = [
  { value: undefined, label: 'Original', preview: 'rounded-[2px]' },
  { value: 'sharp', label: 'Retos', preview: 'rounded-none' },
  { value: 'soft', label: 'Suaves', preview: 'rounded-[4px]' },
  { value: 'round', label: 'Redondos', preview: 'rounded-full' },
];

const sameColors = (a?: ProposalDesignTokens['colors'], b?: ProposalDesignTokens['colors']) =>
  !!a && !!b && PALETTE.every(({ key }) => a[key]?.toLowerCase() === b[key]?.toLowerCase());

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{children}</h3>;
}

export function DocumentStylePanel({
  tokens = {},
  onChange,
}: {
  tokens?: ProposalDesignTokens;
  onChange: (tokens: ProposalDesignTokens) => void;
}) {
  const titleCaseId = React.useId();
  const collection = useProposalCollection();
  // Proposta de coleção temática: temas dela; modelo padrão: os padrão (o aplicado nunca some)
  const presets = forCollection(DESIGN_PRESETS, collection, (p) => sameColors(tokens.colors, p.tokens.colors));
  const colors = { ...DEFAULT_DESIGN_TOKENS.colors, ...(tokens.colors ?? {}) };
  const setColor = (key: ColorKey, value: string) => onChange({ ...tokens, colors: { ...colors, [key]: value } });
  const setTypography = (updates: Partial<NonNullable<ProposalDesignTokens['typography']>>) =>
    onChange({ ...tokens, typography: { ...(tokens.typography ?? {}), ...updates } });

  return (
    <div className="space-y-7 px-4 pb-6 pt-2">
      {/* TEMAS PRONTOS */}
      <section className="space-y-3">
        <SectionTitle>Temas prontos</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => {
            const active = sameColors(tokens.colors, preset.tokens.colors);
            return (
              <button
                key={preset.name}
                type="button"
                title={preset.description}
                onClick={() => onChange(preset.tokens)}
                aria-pressed={active}
                className={cn(
                  'relative rounded-xl border p-2.5 text-left transition-colors',
                  active ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/40'
                )}
              >
                <div className="mb-1.5 flex items-center gap-1">
                  {(['cream', 'accent', 'ink'] as const).map((c) => (
                    <span
                      key={c}
                      className="h-3.5 w-3.5 rounded-full border border-black/5"
                      style={{ backgroundColor: preset.tokens.colors?.[c] }}
                    />
                  ))}
                  {active && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                </div>
                <span className="block text-[11px] font-medium leading-tight">{preset.name}</span>
                <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                  {preset.tokens.typography?.display} · {preset.tokens.typography?.body}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* PALETA */}
      <section className="space-y-3">
        <SectionTitle>Paleta</SectionTitle>
        <div className="grid grid-cols-4 gap-x-2 gap-y-3">
          {PALETTE.map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer flex-col items-center gap-1.5" title={`${label}: ${colors[key]}`}>
              <span
                className="relative h-9 w-9 rounded-full border border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-transform hover:scale-105"
                style={{ backgroundColor: colors[key] }}
              >
                <input
                  type="color"
                  aria-label={`Cor ${label}`}
                  value={colors[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
                />
              </span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </label>
          ))}
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Os fundos das seções usam estas cores; o texto se ajusta sozinho para manter a leitura.
        </p>
      </section>

      {/* TIPOGRAFIA */}
      <section className="space-y-3">
        <SectionTitle>Tipografia</SectionTitle>
        {FONT_ROLES.map(({ key, label, fallback, kinds, allowDisplayOnly, empty, sample }) => {
          const current: string = tokens.typography?.[key] || fallback;
          ensureFontLoaded(current); // a amostra abaixo usa a própria fonte
          const italic = key === 'highlight' && PROPOSAL_FONTS[current]?.kind !== 'script';
          return (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                value={current}
                onChange={(e) => setTypography({ [key]: e.target.value || undefined })}
              >
                {empty && <option value="">{empty}</option>}
                {/* Fonte salva fora do catálogo (ex.: escolhida pela IA) continua visível e selecionada */}
                {current && !PROPOSAL_FONTS[current] && <option value={current}>{current}</option>}
                {kinds.map((kind) => {
                  const families = Object.entries(PROPOSAL_FONTS).filter(
                    ([, f]) => f.kind === kind && (allowDisplayOnly || !f.displayOnly)
                  );
                  return families.length ? (
                    <optgroup key={kind} label={KIND_LABEL[kind]}>
                      {families.map(([family, f]) => (
                        <option key={family} value={family}>
                          {f.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })}
              </select>
              {current && (
                <p
                  className="truncate text-base leading-snug text-foreground/80"
                  style={{ fontFamily: `'${current}', serif`, fontStyle: italic ? 'italic' : 'normal' }}
                  aria-hidden
                >
                  {sample}
                </p>
              )}
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Label htmlFor={titleCaseId} className="cursor-pointer text-xs text-muted-foreground">
            Títulos em caixa-alta
          </Label>
          <Switch
            id={titleCaseId}
            checked={tokens.typography?.title_case === 'upper'}
            onCheckedChange={(on) => setTypography({ title_case: on ? 'upper' : undefined })}
          />
        </div>
      </section>

      {/* CANTOS */}
      <section className="space-y-3">
        <SectionTitle>Cantos</SectionTitle>
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-input bg-background p-1" role="radiogroup" aria-label="Cantos">
          {SHAPES.map((s) => {
            const active = tokens.shape === s.value;
            return (
              <button
                key={s.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ ...tokens, shape: s.value })}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <span className={cn('h-3.5 w-5 border border-current', s.preview)} aria-hidden />
                {s.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
