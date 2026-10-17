import React from 'react';
import { fontDisplayCss, fontSubtitleCss, fontBodyCss, fontAccentCss, fontHighlightCss, fontScriptCss, isHexColor } from '../../../blocks/design';

export const fd = () => ({ fontFamily: fontDisplayCss() });
/** Subtítulo, apoios, rótulos e botões do tema. */
export const fs = () => ({ fontFamily: fontSubtitleCss() });
/** Textos longos, descrições conceituais e parágrafos de leitura. */
export const fb = () => ({ fontFamily: fontBodyCss() });
/** Serifa de destaque do tema (numeração, preços); sem accent = fonte de títulos. */
export const fa = () => ({ fontFamily: fontAccentCss() });
/** Destaque em itálico (title_italic); fonte caligráfica escolhida no tema vem sem itálico sintético. */
export const fh = (): React.CSSProperties => ({ fontFamily: fontHighlightCss(), fontStyle: 'var(--pa-hl-style, italic)' });
/** Caligrafia (palavra da capa, assinatura); sem fonte própria = destaque em itálico. */
export const fsc = (): React.CSSProperties => ({
  fontFamily: fontScriptCss(),
  fontStyle: 'var(--pa-script-style, var(--pa-hl-style, italic))',
});

export type CtaHandler = (ctx: { blockType: string; label?: string }) => void;

/** Única altura ancorada do documento: a capa ocupa a "tela" do contexto (--pa-hero-h do VisualRenderer). */
export const HERO_MIN_H = 'min-h-[var(--pa-hero-h,100svh)]';

/**
 * Tamanho escolhido no popover vira teto fluido: integral a partir de 640px de
 * container, proporcional abaixo (piso de 50%), para nunca estourar no celular.
 */
export const fluidPx = (px?: number): React.CSSProperties | undefined =>
  px
    ? { fontSize: `clamp(${Math.min(px, Math.max(10, Math.round(px * 0.5)))}px, ${(px / 6.4).toFixed(2)}cqi, ${px}px)` }
    : undefined;

/** Chave do tamanho de um campo em props.typography (as capas mantêm os nomes canônicos antigos). */
export function typographyKey(fieldKey: string): string {
  switch (fieldKey) {
    case 'photographer_name':
      return 'photographerSize';
    case 'btnText':
      return 'ctaSize';
    case 'title_italic':
      return 'titleItalicSize';
    case 'body':
    case 'description':
      return 'descriptionSize';
    case 'detail_label':
      return 'detailLabelSize';
    case 'detail_value':
      return 'detailValueSize';
    case 'feature':
      return 'featureSize';
    default:
      return `${fieldKey}Size`;
  }
}

/** Chave da fonte própria (override local, não a categoria inteira) de um campo em props.typography. */
export function typographyFontKey(fieldKey: string): string {
  return `${fieldKey}Font`;
}

/** Chave da cor de um campo em props.typography. */
export function typographyColorKey(fieldKey: string): string {
  switch (fieldKey) {
    case 'photographer_name':
      return 'photographerColor';
    case 'btnText':
      return 'ctaColor';
    case 'title_italic':
      return 'titleItalicColor';
    case 'body':
    case 'description':
      return 'descriptionColor';
    case 'detail_label':
      return 'detailLabelColor';
    case 'detail_value':
      return 'detailValueColor';
    case 'feature':
      return 'featureColor';
    default:
      return `${fieldKey}Color`;
  }
}

/** Estilos tipográficos das capas (fontes do tema + tamanhos do popover). */
export function coverStyles(t: Record<string, number | undefined> = {}) {
  return {
    eyebrow: { ...fs(), ...fluidPx(t.eyebrowSize) },
    title: { ...fd(), ...fluidPx(t.titleSize) },
    italic: { ...fh(), ...fluidPx(t.titleItalicSize) },
    subtitle: { ...fs(), ...fluidPx(t.subtitleSize) },
    btn: { ...fs(), ...fluidPx(t.btnTextSize || t.ctaSize) },
    photographer: { ...fs(), ...fluidPx(t.photographer_nameSize || t.photographerSize) },
  };
}

// ---- Helpers de layout (props.align / props.background) ----

export const ALIGN_CLASS: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

// O fallback é uma chave ('center'), não uma classe — blocos sem align salvo (seeds) recebem o padrão do bloco
export const alignClass = (align?: string, fallback = 'left') => ALIGN_CLASS[align ?? ''] ?? ALIGN_CLASS[fallback];

// Capas: no estreito o texto é sempre centralizado; o alinhamento escolhido vale a partir de @2xl
const WIDE_ALIGN: Record<string, string> = {
  left: '@2xl:items-start @2xl:text-left',
  center: '@2xl:items-center @2xl:text-center',
  right: '@2xl:items-end @2xl:text-right',
  justify: '@2xl:items-start @2xl:text-justify',
};
export const wideAlign = (align?: string) => WIDE_ALIGN[align ?? ''] ?? WIDE_ALIGN.left;

export function sectionBg(bg: string | undefined, fallback: string): string {
  // Cor livre: o wrapper da seção no VisualRenderer define --pa-sec-bg / --pa-on-sec
  if (isHexColor(bg)) return 'bg-[var(--pa-sec-bg)]';
  switch (bg ?? fallback) {
    case 'cream':
      return 'bg-[var(--pa-cream,#F3F0EA)]';
    case 'linen':
      return 'bg-[var(--pa-linen,#E8DCCB)]';
    case 'stone':
      return 'bg-[var(--pa-stone,#C9BFB2)]';
    case 'taupe':
      return 'bg-[var(--pa-taupe,#8C7B6E)]';
    case 'dark':
      // Tinta do tema (antes usava --pa-stone, um bege claro sob texto branco)
      return 'bg-[var(--pa-ink,#1A1714)]';
    case 'white':
    default:
      return 'bg-[var(--pa-white,#FDFBF7)]';
  }
}

// Texto automático: cor de maior contraste com o fundo, calculada pelo tema (tokensToCssVars)
const AUTO_TEXT: Record<string, string> = {
  cream: 'text-[var(--pa-on-cream,#1A1714)]',
  linen: 'text-[var(--pa-on-linen,#1A1714)]',
  stone: 'text-[var(--pa-on-stone,#1A1714)]',
  taupe: 'text-[var(--pa-on-taupe,#FFFFFF)]',
  dark: 'text-[var(--pa-on-ink,#FFFFFF)]',
  white: 'text-[var(--pa-on-white,#1A1714)]',
};

export function textColorClass(textColor: string | undefined, bg: string | undefined, fallbackBg: string): string {
  if (textColor === 'dark') return 'text-neutral-900';
  if (textColor === 'black') return 'text-black';
  if (textColor === 'light') return 'text-white';
  if (textColor === 'warm') return 'text-[var(--pa-taupe,#8C7B6E)]';
  if (textColor === 'accent') return 'text-[var(--pa-accent,#7A5C42)]';
  if (isHexColor(bg)) return 'text-[var(--pa-on-sec)]';
  return AUTO_TEXT[bg ?? fallbackBg] ?? AUTO_TEXT.white;
}

// Acento pintado direto sobre o fundo da seção (cartões leves, sem superfície própria): vars do tema por fundo
const AUTO_ACCENT: Record<string, string> = {
  cream: 'text-[var(--pa-accent-on-cream,#7A5C42)]',
  linen: 'text-[var(--pa-accent-on-linen,#7A5C42)]',
  stone: 'text-[var(--pa-accent-on-stone,#7A5C42)]',
  taupe: 'text-[var(--pa-accent-on-taupe,#FFFFFF)]',
  dark: 'text-[var(--pa-accent-on-ink,#FFFFFF)]',
  white: 'text-[var(--pa-accent-on-white,#7A5C42)]',
};

// Veladura do cartão translúcido por fundo da seção (design.ts: cardVeil)
const AUTO_VEIL: Record<string, string> = {
  cream: 'bg-[var(--pa-veil-on-cream)]',
  linen: 'bg-[var(--pa-veil-on-linen)]',
  stone: 'bg-[var(--pa-veil-on-stone)]',
  taupe: 'bg-[var(--pa-veil-on-taupe)]',
  dark: 'bg-[var(--pa-veil-on-ink)]',
  white: 'bg-[var(--pa-veil-on-white)]',
};

export function veilClass(bg: string | undefined, fallbackBg: string): string {
  if (isHexColor(bg)) return 'bg-[var(--pa-veil-on-sec)]';
  return AUTO_VEIL[bg ?? fallbackBg] ?? AUTO_VEIL.white;
}

/** Acento legível sobre o fundo da seção; com cor de texto escolhida, vazio (o acento herda o texto). */
export function accentTextClass(textColor: string | undefined, bg: string | undefined, fallbackBg: string): string {
  if (textColor && textColor !== 'default') return '';
  if (isHexColor(bg)) return 'text-[var(--pa-accent-on-sec)]';
  return AUTO_ACCENT[bg ?? fallbackBg] ?? AUTO_ACCENT.white;
}

// ---------------------------------------------------------
// Observer de Blocos para Rastreio
// ---------------------------------------------------------

export function BlockObserver({
  children,
  blockId,
  blockType,
  position,
  onView,
}: {
  children: React.ReactNode;
  blockId: string;
  blockType: string;
  position: number;
  onView?: (blockId: string, blockType: string, position: number) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [viewed, setViewed] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current || viewed || !onView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onView(blockId, blockType, position);
          setViewed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [viewed, onView, blockId, blockType, position]);

  return <div ref={ref} className="h-full w-full">{children}</div>;
}
