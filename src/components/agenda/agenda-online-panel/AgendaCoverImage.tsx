import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface AgendaCoverImageProps {
  src?: string | null;
  position?: string | null;
  lqip?: string | null;
  alt: string;
  className?: string;
  /** Prioridade de carregamento — true para a capa principal above the fold */
  priority?: boolean;
  /** Quando true, usa 100% do container (sem aspect-ratio) */
  fill?: boolean;
}

/**
 * Renderiza a capa editorial da Agenda Online.
 * - Suporta LQIP blur-up para perceived performance
 * - Respeita focal point via object-position
 * - Fallback de gradient neutro se src ausente
 */
export function AgendaCoverImage({
  src,
  position = '50% 50%',
  lqip,
  alt,
  className,
  priority = true,
  fill = false,
}: AgendaCoverImageProps) {
  const hasImage = Boolean(src);

  const objectPosition = useMemo(() => {
    if (!position) return '50% 50%';
    // Aceita "50% 30%" ou "top center" etc.
    return position;
  }, [position]);

  if (!hasImage) {
    return (
      <div
        className={cn(
          'relative w-full bg-gradient-to-br from-neutral-200 via-neutral-100 to-neutral-200',
          fill ? 'h-full' : 'aspect-[4/5]',
          className
        )}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.6),transparent_50%)]" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-neutral-200',
        fill ? 'h-full' : 'aspect-[4/5]',
        className
      )}
    >
      {/* LQIP placeholder */}
      {lqip && (
        <img
          src={lqip}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        style={{ objectPosition }}
        className={cn(
          'absolute inset-0 w-full h-full object-cover',
          lqip ? 'animate-in fade-in duration-500' : ''
        )}
      />
    </div>
  );
}
