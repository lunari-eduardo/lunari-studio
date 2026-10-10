import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DESIGN_PRESETS } from '@/hooks/useProposalAI';
import { DEFAULT_DESIGN_TOKENS, PROPOSAL_FONTS, type ProposalDesignTokens, type ProposalShape } from '../../blocks/design';

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

const FONT_ROLES = [
  { key: 'display', label: 'Títulos', fallback: 'Playfair Display', allowDisplayOnly: true },
  { key: 'body', label: 'Corpo do texto', fallback: 'Inter', allowDisplayOnly: false },
  { key: 'accent', label: 'Números e preços', fallback: '', allowDisplayOnly: true },
] as const;

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
          {DESIGN_PRESETS.map((preset) => {
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
        {FONT_ROLES.map(({ key, label, fallback, allowDisplayOnly }) => {
          const current: string = tokens.typography?.[key] || fallback;
          const families = Object.entries(PROPOSAL_FONTS).filter(([, f]) => allowDisplayOnly || !f.displayOnly);
          return (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                value={current}
                onChange={(e) => setTypography({ [key]: e.target.value || undefined })}
              >
                {key === 'accent' && <option value="">Igual aos títulos</option>}
                {/* Fonte salva fora do catálogo (ex.: escolhida pela IA) continua visível e selecionada */}
                {current && !PROPOSAL_FONTS[current] && <option value={current}>{current}</option>}
                {families.map(([family, f]) => (
                  <option key={family} value={family}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Label htmlFor="title-case-upper" className="cursor-pointer text-xs text-muted-foreground">
            Títulos em caixa-alta
          </Label>
          <Switch
            id="title-case-upper"
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
