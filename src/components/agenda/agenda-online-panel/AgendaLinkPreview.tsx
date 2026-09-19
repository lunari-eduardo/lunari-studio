import { useMemo } from 'react';
import { formatCurrency } from '@/utils/financialUtils';
import { cn } from '@/lib/utils';
import { Calendar, Clock, Sparkles } from 'lucide-react';

interface AgendaLinkPreviewProps {
  title: string;
  description?: string;
  studioName?: string;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  coverPosition?: string;
  packages: Array<{ id: string; nome: string; valor_base: number; fotos_incluidas?: number }>;
  showPackagePrice: boolean;
  viewport: 'mobile' | 'desktop';
}

/**
 * Preview espelhado da página pública. Não é a página real —
 * é uma representação proporcional para o fotógrafo validar antes de publicar.
 */
export function AgendaLinkPreview({
  title,
  description,
  studioName,
  logoUrl,
  avatarUrl,
  coverUrl,
  coverPosition,
  packages,
  showPackagePrice,
  viewport,
}: AgendaLinkPreviewProps) {
  const initials = useMemo(() => {
    const src = (studioName || 'LS').trim();
    return src.slice(0, 2).toUpperCase();
  }, [studioName]);

  const isMobile = viewport === 'mobile';

  return (
    <div
      className={cn(
        'mx-auto bg-neutral-50 rounded-2xl overflow-hidden border border-border/60 shadow-sm',
        isMobile ? 'w-[280px]' : 'w-full max-w-[640px]'
      )}
    >
      {/* Capa com identidade sobreposta */}
      <div className="relative">
        <div
          className={cn(
            'relative w-full bg-gradient-to-br from-neutral-300 to-neutral-100',
            isMobile ? 'aspect-[4/5]' : 'aspect-[16/9]'
          )}
        >
          {coverUrl && (
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: coverPosition || '50% 50%' }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/50" />

          {/* Identidade sobre a capa */}
          <div className="absolute inset-x-0 top-0 p-3 flex items-center gap-2">
            {logoUrl || avatarUrl ? (
              <img
                src={(logoUrl || avatarUrl)!}
                alt={studioName || 'Estúdio'}
                className="w-7 h-7 rounded-full border border-white/40 object-cover bg-white/10 backdrop-blur-sm"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-[10px] font-bold">
                {initials}
              </div>
            )}
            {studioName && (
              <span className="text-white text-[10px] uppercase tracking-wider font-semibold drop-shadow">
                {studioName}
              </span>
            )}
          </div>

          {/* Título sobre a capa */}
          {title && (
            <div className="absolute inset-x-0 bottom-0 p-3">
              <h3 className="text-white text-base font-bold leading-tight drop-shadow line-clamp-2">
                {title}
              </h3>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-3 space-y-3 bg-white">
        {description && (
          <p className="text-[10px] text-neutral-600 line-clamp-2 leading-snug">
            {description}
          </p>
        )}

        {/* Pacotes (preview) */}
        {packages.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-neutral-900">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Escolha sua experiência</span>
            </div>
            <div className="space-y-1">
              {packages.slice(0, 4).map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50/40 text-[10px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900 truncate">{pkg.nome}</p>
                    {pkg.fotos_incluidas ? (
                      <p className="text-neutral-500 text-[9px]">{pkg.fotos_incluidas} fotos</p>
                    ) : null}
                  </div>
                  {showPackagePrice && (
                    <span className="font-bold text-neutral-900 shrink-0">
                      {formatCurrency(Number(pkg.valor_base) || 0)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicador de calendário */}
        <div className="flex items-center gap-2 text-[10px] text-neutral-500 pt-1 border-t border-neutral-100">
          <Calendar className="w-3 h-3" />
          <span>Calendário interativo</span>
          <Clock className="w-3 h-3 ml-auto" />
          <span>10 min reserva</span>
        </div>
      </div>
    </div>
  );
}
