import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export const URL_REGEX = /((?:https?:\/\/|www\.)[^\s]+)/gi;

export function extractFirstUrl(text: string): string | null {
  if (!text) return null;
  URL_REGEX.lastIndex = 0;
  const match = URL_REGEX.exec(text);
  if (!match || match.length === 0) return null;
  let url = match[0];
  // Remove pontuações finais comuns coladas na URL (., ), etc.)
  url = url.replace(/[.,;:!?)\]]+$/, '');
  if (url.startsWith('www.')) {
    url = `https://${url}`;
  }
  return url;
}

interface PreviewMeta {
  title: string;
  description?: string;
  imageUrl?: string | null;
  domain: string;
  isYouTube?: boolean;
}

// Cache simples em memória para evitar múltiplos fetches durante a sessão
const metaCache = new Map<string, PreviewMeta>();

function getYouTubeVideoId(url: URL): string | null {
  if (url.hostname.includes('youtu.be')) {
    return url.pathname.slice(1);
  }
  if (url.hostname.includes('youtube.com')) {
    if (url.pathname.startsWith('/shorts/')) {
      return url.pathname.replace('/shorts/', '');
    }
    return url.searchParams.get('v');
  }
  return null;
}

/**
 * Detecta se é link de proposta (/p/), galeria (/g/), entrega (/c/) ou formulário (/formulario/).
 * Retorna os parâmetros para consulta no worker gallery-og.
 */
function getLunariWorkerParams(url: URL): string | null {
  const pathname = url.pathname;
  
  // Proposta por token: /p/:token
  const pMatch = pathname.match(/^\/p\/([^/]+)/);
  if (pMatch) {
    return `type=proposal&token=${encodeURIComponent(pMatch[1])}`;
  }

  // Galeria por token: /g/:token
  const gMatch = pathname.match(/^\/g\/([^/]+)/);
  if (gMatch) {
    return `token=${encodeURIComponent(gMatch[1])}`;
  }

  // Entrega / download por token: /c/:token
  const cMatch = pathname.match(/^\/c\/([^/]+)/);
  if (cMatch) {
    return `type=deliver&token=${encodeURIComponent(cMatch[1])}`;
  }

  // Formulário por token: /formulario/:token
  const fMatch = pathname.match(/^\/formulario\/([^/]+)/);
  if (fMatch) {
    return `type=form&token=${encodeURIComponent(fMatch[1])}`;
  }

  return null;
}

/**
 * Extrai tags OpenGraph de HTML caso o endpoint do Worker retorne HTML
 */
function parseOgFromHtml(html: string, fallbackDomain: string): PreviewMeta {
  const getMeta = (prop: string) => {
    const m1 = html.match(new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:)?${prop}["'][^>]+content=["']([^"']+)["']`, 'i'));
    if (m1) return m1[1];
    const m2 = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:)?${prop}["']`, 'i'));
    return m2 ? m2[1] : null;
  };

  const title = getMeta('title') || html.match(/<title>([^<]+)<\/title>/i)?.[1] || fallbackDomain;
  const description = getMeta('description') || undefined;
  const imageUrl = getMeta('image') || null;

  return {
    title,
    description,
    imageUrl,
    domain: fallbackDomain,
  };
}

export interface LinkPreviewProps {
  url: string;
  direction?: 'inbound' | 'outbound';
  className?: string;
}

export function LinkPreview({ url, direction = 'outbound', className }: LinkPreviewProps) {
  const [meta, setMeta] = useState<PreviewMeta | null>(() => metaCache.get(url) ?? null);
  const [loading, setLoading] = useState<boolean>(!metaCache.has(url));

  useEffect(() => {
    let isCancelled = false;

    if (metaCache.has(url)) {
      setMeta(metaCache.get(url)!);
      setLoading(false);
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      setLoading(false);
      return;
    }

    const domain = parsedUrl.hostname.replace(/^www\./, '');

    // 1. YouTube
    const ytVideoId = getYouTubeVideoId(parsedUrl);
    if (ytVideoId) {
      const ytMeta: PreviewMeta = {
        title: 'Vídeo no YouTube',
        description: 'Clique para assistir no YouTube.',
        imageUrl: `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`,
        domain: 'youtube.com',
        isYouTube: true,
      };
      metaCache.set(url, ytMeta);
      setMeta(ytMeta);
      setLoading(false);
      return;
    }

    // 2. Links do ecossistema Lunari (Propostas, Galerias, Entregas, Formulários)
    const lunariParams = getLunariWorkerParams(parsedUrl);
    if (lunariParams) {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      fetch(`https://lunari-edge-previews.eduardo22diehl.workers.dev/functions/v1/gallery-og?${lunariParams}&format=json`, {
        signal: controller.signal,
        headers: { Accept: 'application/json, text/html' },
      })
        .then(async (res) => {
          clearTimeout(timeoutId);
          if (isCancelled) return;
          const text = await res.text();
          let resolvedMeta: PreviewMeta;

          if (text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            resolvedMeta = {
              title: data.title || domain,
              description: data.description,
              imageUrl: data.imageUrl || null,
              domain: data.domain || domain,
            };
          } else {
            resolvedMeta = parseOgFromHtml(text, domain);
          }

          metaCache.set(url, resolvedMeta);
          setMeta(resolvedMeta);
        })
        .catch(() => {
          if (!isCancelled) {
            const fallback: PreviewMeta = { title: domain, domain };
            metaCache.set(url, fallback);
            setMeta(fallback);
          }
        })
        .finally(() => {
          if (!isCancelled) setLoading(false);
        });

      return () => {
        isCancelled = true;
        clearTimeout(timeoutId);
        controller.abort();
      };
    }

    // 3. Fallback inicial para links externos
    const fallbackMeta: PreviewMeta = {
      title: domain,
      description: parsedUrl.pathname !== '/' ? parsedUrl.pathname : undefined,
      domain,
    };

    // 4. Buscar metadados Open Graph via Microlink para links externos
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => {
        clearTimeout(timeoutId);
        if (isCancelled) return;

        if (json?.status === 'success' && json?.data) {
          const d = json.data;
          const resolvedMeta: PreviewMeta = {
            title: d.title || domain,
            description: d.description || undefined,
            imageUrl: d.image?.url || null,
            domain: d.publisher || domain,
          };
          metaCache.set(url, resolvedMeta);
          setMeta(resolvedMeta);
        } else {
          metaCache.set(url, fallbackMeta);
          setMeta(fallbackMeta);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          metaCache.set(url, fallbackMeta);
          setMeta(fallbackMeta);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [url]);

  if (!meta && !loading) return null;

  const currentMeta = meta || {
    title: 'Carregando pré-visualização...',
    domain: '',
  };

  const isOutbound = direction === 'outbound';

  // Preview nativo estilo WhatsApp
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group block text-left rounded-xl overflow-hidden transition-all duration-150 select-none cursor-pointer',
        'w-full max-w-[360px] sm:max-w-[420px]',
        isOutbound
          ? 'bg-black/[0.04] dark:bg-black/35 hover:bg-black/[0.07] dark:hover:bg-black/45'
          : 'bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.07]',
        className
      )}
    >
      {/* Se for vídeo (YouTube), exibe banner widescreen com play */}
      {currentMeta.isYouTube && currentMeta.imageUrl ? (
        <>
          <div className="relative w-full aspect-video bg-black/10 dark:bg-white/5 overflow-hidden">
            <img
              src={currentMeta.imageUrl}
              alt={currentMeta.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
              <div className="h-11 w-11 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </div>
            </div>
          </div>
          <div className="p-2.5">
            <h4 className="text-[13px] sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-tight">
              {currentMeta.title}
            </h4>
            {currentMeta.description && (
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                {currentMeta.description}
              </p>
            )}
            <span className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 block">
              {currentMeta.domain}
            </span>
          </div>
        </>
      ) : loading ? (
        /* Skeleton de carregamento compacto horizontal */
        <div className="flex items-center gap-2.5 p-2 animate-pulse">
          <div className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-lg bg-black/5 dark:bg-white/5 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5 py-1">
            <div className="h-3.5 bg-black/10 dark:bg-white/10 rounded w-3/4" />
            <div className="h-2.5 bg-black/5 dark:bg-white/5 rounded w-5/6" />
            <div className="h-2.5 bg-black/5 dark:bg-white/5 rounded w-1/3" />
          </div>
        </div>
      ) : (
        /* Card nativo horizontal estilo WhatsApp (Imagem 4) */
        <div className="flex items-center gap-2.5 p-2">
          {currentMeta.imageUrl && (
            <div className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] shrink-0 bg-black/5 dark:bg-white/5 overflow-hidden rounded-lg">
              <img
                src={currentMeta.imageUrl}
                alt={currentMeta.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.parentElement) target.parentElement.style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
            <h4 className="text-[13px] sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-tight">
              {currentMeta.title}
            </h4>

            {currentMeta.description && (
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                {currentMeta.description}
              </p>
            )}

            <span className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 block truncate">
              {currentMeta.domain}
            </span>
          </div>
        </div>
      )}
    </a>
  );
}
