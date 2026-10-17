import { getPhotoUrl } from '@/lib/photoUrl';
import { applyTitleCase } from '@/lib/textTransform';
import type { CoverVariantProps } from '@/components/deliver/covers/types';
import { getFallbackCoverUrl } from '@/components/deliver/covers/defaultPhotos';

/**
 * Modelo 3 de Seleção: "Faixa horizontal" — banner baixo com foto de fundo sutil,
 * overlay claro e texto sobreposto. Editorial, mas sem o peso cinematográfico de Entrega.
 */
export default function HorizontalBandCover({
  coverPhoto,
  sessionName,
  subtitle,
  studioName,
  sessionFont,
  titleCaseMode = 'normal',
}: CoverVariantProps) {
  const rawUrl = coverPhoto ? getPhotoUrl(coverPhoto, 'preview') : null;
  const coverUrl =
    rawUrl && !rawUrl.includes('placeholder.svg') ? rawUrl : getFallbackCoverUrl('horizontal');
  const displayName = applyTitleCase(sessionName, titleCaseMode);

  return (
    <div className="relative w-full h-[220px] sm:h-[280px] overflow-hidden rounded-xl mx-auto max-w-4xl mt-4">
      <img
        src={coverUrl}
        alt={sessionName}
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.src = getFallbackCoverUrl('horizontal');
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/50 to-white/10 dark:from-black/80 dark:via-black/40 dark:to-black/5" />
      <div className="relative z-10 h-full flex flex-col items-center justify-end text-center pb-6 px-4">
        {studioName && (
          <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/70 mb-2">
            {studioName}
          </p>
        )}
        <h2
          className="text-2xl sm:text-3xl font-normal tracking-tight text-foreground"
          style={{ fontFamily: sessionFont || undefined }}
        >
          {displayName}
        </h2>
        {subtitle && <p className="text-sm italic text-foreground/70 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
