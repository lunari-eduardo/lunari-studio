import React from 'react';
import { fontDisplayCss, fontBodyCss } from '../../../blocks/design';

export const fd = () => ({ fontFamily: fontDisplayCss() });
export const fb = () => ({ fontFamily: fontBodyCss() });

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

/** Estilos tipográficos das capas (fontes do tema + tamanhos do popover). */
export function coverStyles(t: Record<string, number | undefined> = {}) {
  return {
    eyebrow: fluidPx(t.eyebrowSize),
    title: { ...fd(), ...fluidPx(t.titleSize) },
    italic: fluidPx(t.titleItalicSize),
    subtitle: { ...fb(), ...fluidPx(t.subtitleSize) },
    btn: fluidPx(t.btnTextSize || t.ctaSize),
    photographer: { ...fb(), ...fluidPx(t.photographer_nameSize || t.photographerSize) },
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
  switch (bg ?? fallback) {
    case 'cream':
      return 'bg-[var(--pa-cream,#F3F0EA)]';
    case 'linen':
      return 'bg-[var(--pa-linen,#E8DCCB)]';
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
  dark: 'text-[var(--pa-on-ink,#FFFFFF)]',
  white: 'text-[var(--pa-on-white,#1A1714)]',
};

export function textColorClass(textColor: string | undefined, bg: string | undefined, fallbackBg: string): string {
  if (textColor === 'dark') return 'text-neutral-900';
  if (textColor === 'black') return 'text-black';
  if (textColor === 'light') return 'text-white';
  if (textColor === 'warm') return 'text-[var(--pa-taupe,#8C7B6E)]';
  if (textColor === 'accent') return 'text-[var(--pa-accent,#7A5C42)]';
  return AUTO_TEXT[bg ?? fallbackBg] ?? AUTO_TEXT.white;
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
