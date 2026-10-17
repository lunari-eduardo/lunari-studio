import { getPhotoUrl } from '@/lib/photoUrl';
import { applyTitleCase } from '@/lib/textTransform';
import type { CoverVariantProps } from '@/components/deliver/covers/types';
import { getFallbackCoverUrl } from '@/components/deliver/covers/defaultPhotos';

/**
 * Modelo 2 de Seleção: "Retrato emoldurado" — foto vertical única, moldura fina,
 * legenda abaixo. Compacto (não ocupa a tela inteira), tom de convite.
 */
export default function FramedPortraitCover({
  coverPhoto,
  sessionName,
  subtitle,
  studioName,
  sessionFont,
  titleCaseMode = 'normal',
}: CoverVariantProps) {
  const rawUrl = coverPhoto ? getPhotoUrl(coverPhoto, 'preview') : null;
  const coverUrl =
    rawUrl && !rawUrl.includes('placeholder.svg') ? rawUrl : getFallbackCoverUrl('vertical');
  const displayName = applyTitleCase(sessionName, titleCaseMode);

  return (
    <div className="flex flex-col items-center text-center pt-8 pb-2 sm:pt-10 px-4">
      {studioName && (
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-5">
          {studioName}
        </p>
      )}
      <div className="p-2 bg-card border border-border/60 shadow-[0_4px_30px_rgba(0,0,0,0.06)] rounded-sm">
        <img
          src={coverUrl}
          alt={sessionName}
          className="w-[180px] sm:w-[220px] aspect-[4/5] object-cover rounded-[1px]"
          onError={(e) => {
            e.currentTarget.src = getFallbackCoverUrl('vertical');
          }}
        />
      </div>
      <div className="w-10 h-px bg-border mt-6 mb-3" />
      <h2
        className="text-2xl sm:text-3xl font-normal tracking-tight"
        style={{ fontFamily: sessionFont || undefined }}
      >
        {displayName}
      </h2>
      {subtitle && <p className="text-sm italic text-muted-foreground mt-1.5">{subtitle}</p>}
    </div>
  );
}
