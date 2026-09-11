import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPhotoUrl } from '@/lib/photoUrl';
import { applyTitleCase } from '@/lib/textTransform';
import { GALLERY_FONTS } from '@/components/FontSelect';
import type { CoverVariantProps } from '../types';
import { useCoverPalette, CoverCta, useImageOrientation } from '../shared';
import { cn } from '@/lib/utils';

type Aspect = 'portrait' | 'landscape' | 'square';

// Subtle SVG grain overlay (data-uri, no extra network request).
const GRAIN_STYLE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export default function FloatingFrameCover({
  coverPhoto,
  sessionName,
  subtitle,
  sessionDate,
  category,
  studioName,
  sessionFont,
  titleCaseMode = 'normal',
  isDark = true,
  textColor,
  textOverlayColor,
  primaryColor,
  ctaLabel,
  onEnter,
}: CoverVariantProps) {
  const palette = useCoverPalette({
    isDark,
    textColor,
    textOverlayColor,
    primaryColor,
  });

  const orientation = useImageOrientation(coverPhoto);
  const coverUrl = coverPhoto ? getPhotoUrl(coverPhoto, 'preview') : '/placeholder.svg';
  const displayName = applyTitleCase(sessionName, titleCaseMode);

  const fontConfig = useMemo(() => {
    if (!sessionFont) return null;
    return GALLERY_FONTS.find(
      (f) => sessionFont.toLowerCase().includes(f.name.toLowerCase()) || f.family.includes(sessionFont)
    );
  }, [sessionFont]);

  const formattedDate = useMemo(() => {
    if (!sessionDate) return null;
    try {
      const d = typeof sessionDate === 'string' ? new Date(sessionDate) : sessionDate;
      if (isNaN(d.getTime())) return null;
      return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return null;
    }
  }, [sessionDate]);

  const metaLine = useMemo(() => {
    return [formattedDate, category].filter(Boolean).join('  ·  ');
  }, [formattedDate, category]);

  const handleScroll = () => {
    const gallerySection = document.getElementById('deliver-gallery');
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: 'smooth' });
    }
    onEnter?.();
  };

  const titleWeight = fontConfig?.weightTitle ?? 400;
  const letterSpacing = fontConfig?.letterSpacing ?? '0em';

  // --- Adaptive composition (ResizeObserver) ---------------------------------
  const sectionRef = useRef<HTMLElement | null>(null);
  const textBlockRef = useRef<HTMLDivElement | null>(null);
  const kickerRef = useRef<HTMLParagraphElement | null>(null);

  // Measured text-block height (filete + título + subtítulo + meta + CTA).
  const [textBlockH, setTextBlockH] = useState(0);
  // Measured kicker height (top safe spacing).
  const [kickerH, setKickerH] = useState(0);
  // Viewport height in px (svh-equivalent computed against the section).
  const [viewportH, setViewportH] = useState(0);
  const [viewportW, setViewportW] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      setViewportH(section.clientHeight);
      setViewportW(section.clientWidth);
      if (textBlockRef.current) setTextBlockH(textBlockRef.current.offsetHeight);
      if (kickerRef.current) setKickerH(kickerRef.current.offsetHeight);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    if (textBlockRef.current) observer.observe(textBlockRef.current);
    if (kickerRef.current) observer.observe(kickerRef.current);

    return () => observer.disconnect();
  }, []);

  // Fixed reserve between photo and text block.
  const PHOTO_TO_TEXT_GAP = 28;

  // Compute available height for the photo. We subtract measured heights for
  // elements that rendered, and use small reserves for padding/gaps.
  const safeVerticalPadding = viewportW > 0 && viewportW < 640 ? 32 : 48;
  const computedAvailable =
    viewportH > 0 && textBlockH > 0
      ? viewportH - textBlockH - kickerH - PHOTO_TO_TEXT_GAP - safeVerticalPadding
      : 0;

  // Hard floors/ceilings for the photo dimension.
  const PHOTO_MIN_H = 180;
  // On very tall screens let the photo grow up to ~62% of the viewport.
  const PHOTO_FRACTION = 0.62;
  const PHOTO_MAX_VW = 0.74; // 70–76vw per spec, lower bound.

  // Cap by fraction when there is plenty of room, otherwise cap by what fits.
  const photoMaxH =
    computedAvailable > 0 ? Math.min(computedAvailable, viewportH * PHOTO_FRACTION) : 0;
  const photoFinalH = photoMaxH > 0 ? Math.max(PHOTO_MIN_H, photoMaxH) : 0;

  // Width bound — used both at desktop (with measured viewport) and mobile fallback.
  const photoMaxW =
    viewportW > 0
      ? Math.min(viewportW * PHOTO_MAX_VW, viewportW - 48)
      : 0;

  // Compact mode kicks in when the composition would otherwise squeeze too much.
  const isCompactView = viewportH > 0 && computedAvailable < viewportH * 0.32;

  // Aspect-ratio numeric factor (height / width) per orientation.
  const aspectRatio: Record<Aspect, number> = {
    portrait: 5 / 4, // 4/5 → taller than wide
    square: 1,
    landscape: 2 / 3, // 3/2 → wider than tall
  };

  const stylePhotoSize = (): { width: string; height: string } => {
    // No measurement yet — let CSS handle the first paint with safe defaults.
    if (viewportH === 0 || viewportW === 0) {
      return { width: 'min(560px, 88vw)', height: 'auto' };
    }
    const ratio = aspectRatio[orientation as Aspect] ?? aspectRatio.square;
    const widthIfHeightBound = photoFinalH * ratio;
    const widthIfWidthBound = photoMaxW;
    const widthPx = Math.max(160, Math.min(widthIfHeightBound, widthIfWidthBound));
    const heightPx = widthPx / ratio;
    return { width: `${Math.round(widthPx)}px`, height: `${Math.round(heightPx)}px` };
  };

  const photoSize = stylePhotoSize();

  // Mobile (≤ 640px): natural flow, no svh squeeze.
  const isMobileFlow = viewportW > 0 && viewportW < 640;

  return (
    <section
      ref={sectionRef}
      className={cn(
        'relative w-full flex flex-col items-center select-none transition-colors duration-500',
        isMobileFlow ? 'h-auto min-h-0 py-10 px-5' : 'h-[100svh] min-h-0 px-4 sm:px-8',
        isCompactView && !isMobileFlow ? 'justify-center gap-3' : 'justify-center gap-4 sm:gap-5',
      )}
      style={{
        backgroundColor: palette.surface,
        backgroundImage: isDark
          ? 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.02) 0%, transparent 80%)'
          : 'radial-gradient(circle at 50% 40%, rgba(0,0,0,0.02) 0%, transparent 80%)',
      }}
    >
      {/* Kicker do Estúdio Acima da Moldura */}
      {studioName && (
        <p
          ref={kickerRef}
          className={cn(
            'uppercase tracking-[0.32em] font-sans font-medium text-center text-[clamp(0.62rem,1.1vw,0.75rem)]',
            isCompactView ? 'mb-3' : 'mb-4 sm:mb-6',
          )}
          style={{ color: palette.inkMuted }}
        >
          {studioName}
        </p>
      )}

      {/* Moldura Fotográfica Suspensa (Passe-partout) */}
      <figure
        className={cn(
          'relative overflow-hidden rounded-[2px]',
          'border transition-shadow duration-500',
        )}
        style={{
          width: photoSize.width,
          height: photoSize.height,
          borderColor: palette.line,
          boxShadow: isCompactView
            ? '0 20px 50px -30px rgba(0,0,0,0.40)'
            : '0 30px 80px -40px rgba(0,0,0,0.45)',
        }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out hover:scale-[1.02]"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
        {/* Subtle grain overlay — pure CSS, no extra network. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.05]"
          style={{ backgroundImage: GRAIN_STYLE, backgroundSize: '160px 160px' }}
        />
      </figure>

      {/* Bloco de Tipografia e Metadados Abaixo da Foto */}
      <div
        ref={textBlockRef}
        className={cn(
          'flex flex-col items-center text-center max-w-3xl',
          isMobileFlow ? 'gap-3 mt-6' : isCompactView ? 'gap-3 mt-5' : 'gap-4 mt-6 sm:mt-7',
          'px-2',
        )}
      >
        {/* Filete Accent */}
        <div
          className={cn('w-[72px] h-[1px]', isCompactView ? 'mb-1' : 'mb-2 sm:mb-3')}
          style={{ backgroundColor: palette.accent }}
        />

        {/* Título Display M */}
        <h1
          className={cn(
            'leading-[1.1] tracking-normal text-balance font-normal',
            isCompactView
              ? 'text-[clamp(1.35rem,2.6vw,1.85rem)]'
              : 'text-[clamp(1.6rem,3.4vw,2.6rem)]',
          )}
          style={{
            fontFamily: sessionFont || undefined,
            fontWeight: titleWeight,
            letterSpacing: letterSpacing,
            color: palette.ink,
          }}
        >
          {displayName}
        </h1>

        {/* Subtítulo (se houver) */}
        {subtitle && (
          <p
            className="text-sm md:text-base italic opacity-80 font-serif"
            style={{ color: palette.ink }}
          >
            {subtitle}
          </p>
        )}

        {/* Metadados: Data e Categoria em linha única */}
        {metaLine && (
          <p
            className="text-[clamp(0.65rem,1vw,0.78rem)] uppercase tracking-[0.18em] font-sans font-medium"
            style={{ color: palette.inkMuted }}
          >
            {metaLine}
          </p>
        )}

        {/* CTA Underline */}
        <div className={isCompactView ? 'mt-2' : 'mt-4 sm:mt-5'}>
          <CoverCta
            variant="underline"
            label={ctaLabel || 'Ver galeria'}
            onClick={handleScroll}
            palette={palette}
            textTone="ink"
          />
        </div>
      </div>
    </section>
  );
}
