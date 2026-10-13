import React from 'react';

// ============================================================
// DESIGN TOKENS DA PROPOSTA
// Paleta/tipografia declaradas no template (proposal_templates.design_tokens)
// e aplicadas como CSS variables no root da arte. Renderers usam
// var(--pa-*) com fallback para as cores padrão.
// ============================================================

export interface ProposalDesignTokens {
  colors?: {
    cream?: string;
    linen?: string;
    stone?: string;
    taupe?: string;
    accent?: string;
    ink?: string;
    white?: string;
  };
  typography?: {
    display?: string;
    body?: string;
    /** Serifa de destaque (numeração e preços). Ausente = usa a fonte de títulos. */
    accent?: string;
    /** Destaques em itálico (title_italic). Ausente = itálico da fonte de títulos. */
    highlight?: string;
    /** Caligrafia (palavra da capa, assinatura). Ausente = fonte de destaques. */
    script?: string;
    /** 'upper' = títulos de seção (h2) em caixa-alta espaçada. Ausente = como digitado. */
    title_case?: 'upper';
  };
  spacing?: {
    section_padding?: string;
    max_width?: string;
    inner_pad?: string;
  };
  /** Cantos do tema (botões, cartões, mídias). Ausente = cada bloco mantém seu desenho original. */
  shape?: ProposalShape;
}

export type ProposalShape = 'sharp' | 'soft' | 'round';

const SHAPE_RADII: Record<ProposalShape, { btn: string; card: string; media: string }> = {
  sharp: { btn: '0px', card: '0px', media: '0px' },
  soft: { btn: '0.5rem', card: '1rem', media: '0.75rem' },
  round: { btn: '9999px', card: '1.75rem', media: '1.5rem' },
};

/** Luminância relativa (WCAG) de um hex #RGB/#RRGGBB; inválido conta como claro. */
function luminance(hex: string): number {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return 1;
  const n = parseInt(h, 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG entre duas cores hex. */
export function contrastRatio(a: string, b: string): number {
  const [L1, L2] = [luminance(a), luminance(b)];
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

/** Cor livre (#RRGGBB) escolhida pelo fotógrafo, ex.: fundo personalizado de seção. */
export const isHexColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

// Fundo da seção (slot do tema) → chave da paleta; 'dark' é a tinta
const SWATCH_COLOR: Record<string, keyof NonNullable<ProposalDesignTokens['colors']>> = {
  white: 'white',
  cream: 'cream',
  linen: 'linen',
  stone: 'stone',
  taupe: 'taupe',
  dark: 'ink',
};

/** Cor real de um fundo de seção (slot do tema ou cor livre); ausente = undefined. */
export function backgroundSwatchColor(value: unknown, palette: NonNullable<ProposalDesignTokens['colors']>): string | undefined {
  if (isHexColor(value)) return value;
  const key = typeof value === 'string' ? SWATCH_COLOR[value] : undefined;
  return key ? palette[key] : undefined;
}

/** Entre a tinta e o branco do tema, a cor de texto de maior contraste sobre o fundo. */
export function onColor(bg: string, ink: string, white: string): string {
  return contrastRatio(ink, bg) >= contrastRatio(white, bg) ? ink : white;
}

/** Acento legível sobre um fundo: o próprio acento com contraste ≥ 3:1; senão, o texto de maior contraste. */
export function accentOver(accent: string, bg: string, ink: string, white: string): string {
  return contrastRatio(accent, bg) >= 3 ? accent : onColor(bg, ink, white);
}

/**
 * Veladura do cartão translúcido sobre um fundo de seção: 10% do texto claro em fundo escuro (vidro fosco);
 * em fundo claro, o branco do tema (escurecer o fundo com a tinta deixaria o cartão cinza e o acento ilegível).
 */
export function cardVeil(bg: string, ink: string, white: string): string {
  return `color-mix(in srgb, ${white} ${onColor(bg, ink, white) === white ? 10 : 60}%, transparent)`;
}

export const DEFAULT_DESIGN_TOKENS: Required<Pick<ProposalDesignTokens, 'colors'>> = {
  colors: {
    cream: '#F3F0EA',
    linen: '#E8E3DA',
    stone: '#C9BFB2',
    taupe: '#8C7B6E',
    accent: '#7A5C42',
    ink: '#1A1714',
    white: '#FFFFFF',
  },
};

/** Converte tokens em CSS variables para injetar no container da arte. */
export function tokensToCssVars(tokens?: ProposalDesignTokens): React.CSSProperties {
  const c = { ...DEFAULT_DESIGN_TOKENS.colors, ...(tokens?.colors ?? {}) };
  const displayFont = tokens?.typography?.display || 'Playfair Display';
  const bodyFont = tokens?.typography?.body || 'Inter';
  const accentFont = tokens?.typography?.accent;
  const highlightFont = tokens?.typography?.highlight;
  const scriptFont = tokens?.typography?.script;

  // Garante carregamento das fontes caso não sejam as padrão
  ensureFontLoaded(displayFont);
  ensureFontLoaded(bodyFont);
  ensureFontLoaded(accentFont);
  ensureFontLoaded(highlightFont);
  ensureFontLoaded(scriptFont);

  const radii = tokens?.shape ? SHAPE_RADII[tokens.shape] : undefined;

  return {
    ['--pa-cream' as any]: c.cream,
    ['--pa-linen' as any]: c.linen,
    ['--pa-stone' as any]: c.stone,
    ['--pa-taupe' as any]: c.taupe,
    ['--pa-accent' as any]: c.accent,
    ['--pa-ink' as any]: c.ink,
    ['--pa-white' as any]: c.white,
    // Texto automático por fundo: temas escuros (ex.: Noir) invertem sem quebrar contraste
    ['--pa-on-cream' as any]: onColor(c.cream, c.ink, c.white),
    ['--pa-on-linen' as any]: onColor(c.linen, c.ink, c.white),
    ['--pa-on-stone' as any]: onColor(c.stone, c.ink, c.white),
    ['--pa-on-taupe' as any]: onColor(c.taupe, c.ink, c.white),
    ['--pa-on-white' as any]: onColor(c.white, c.ink, c.white),
    ['--pa-on-ink' as any]: onColor(c.ink, c.ink, c.white),
    // Acento sobre superfície "white" (números/preços dos cartões): cai na tinta se o contraste for < 3:1 (ex.: dourado do Noir)
    ['--pa-accent-on-white' as any]: accentOver(c.accent, c.white, c.ink, c.white),
    // Mesmo cálculo para cada fundo de seção: cartões leves (sem superfície própria) pintam o acento direto sobre ele
    ['--pa-accent-on-cream' as any]: accentOver(c.accent, c.cream, c.ink, c.white),
    ['--pa-accent-on-linen' as any]: accentOver(c.accent, c.linen, c.ink, c.white),
    ['--pa-accent-on-stone' as any]: accentOver(c.accent, c.stone, c.ink, c.white),
    ['--pa-accent-on-taupe' as any]: accentOver(c.accent, c.taupe, c.ink, c.white),
    ['--pa-accent-on-ink' as any]: accentOver(c.accent, c.ink, c.ink, c.white),
    ['--pa-veil-on-white' as any]: cardVeil(c.white, c.ink, c.white),
    ['--pa-veil-on-cream' as any]: cardVeil(c.cream, c.ink, c.white),
    ['--pa-veil-on-linen' as any]: cardVeil(c.linen, c.ink, c.white),
    ['--pa-veil-on-stone' as any]: cardVeil(c.stone, c.ink, c.white),
    ['--pa-veil-on-taupe' as any]: cardVeil(c.taupe, c.ink, c.white),
    ['--pa-veil-on-ink' as any]: cardVeil(c.ink, c.ink, c.white),
    ['--pa-font-display' as any]: displayFont,
    ['--pa-font-body' as any]: bodyFont,
    // Sem accent a variável não existe e fontAccentCss() cai na fonte de títulos
    ...(accentFont && { ['--pa-font-accent' as any]: accentFont }),
    // Destaque/caligrafia: ausentes = mesmas variáveis de antes (itálico da fonte de títulos).
    // Fonte caligráfica não tem itálico: o estilo "normal" evita o itálico sintético do navegador.
    ...(highlightFont && { ['--pa-font-highlight' as any]: highlightFont }),
    ...(isScriptFont(highlightFont) && { ['--pa-hl-style' as any]: 'normal' }),
    ...(scriptFont && {
      ['--pa-font-script' as any]: scriptFont,
      ['--pa-script-style' as any]: isScriptFont(scriptFont) ? 'normal' : 'italic',
    }),
    ...(radii && {
      ['--pa-r-btn' as any]: radii.btn,
      ['--pa-r-card' as any]: radii.card,
      ['--pa-r-media' as any]: radii.media,
    }),
  };
}

/** Eixos css2 explícitos: só pesos/itálicos que a família realmente tem (pedido inexistente = HTTP 400). */
const axes = (weights: number[], italic: boolean) =>
  italic
    ? `ital,wght@${[...weights.map((w) => `0,${w}`), ...weights.map((w) => `1,${w}`)].join(';')}`
    : `wght@${weights.join(';')}`;

export type FontKind = 'serif' | 'sans' | 'script';

/**
 * Fontes oferecidas nas propostas (fonte única dos selects do editor e do loader).
 * `kind` agrupa e filtra por papel (caligráficas só em destaques/caligrafia).
 * `displayOnly`: fonte de caixa-alta/títulos, ilegível como corpo e sem itálico.
 */
export const PROPOSAL_FONTS: Record<string, { label: string; kind: FontKind; axes?: string; displayOnly?: boolean }> = {
  'Playfair Display': { label: 'Playfair Display (Serifada Elegante)', kind: 'serif', axes: axes([400, 500, 600, 700], true) },
  'Bodoni Moda': { label: 'Bodoni Moda (Alto Contraste)', kind: 'serif', axes: 'ital,opsz,wght@0,6..96,400..900;1,6..96,400..900' },
  'DM Serif Display': { label: 'DM Serif Display (Clássica Marcante)', kind: 'serif', axes: 'ital@0;1' },
  'Cormorant Garamond': { label: 'Cormorant Garamond (Editorial Clássica)', kind: 'serif', axes: axes([300, 400, 500, 600, 700], true) },
  Lora: { label: 'Lora (Literária)', kind: 'serif', axes: axes([400, 500, 600, 700], true) },
  Italiana: { label: 'Italiana (Caixa-alta Fina)', kind: 'serif', displayOnly: true },
  Cinzel: { label: 'Cinzel (Romana em Caixa-alta)', kind: 'serif', displayOnly: true, axes: axes([400, 500, 600], false) },
  Inter: { label: 'Inter (Moderna Neutra)', kind: 'sans', axes: axes([300, 400, 500, 600, 700], false) },
  Jost: { label: 'Jost (Geométrica Limpa)', kind: 'sans', axes: axes([300, 400, 500, 600, 700], true) },
  Montserrat: { label: 'Montserrat (Contemporânea)', kind: 'sans', axes: axes([300, 400, 500, 600, 700], true) },
  Manrope: { label: 'Manrope', kind: 'sans', axes: axes([300, 400, 500, 600, 700], false) },
  'Open Sans': { label: 'Open Sans', kind: 'sans', axes: axes([300, 400, 500, 600, 700], true) },
  'Pinyon Script': { label: 'Pinyon Script (Caligrafia Formal)', kind: 'script' },
  'Great Vibes': { label: 'Great Vibes (Caligrafia Romântica)', kind: 'script' },
  'Mrs Saint Delafield': { label: 'Mrs Saint Delafield (Assinatura)', kind: 'script' },
};

const isScriptFont = (family?: string) => !!family && PROPOSAL_FONTS[family]?.kind === 'script';

/** URL css2 de uma família; desconhecida (dados antigos) vai sem eixo, que é sempre válido. */
export function googleFontUrl(fontFamily: string): string {
  const family = encodeURIComponent(fontFamily).replace(/%20/g, '+');
  const spec = PROPOSAL_FONTS[fontFamily]?.axes;
  return `https://fonts.googleapis.com/css2?family=${family}${spec ? `:${spec}` : ''}&display=swap`;
}

const loadedFonts = new Set<string>();

/**
 * Garante que uma fonte do Google Fonts esteja carregada (usada quando o
 * template declara tipografia própria, ex.: Cormorant Garamond / Jost).
 */
export function ensureFontLoaded(fontFamily?: string): void {
  if (!fontFamily || typeof document === 'undefined') return;
  const key = fontFamily.toLowerCase().replace(/\s+/g, '-');
  if (loadedFonts.has(key)) return;
  loadedFonts.add(key);

  // Únicas carregadas pelo index.html (Playfair NÃO é: antes caía em Georgia)
  if (key === 'inter' || key === 'manrope') return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = googleFontUrl(fontFamily);
  document.head.appendChild(link);
}

export function fontDisplayCss(): string {
  return "var(--pa-font-display, 'Playfair Display'), 'Playfair Display', Georgia, serif";
}

export function fontAccentCss(): string {
  return "var(--pa-font-accent, var(--pa-font-display, 'Playfair Display')), 'Playfair Display', Georgia, serif";
}

export function fontBodyCss(): string {
  return "var(--pa-font-body, 'Inter'), 'Inter', system-ui, sans-serif";
}

/** Destaques em itálico: sem token = exatamente a fonte de títulos (propostas antigas não mudam). */
export function fontHighlightCss(): string {
  return "var(--pa-font-highlight, var(--pa-font-display, 'Playfair Display')), 'Playfair Display', Georgia, serif";
}

/** Caligrafia: sem token = fonte de destaques. */
export function fontScriptCss(): string {
  return "var(--pa-font-script, var(--pa-font-highlight, var(--pa-font-display, 'Playfair Display'))), 'Playfair Display', Georgia, serif";
}
