import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPhotoUrl } from '@/lib/photoUrl';
import { applyTitleCase } from '@/lib/textTransform';
import { GALLERY_FONTS } from '@/components/FontSelect';
import type { CoverVariantProps } from '../types';
import { useCoverPalette, CoverCta, CoverScrollCue } from '../shared';
import { getFallbackCoverUrl } from '../defaultPhotos';
import { cn } from '@/lib/utils';

export default function SplitCover({
  coverPhoto,
  sessionName,
  subtitle,
  sessionDate,
  category,
  issueNumber,
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

  const rawUrl = coverPhoto ? getPhotoUrl(coverPhoto, 'preview') : null;
  const coverUrl = (rawUrl && rawUrl !== '/placeholder.svg' && !rawUrl.includes('placeholder.svg'))
    ? rawUrl
    : getFallbackCoverUrl('vertical');
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

  const titleWeight = fontConfig?.weightTitle ?? 500;
  const letterSpacing = fontConfig?.letterSpacing ?? '-0.005em';

  return (
    <section
      className="relative w-full h-full min-h-full select-none transition-colors duration-500 overflow-hidden flex flex-col md:grid md:grid-cols-[1.35fr_1fr]"
      style={{ backgroundColor: palette.surface }}
    >
      {/* Coluna da Esquerda: Fotografia (com sobreposição de 40px no desktop) */}
      <div className="relative w-full h-[50%] md:h-full md:mr-[-40px] z-10 overflow-hidden shadow-2xl md:shadow-[20px_0_40px_-15px_rgba(0,0,0,0.45)] bg-neutral-900">
        <img
          src={coverUrl}
          alt={sessionName}
          className="w-full h-full object-cover transition-transform duration-1000 ease-out hover:scale-[1.02]"
          onError={(e) => {
            e.currentTarget.src = getFallbackCoverUrl('vertical');
          }}
        />
      </div>

      {/* Coluna da Direita: Painel Editorial de Tipografia */}
      <div
        className={cn(
          'relative z-0 flex flex-col justify-center flex-1 md:flex-initial',
          'px-6 sm:px-10 md:pl-20 md:pr-12 lg:pr-20',
          'py-6 md:py-16 md:-translate-y-[2%]'
        )}
      >
        <div className="max-w-xl flex flex-col items-start">
          {/* Número da Edição (opcional) ou Kicker */}
          <div className="flex items-center gap-3 mb-4 md:mb-5">
            {issueNumber && (
              <span className="font-mono text-[11px] tracking-widest opacity-50 uppercase">
                {issueNumber}
              </span>
            )}
            {issueNumber && kickerText && (
              <span className="opacity-30">|</span>
            )}
            {kickerText && (
              <p
                className="text-[clamp(0.62rem,1.1vw,0.75rem)] uppercase tracking-[0.32em] font-sans font-medium"
                style={{ color: palette.inkMuted }}
              >
                {kickerText}
              </p>
            )}
          </div>

          {/* Bloco de Título com Filete Vertical à Esquerda */}
          <div className="flex items-stretch gap-4 md:gap-6 my-2">
            <div
              className="w-[1px] self-stretch shrink-0 rounded-full"
              style={{ backgroundColor: palette.accent }}
            />
            <div className="flex flex-col">
              <h1
                className="text-[clamp(2.2rem,5.5vw,4.75rem)] leading-[1.02] tracking-tight text-balance break-words font-normal"
                style={{
                  fontFamily: sessionFont || undefined,
                  fontWeight: titleWeight,
                  letterSpacing: letterSpacing,
                  color: palette.ink,
                }}
              >
                {displayName}
              </h1>

              {/* Subtítulo */}
              {subtitle && (
                <p
                  className="text-sm md:text-base italic opacity-85 mt-3 font-serif"
                  style={{ color: palette.ink }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Metadados (Data) */}
          {formattedDate && (
            <p
              className="text-[clamp(0.65rem,1vw,0.78rem)] uppercase tracking-[0.18em] font-sans font-medium mt-6 mb-8"
              style={{ color: palette.inkMuted }}
            >
              {formattedDate}
            </p>
          )}

          {/* CTA Solid com contraste automático calculado */}
          <div className="mt-2 w-full sm:w-auto">
            <CoverCta
              variant="solid"
              label={ctaLabel || 'Ver galeria'}
              onClick={handleScroll}
              palette={palette}
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        {/* Indicador de Rolagem Discreto no Rodapé */}
        <div className="mt-10 md:mt-14 hidden md:block">
          <CoverScrollCue onClick={handleScroll} color={palette.inkMuted} />
        </div>
      </div>
    </section>
  );
}
