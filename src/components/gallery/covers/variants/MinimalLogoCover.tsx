import { applyTitleCase } from '@/lib/textTransform';
import type { CoverVariantProps } from '@/components/deliver/covers/types';

/**
 * Modelo 1 de Seleção: formaliza o header minimalista já existente hoje
 * (logo do estúdio centralizado + nome da sessão) como uma variante real de capa.
 */
export default function MinimalLogoCover({
  sessionName,
  subtitle,
  studioName,
  studioLogoUrl,
  sessionFont,
  titleCaseMode = 'normal',
}: CoverVariantProps) {
  const displayName = applyTitleCase(sessionName, titleCaseMode);

  return (
    <div className="flex flex-col items-center text-center pt-6 pb-2 sm:pt-8 px-4">
      {studioLogoUrl ? (
        <img
          src={studioLogoUrl}
          alt={studioName || 'Logo'}
          className="h-[86px] sm:h-[100px] md:h-[130px] lg:h-[144px] max-w-[288px] object-contain mb-6 sm:mb-8"
        />
      ) : (
        studioName && (
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-5">
            {studioName}
          </p>
        )
      )}
      <h2
        className="text-3xl sm:text-4xl font-normal mb-1 tracking-tight"
        style={{ fontFamily: sessionFont || undefined }}
      >
        {displayName}
      </h2>
      {subtitle && <p className="text-sm italic text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
