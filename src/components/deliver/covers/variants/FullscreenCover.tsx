import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPhotoUrl } from '@/lib/photoUrl';
import { applyTitleCase } from '@/lib/textTransform';
import { GALLERY_FONTS } from '@/components/FontSelect';
import type { CoverVariantProps } from '../types';
import { useCoverPalette, CoverCta, CoverScrollCue } from '../shared';
import { getFallbackCoverUrl } from '../defaultPhotos';
import { cn } from '@/lib/utils';

export default function FullscreenCover({
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const palette = useCoverPalette({
    isDark,
    textColor,
    textOverlayColor,
    primaryColor,
  });

  const rawUrl = coverPhoto ? getPhotoUrl(coverPhoto, 'preview') : null;
  const coverUrl = (rawUrl && rawUrl !== '/placeholder.svg' && !rawUrl.includes('placeholder.svg'))
    ? rawUrl
    : getFallbackCoverUrl('horizontal');
  const displayName = applyTitleCase(sessionName, titleCaseMode);

  // Busca configurações recomendadas da fonte
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

  const kickerText = useMemo(() => {
    return [studioName, category].filter(Boolean).join('  ·  ');
  }, [studioName, category]);

  const handleScroll = () => {
    const gallerySection = document.getElementById('deliver-gallery');
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: 'smooth' });
    }
    onEnter?.();
  };

  const titleWeight = fontConfig?.weightTitle ?? 600;
  const letterSpacing = fontConfig?.letterSpacing ?? '-0.01em';

  return (
    <section className="relative h-full min-h-full w-full flex flex-col justify-end overflow-hidden select-none bg-neutral-950">
      {/* 1. Imagem de Fundo com Zoom Suave na Entrada */}
      <img
        src={coverUrl}
        alt={sessionName}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out motion-reduce:transform-none',
          mounted ? 'scale-100' : 'scale-[1.04]'
        )}
        onError={(e) => {
          e.currentTarget.src = getFallbackCoverUrl('horizontal');
        }}
      />

      {/* 2. Duplo Véu de Contraste */}
      {/* 2a. Gradiente vertical profundo de baixo para cima */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.52) 40%, rgba(0,0,0,0.18) 70%, transparent 100%)',
        }}
      />

      {/* 2b. Faixa com leve blur óptico (2px) nos 38% inferiores */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%] pointer-events-none backdrop-blur-[2px]"
        style={{
          maskImage: 'linear-gradient(to top, black 50%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 50%, transparent 100%)',
        }}
      />

      {/* 3. Conteúdo Ancorado na Base */}
      <div className="relative z-20 w-full max-w-[1440px] mx-auto px-6 sm:px-10 md:px-14 pb-14 sm:pb-16 md:pb-20">
        <div className="max-w-4xl flex flex-col items-start">
          {/* Kicker (Estúdio e Categoria) */}
          {kickerText && (
            <p
              className={cn(
                'text-[clamp(0.62rem,1.1vw,0.75rem)] uppercase tracking-[0.32em] font-sans font-medium mb-3 md:mb-4 transition-all duration-700 ease-out',
                mounted ? 'opacity-90 translate-y-0' : 'opacity-0 translate-y-2'
              )}
              style={{ color: palette.onPhotoMuted }}
            >
              {kickerText}
            </p>
          )}

          {/* Título Display XL */}
          <h1
            className={cn(
              'text-[clamp(2.4rem,8.5vw,6.5rem)] leading-[0.98] tracking-tight text-balance break-words font-normal transition-all duration-700 delay-75 ease-out',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            )}
            style={{
              fontFamily: sessionFont || undefined,
              fontWeight: titleWeight,
              letterSpacing: letterSpacing,
              color: palette.onPhoto,
              textShadow: '0 2px 20px rgba(0,0,0,0.4)',
            }}
          >
            {displayName}
          </h1>

          {/* Régua Accent */}
          <div
            className={cn(
              'w-14 h-[1px] my-4 md:my-5 transition-all duration-700 delay-150 ease-out',
              mounted ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
            )}
            style={{
              backgroundColor: palette.accent,
              transformOrigin: 'left',
            }}
          />

          {/* Subtítulo (se houver) */}
          {subtitle && (
            <p
              className={cn(
                'text-sm md:text-base italic opacity-85 mb-3 font-serif transition-all duration-700 delay-200 ease-out',
                mounted ? 'opacity-85 translate-y-0' : 'opacity-0 translate-y-2'
              )}
              style={{ color: palette.onPhoto }}
            >
              {subtitle}
            </p>
          )}

          {/* Metadados (Data) */}
          {formattedDate && (
            <p
              className={cn(
                'text-[clamp(0.65rem,1vw,0.78rem)] uppercase tracking-[0.18em] font-sans font-medium mb-6 md:mb-8 transition-all duration-700 delay-200 ease-out',
                mounted ? 'opacity-80 translate-y-0' : 'opacity-0 translate-y-2'
              )}
              style={{ color: palette.onPhotoMuted }}
            >
              {formattedDate}
            </p>
          )}

          {/* CTA Button */}
          <div
            className={cn(
              'flex items-center gap-4 transition-all duration-700 delay-300 ease-out w-full sm:w-auto',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            )}
          >
            <CoverCta
              variant="outline"
              label={ctaLabel || 'Ver galeria'}
              onClick={handleScroll}
              palette={palette}
              textTone="onPhoto"
              className="w-full sm:w-auto max-w-[320px]"
            />
          </div>
        </div>

        {/* Indicador de Rolagem Discreto Ancorado na Lateral Inferior */}
        <div className="absolute right-6 sm:right-10 md:right-14 bottom-10 sm:bottom-12 hidden sm:block">
          <CoverScrollCue onClick={handleScroll} color={palette.onPhoto} />
        </div>
      </div>
    </section>
  );
}
