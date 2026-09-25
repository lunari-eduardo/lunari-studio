import { useEffect, useState } from 'react';
import {
  ExternalLink,
  Globe,
  Sparkles,
  Camera,
  Calendar,
  CreditCard,
  FileCheck2,
  ClipboardList,
  Play,
} from 'lucide-react';
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
  badge?: string;
  isLunari?: boolean;
  isYouTube?: boolean;
}

// Cache simples em memória para evitar múltiplos fetches durante a sessão
const metaCache = new Map<string, PreviewMeta>();

function getLunariMeta(urlStr: string, pathname: string, domain: string): PreviewMeta | null {
  const isLunariDomain =
    domain.includes('lunarihub.com') ||
    domain.includes('localhost') ||
    domain.includes('lunari') ||
    urlStr.includes('/galeria/') ||
    urlStr.includes('/proposta/') ||
    urlStr.includes('/orcamento/') ||
    urlStr.includes('/book/') ||
    urlStr.includes('/formulario/') ||
    urlStr.includes('/contrato/') ||
    urlStr.includes('/l/');

  if (!isLunariDomain) return null;

  if (pathname.includes('/galeria/') || pathname.startsWith('/g/')) {
    return {
      title: 'Galeria de Fotos do Cliente',
      description: 'Acesse para visualizar, selecionar suas fotos favoritas e solicitar extras com alta resolução.',
      domain: 'lunarihub.com',
      badge: 'Lunari Gallery',
      isLunari: true,
    };
  }

  if (pathname.includes('/proposta/') || pathname.includes('/orcamento/') || pathname.startsWith('/p/')) {
    return {
      title: 'Apresentação & Proposta Comercial',
      description: 'Visualização da proposta comercial com pacotes, serviços inclusos e condições.',
      domain: 'lunarihub.com',
      badge: 'Lunari Proposta',
      isLunari: true,
    };
  }

  if (pathname.includes('/book/') || pathname.includes('/agendamento/')) {
    return {
      title: 'Agendamento Online de Sessão',
      description: 'Escolha a data e horário desejados para o seu ensaio fotográfico.',
      domain: 'lunarihub.com',
      badge: 'Lunari Agenda',
      isLunari: true,
    };
  }

  if (pathname.includes('/l/') || pathname.includes('/pay/') || pathname.includes('/checkout/')) {
    return {
      title: 'Pagamento Seguro',
      description: 'Link seguro para pagamento do ensaio via Pix ou Cartão de Crédito.',
      domain: 'lunarihub.com',
      badge: 'Pagamento Seguro',
      isLunari: true,
    };
  }

  if (pathname.includes('/contrato/')) {
    return {
      title: 'Contrato de Prestação de Serviços',
      description: 'Revise os termos e assine digitalmente com total segurança.',
      domain: 'lunarihub.com',
      badge: 'Lunari Contratos',
      isLunari: true,
    };
  }

  if (pathname.includes('/formulario/')) {
    return {
      title: 'Formulário de Pré-Ensaio',
      description: 'Responda as perguntas para alinharmos detalhes e expectativas do ensaio.',
      domain: 'lunarihub.com',
      badge: 'Lunari Formulário',
      isLunari: true,
    };
  }

  return {
    title: 'Lunari · Plataforma para Fotógrafos',
    description: 'Gestão, galerias e inteligência para estúdios fotográficos.',
    domain: 'lunarihub.com',
    badge: 'Lunari',
    isLunari: true,
  };
}

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
    const pathname = parsedUrl.pathname;

    // 1. Verificar se é link do Lunari
    const lunariMeta = getLunariMeta(url, pathname, domain);
    if (lunariMeta) {
      metaCache.set(url, lunariMeta);
      setMeta(lunariMeta);
      setLoading(false);
      return;
    }

    // 2. Verificar se é YouTube
    const ytVideoId = getYouTubeVideoId(parsedUrl);
    if (ytVideoId) {
      const ytMeta: PreviewMeta = {
        title: 'Vídeo no YouTube',
        description: 'Clique para assistir diretamente no YouTube.',
        imageUrl: `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`,
        domain: 'youtube.com',
        badge: 'YouTube',
        isYouTube: true,
      };
      metaCache.set(url, ytMeta);
      setMeta(ytMeta);
      setLoading(false);
      return;
    }

    // 3. Fallback inicial para links externos
    const fallbackMeta: PreviewMeta = {
      title: domain,
      description: parsedUrl.pathname !== '/' ? parsedUrl.pathname : undefined,
      domain,
    };

    // 4. Buscar metadados Open Graph via Microlink (com timeout seguro de 4s)
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    })
      .then(res => res.json())
      .then(json => {
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

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group block mt-2 text-left rounded-xl overflow-hidden transition-all duration-150',
        'border border-black/[0.08] dark:border-white/[0.08]',
        isOutbound
          ? 'bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.09]'
          : 'bg-black/[0.03] dark:bg-black/30 hover:bg-black/[0.06] dark:hover:bg-black/40',
        className
      )}
      style={{ maxWidth: '340px' }}
    >
      {/* Imagem de preview (quando disponível) */}
      {currentMeta.imageUrl && (
        <div className="relative w-full h-36 bg-black/5 dark:bg-white/5 overflow-hidden">
          <img
            src={currentMeta.imageUrl}
            alt={currentMeta.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={e => {
              // Se a imagem falhar ao carregar, esconde o bloco de imagem
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {currentMeta.isYouTube && (
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo textual do preview */}
      <div className="p-2.5">
        <div className="flex items-center justify-between gap-1.5 mb-1">
          {currentMeta.badge ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase',
                currentMeta.isLunari
                  ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40 dark:border-amber-700/40'
                  : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              )}
            >
              {currentMeta.isLunari && <Sparkles className="h-2.5 w-2.5 text-[#C9A87C]" />}
              {currentMeta.badge}
            </span>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
              {currentMeta.domain && (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${currentMeta.domain}&sz=32`}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm shrink-0"
                  onError={e => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <span className="truncate">{currentMeta.domain}</span>
            </div>
          )}

          <ExternalLink className="h-3 w-3 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
        </div>

        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-[#B8925F] dark:group-hover:text-[#D4AF37] transition-colors">
          {currentMeta.title}
        </h4>

        {currentMeta.description && (
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1 leading-normal">
            {currentMeta.description}
          </p>
        )}
      </div>
    </a>
  );
}
