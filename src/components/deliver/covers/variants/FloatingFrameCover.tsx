import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPhotoUrl } from '@/lib/photoUrl';
import { applyTitleCase } from '@/lib/textTransform';
import { GALLERY_FONTS } from '@/components/FontSelect';
import type { CoverVariantProps } from '../types';
import { useCoverPalette, CoverCta, CoverScrollCue, useImageOrientation } from '../shared';
import { cn } from '@/lib/utils';

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

  // Proporção adaptativa baseada na orientação real
  const aspectClass =
    orientation === 'portrait'
      ? 'aspect-[4/5] max-w-[min(560px,88vw)]'
      : orientation === 'square'
      ? 'aspect-square max-w-[min(720px,88vw)]'
      : 'aspect-[3/2] max-w-[min(1100px,86vw)]';

  return (
    <section
      className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 sm:px-8 py-14 sm:py-20 select-none transition-colors duration-500 overflow-hidden"
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
          className="text-[clamp(0.62rem,1.1vw,0.75rem)] uppercase tracking-[0.32em] font-sans font-medium mb-6 sm:mb-8 text-center"
          style={{ color: palette.inkMuted }}
        >
          {studioName}
        </p>
      )}

      {/* Moldura Fotográfica Suspensa (Passe-partout) */}
      <div
        className={cn(
          'relative w-full mx-auto overflow-hidden rounded-sm',
          'shadow-[0_40px_80px_-40px_rgba(0,0,0,0.45)]',
          'border transition-all duration-500 max-h-[72vh]',
          palette.isDark ? 'border-white/10' : 'border-black/5',
          aspectClass
        )}
      >
        <div
          className="w-full h-full bg-cover bg-center transition-transform duration-1000 ease-out hover:scale-[1.02]"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      </div>

      {/* Bloco de Tipografia e Metadados Abaixo da Foto */}
      <div className="flex flex-col items-center text-center max-w-2xl mt-8 sm:mt-10 px-4">
        {/* Filete Accent */}
        <div
          className="w-[72px] h-[1px] mb-4 sm:mb-5"
          style={{ backgroundColor: palette.accent }}
        />

        {/* Título Display M */}
        <h1
          className="text-[clamp(1.9rem,4.5vw,3.25rem)] leading-[1.1] tracking-normal text-balance font-normal"
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
            className="text-sm md:text-base italic opacity-80 mt-2.5 font-serif"
            style={{ color: palette.ink }}
          >
            {subtitle}
          </p>
        )}

        {/* Metadados: Data e Categoria em linha única */}
        {metaLine && (
          <p
            className="text-[clamp(0.65rem,1vw,0.78rem)] uppercase tracking-[0.18em] font-sans font-medium mt-3"
            style={{ color: palette.inkMuted }}
          >
            {metaLine}
          </p>
        )}

        {/* CTA Underline */}
        <div className="mt-6">
          <CoverCta
            variant="underline"
            label={ctaLabel || 'Ver galeria'}
            onClick={handleScroll}
            palette={palette}
            textTone="ink"
          />
        </div>
      </div>

      {/* Indicador de Rolagem Sutil */}
      <div className="mt-8 sm:mt-12">
        <CoverScrollCue onClick={handleScroll} color={palette.inkMuted} />
      </div>
    </section>
  );
}
