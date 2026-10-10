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
function contrastRatio(a: string, b: string): number {
  const [L1, L2] = [luminance(a), luminance(b)];
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

/** Entre a tinta e o branco do tema, a cor de texto de maior contraste sobre o fundo. */
export function onColor(bg: string, ink: string, white: string): string {
  return contrastRatio(ink, bg) >= contrastRatio(white, bg) ? ink : white;
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

  // Garante carregamento das fontes caso não sejam as padrão
  ensureFontLoaded(displayFont);
  ensureFontLoaded(bodyFont);
  ensureFontLoaded(accentFont);

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
    ['--pa-on-white' as any]: onColor(c.white, c.ink, c.white),
    ['--pa-on-ink' as any]: onColor(c.ink, c.ink, c.white),
    // Acento sobre superfície "white" (números/preços dos cartões): cai na tinta se o contraste for < 3:1 (ex.: dourado do Noir)
    ['--pa-accent-on-white' as any]: contrastRatio(c.accent, c.white) >= 3 ? c.accent : onColor(c.white, c.ink, c.white),
    ['--pa-font-display' as any]: displayFont,
    ['--pa-font-body' as any]: bodyFont,
    // Sem accent a variável não existe e fontAccentCss() cai na fonte de títulos
    ...(accentFont && { ['--pa-font-accent' as any]: accentFont }),
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

/**
 * Fontes oferecidas nas propostas (fonte única dos selects do editor e do loader).
 * `displayOnly`: fonte de caixa-alta/títulos, ilegível como corpo.
 */
export const PROPOSAL_FONTS: Record<string, { label: string; axes?: string; displayOnly?: boolean }> = {
  'Playfair Display': { label: 'Playfair Display (Serifada Elegante)', axes: axes([400, 500, 600, 700], true) },
  'Cormorant Garamond': { label: 'Cormorant Garamond (Editorial Clássica)', axes: axes([300, 400, 500, 600, 700], true) },
  Italiana: { label: 'Italiana (Caixa-alta Fina)', displayOnly: true },
  Lora: { label: 'Lora (Literária)', axes: axes([400, 500, 600, 700], true) },
  Inter: { label: 'Inter (Moderna Neutra)', axes: axes([300, 400, 500, 600, 700], false) },
  Jost: { label: 'Jost (Geométrica Limpa)', axes: axes([300, 400, 500, 600, 700], true) },
  Montserrat: { label: 'Montserrat (Contemporânea)', axes: axes([300, 400, 500, 600, 700], true) },
  Manrope: { label: 'Manrope', axes: axes([300, 400, 500, 600, 700], false) },
  'Open Sans': { label: 'Open Sans', axes: axes([300, 400, 500, 600, 700], true) },
};

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
