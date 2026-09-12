import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPhotoUrl } from '@/lib/photoUrl';
import { applyTitleCase } from '@/lib/textTransform';
import { GALLERY_FONTS } from '@/components/FontSelect';
import type { CoverVariantProps } from '../types';
import { useCoverPalette, CoverCta } from '../shared';
import { getFallbackCoverUrl } from '../defaultPhotos';
import { cn } from '@/lib/utils';

// Subtle SVG grain overlay for the passe-partout (printed-paper texture).
const PAPER_GRAIN_STYLE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

// Reveal real intrinsic dimensions of the cover photo.
function useImageIntrinsicSize(url: string | undefined): { w: number; h: number } | null {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!url || url === '/placeholder.svg') {
      setSize(null);
      return;
    }
    let mounted = true;
    const img = new Image();
    img.onload = () => {
      if (!mounted) return;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setSize({ w: img.naturalWidth, h: img.naturalHeight });
      }
    };
    img.src = url;
    return () => {
      mounted = false;
      img.onload = null;
    };
  }, [url]);
  return size;
}

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

  const coverUrl = coverPhoto ? getPhotoUrl(coverPhoto, 'preview') : getFallbackCoverUrl('vertical');
  const intrinsic = useImageIntrinsicSize(coverUrl);
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

  const [textBlockH, setTextBlockH] = useState(0);
  const [kickerH, setKickerH] = useState(0);
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

  // Real intrinsic ratio of the photo (h/w). Falls back to 5/4 (portrait) only
  // while the image is still loading.
  const realRatio = intrinsic ? intrinsic.h / intrinsic.w : 5 / 4;

  // Fixed reserve between photo and text block.
  const PHOTO_TO_TEXT_GAP = viewportH > 0 && viewportH < 650 ? 16 : 24;
  const safeVerticalPadding = viewportW > 0 && viewportW < 640 ? 24 : 40;

  // Available height for the photo (subtract measured siblings + gaps).
  const computedAvailable =
    viewportH > 0 && textBlockH > 0
      ? viewportH - textBlockH - kickerH - PHOTO_TO_TEXT_GAP - safeVerticalPadding
      : 0;

  // Composition ceilings.
  const PHOTO_MIN_H = viewportH > 0 && viewportH < 650 ? 110 : 150;
  const PHOTO_FRACTION = 0.54; // Deixa respiro proporcional para o passe-partout e CTA.
  const PHOTO_MAX_VW_DESKTOP = 0.70;
  const PHOTO_MAX_VW_MOBILE = 0.82;

  const photoMaxH =
    computedAvailable > 0 ? Math.min(computedAvailable, viewportH * PHOTO_FRACTION) : 0;
  const photoH = photoMaxH > 0 ? Math.max(PHOTO_MIN_H, photoMaxH) : PHOTO_MIN_H;

  const maxVw = viewportW > 0 && viewportW < 640 ? PHOTO_MAX_VW_MOBILE : PHOTO_MAX_VW_DESKTOP;
  const photoMaxW = viewportW > 0 ? Math.min(viewportW * maxVw, viewportW - 32) : 0;

  // Compute the photo box that fits BOTH constraints simultaneously.
  const computePhotoBox = (): { w: number; h: number } | null => {
    if (photoH <= 0 || photoMaxW <= 0) return null;
    const widthIfHeight = photoH / realRatio;
    const widthIfWidth = photoMaxW;
    const w = Math.max(120, Math.min(widthIfHeight, widthIfWidth));
    const h = w * realRatio;
    return { w: Math.round(w), h: Math.round(Math.min(h, photoH)) };
  };

  const photoBox = computePhotoBox();

  // Passe-partout margin: proportional to the smallest side of the photo, with
  // a hard floor so it never collapses on tiny previews and a ceiling so it
  // does not eat the whole viewport on huge screens.
  const passepartoutMargin = photoBox
    ? Math.max(14, Math.min(48, Math.round(Math.min(photoBox.w, photoBox.h) * 0.05)))
    : 0;

  // Compact mode kicks in when there is very little room for the photo+passe-partout.
  const isCompactView = viewportH > 0 && computedAvailable < viewportH * 0.30;

  // Mobile (≤ 640px): natural flow, no svh squeeze.
  const isMobileFlow = viewportW > 0 && viewportW < 640;

  // Passe-partout paper color: a soft off-white that reads as paper on both
  // dark and light gallery backgrounds. Stays off-white even in dark mode
  // (matching the reference frame, which is clearly a cream/off-white card).
  const passepartoutColor = '#F5F1EA';
  const passepartoutInnerBorder = 'rgba(0,0,0,0.06)';

  return (
    <section
      ref={sectionRef}
      className={cn(
        'relative w-full flex flex-col items-center select-none transition-colors duration-500',
        isMobileFlow
          ? 'h-full min-h-0 py-6 px-4 gap-3 sm:gap-4 justify-center'
          : 'h-[100svh] min-h-0 px-4 sm:px-8 gap-3 sm:gap-4 justify-center',
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
            isCompactView && !isMobileFlow ? 'mb-2' : isMobileFlow ? '' : 'mb-4 sm:mb-5',
          )}
          style={{ color: palette.inkMuted }}
        >
          {studioName}
        </p>
      )}

      {/* Passe-partout: the off-white paper wrapper that surrounds the photo. */}
      <div
        className={cn(
          'relative shrink-0 transition-shadow duration-500',
        )}
        style={{
          width: photoBox ? `${photoBox.w + passepartoutMargin * 2}px` : 'min(560px, 88vw)',
          height: photoBox ? `${photoBox.h + passepartoutMargin * 2}px` : 'auto',
          backgroundColor: passepartoutColor,
          borderRadius: '1px',
          padding: `${passepartoutMargin}px`,
          boxShadow: isCompactView && !isMobileFlow
            ? '0 22px 55px -32px rgba(0,0,0,0.40), 0 8px 22px -14px rgba(0,0,0,0.18)'
            : '0 36px 90px -44px rgba(0,0,0,0.55), 0 12px 28px -16px rgba(0,0,0,0.22)',
        }}
      >
        {/* Subtle paper grain — pure CSS, no extra network. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-[0.08] rounded-[1px]"
          style={{
            backgroundImage: PAPER_GRAIN_STYLE,
            backgroundSize: '200px 200px',
          }}
        />
        {/* Inner edge of the paper — a hairline so the photo area reads as cut. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded-[1px]"
          style={{ boxShadow: `inset 0 0 0 1px ${passepartoutInnerBorder}` }}
        />

        {/* Photo container — sized to fit inside the passe-partout margin. */}
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            backgroundColor: '#1a1a1a',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)',
          }}
        >
          <img
            src={coverUrl}
            alt={sessionName || 'Cover photo'}
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out hover:scale-[1.02]"
          />
        </div>
      </div>

      {/* Bloco de Tipografia e Metadados Abaixo do Passe-partout */}
      <div
        ref={textBlockRef}
        className={cn(
          'flex flex-col items-center text-center max-w-3xl px-2',
          isMobileFlow
            ? 'gap-3 mt-2'
            : isCompactView
            ? 'gap-2 mt-3'
            : 'gap-3 mt-5 sm:mt-6',
        )}
      >
        {/* Filete Accent */}
        <div
          className={cn(
            'w-[72px] h-[1px]',
            isCompactView && !isMobileFlow ? 'mb-1' : 'mb-2 sm:mb-3',
          )}
          style={{ backgroundColor: palette.accent }}
        />

        {/* Título Display M */}
        <h1
          className={cn(
            'leading-[1.1] tracking-normal text-balance font-normal',
            isCompactView && !isMobileFlow
              ? 'text-[clamp(1.3rem,2.5vw,1.75rem)]'
              : isMobileFlow
              ? 'text-[clamp(1.6rem,7vw,2.4rem)]'
              : 'text-[clamp(1.6rem,3.2vw,2.5rem)]',
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
        <div className={isCompactView && !isMobileFlow ? 'mt-1' : 'mt-3 sm:mt-4'}>
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
