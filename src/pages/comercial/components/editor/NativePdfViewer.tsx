import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configura o worker do pdf.js via unpkg para garantir estabilidade máxima
// independentemente de como o empacotador (Vite/Webpack) resolve assets.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface NativePdfViewerProps {
  url: string;
  logoUrl?: string;
  /** Cor de fundo da moldura externa que envolve as páginas do PDF. */
  backgroundClass?: string;
  /** Callback opcional para capturar a primeira página renderizada (capa). */
  onFirstPageRendered?: (dataUrl: string) => void;
}

interface PdfPageItemProps {
  pageNumber: number;
  width: number | undefined;
  onFirstPageRendered?: (dataUrl: string) => void;
  firstPageCaptureRef: React.MutableRefObject<{ attempted: boolean }>;
}

/**
 * Componente individual de página com suporte a Lazy Loading nativo (IntersectionObserver).
 * A página 1 carrega imediatamente; páginas subsequentes são renderizadas sob demanda conforme o scroll.
 */
function PdfPageItem({
  pageNumber,
  width,
  onFirstPageRendered,
  firstPageCaptureRef,
}: PdfPageItemProps) {
  // A primeira página sempre inicia visível para renderização instantânea
  const [isVisible, setIsVisible] = useState(pageNumber === 1);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pageNumber === 1) return;
    const el = pageContainerRef.current;
    if (!el) return;

    // Observa quando a página se aproxima do viewport (com 300px de margem para antecipar o scroll)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber]);

  return (
    <div
      ref={pageContainerRef}
      data-page={pageNumber}
      className="mb-6 shadow-xl rounded-md overflow-hidden bg-white mx-auto transition-transform hover:shadow-2xl flex flex-col"
      style={{ width: width ? `${width}px` : 'fit-content' }}
    >
      {isVisible ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          renderTextLayer={true}
          renderAnnotationLayer={true}
          loading={
            <div
              className="flex flex-col justify-center items-center bg-white aspect-[1/1.414] w-full"
              style={{ minHeight: width ? Math.round(width * 1.414) : 400 }}
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/40 mb-2" />
              <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider">
                Página {pageNumber}
              </span>
            </div>
          }
          onRenderSuccess={() => {
            // Captura a primeira página como data URL para uso de capa
            if (pageNumber === 1 && onFirstPageRendered && !firstPageCaptureRef.current.attempted) {
              firstPageCaptureRef.current.attempted = true;
              requestAnimationFrame(() => {
                const canvas = pageContainerRef.current?.querySelector(
                  'canvas.react-pdf__Page__canvas'
                ) as HTMLCanvasElement | null;
                if (!canvas) return;
                try {
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                  onFirstPageRendered(dataUrl);
                } catch {
                  // Silent fallback em caso de restrição de canvas
                }
              });
            }
          }}
        />
      ) : (
        /* Placeholder esqueleto enquanto a página não entra no viewport */
        <div
          className="flex flex-col justify-center items-center bg-white/70 aspect-[1/1.414] w-full"
          style={{ minHeight: width ? Math.round(width * 1.414) : 400 }}
        >
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/30 mb-2" />
          <span className="text-[11px] text-muted-foreground/50 font-medium">
            Página {pageNumber}
          </span>
        </div>
      )}
    </div>
  );
}

export function NativePdfViewer({
  url,
  logoUrl,
  backgroundClass = 'bg-[#F3F4F6]',
  onFirstPageRendered,
}: NativePdfViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstPageCaptureRef = useRef<{ attempted: boolean }>({ attempted: false });

  // ResizeObserver para manter o layout proporcional
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
      setContainerWidth(containerRef.current.clientWidth);
    }

    return () => observer.disconnect();
  }, []);

  // Limpa o estado e erros sempre que a URL muda
  useEffect(() => {
    setLoadError(null);
    setNumPages(undefined);
    firstPageCaptureRef.current.attempted = false;
  }, [url]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setLoadError(null);
  }

  function onDocumentLoadError(err: Error): void {
    const message = (err?.message || '').toLowerCase();
    let friendly = 'Não foi possível carregar o arquivo. Verifique sua conexão ou tente novamente.';
    if (message.includes('cors') || message.includes('cross-origin')) {
      friendly = 'O servidor do arquivo bloqueou o acesso (CORS). Entre em contato com o suporte.';
    } else if (message.includes('404') || message.includes('not found')) {
      friendly = 'Arquivo não encontrado. Ele pode ter sido removido.';
    } else if (message.includes('failed to fetch') || message.includes('networkerror')) {
      friendly = 'Falha de rede ao buscar o arquivo. Verifique sua conexão.';
    } else if (message.includes('password')) {
      friendly = 'Este PDF está protegido por senha.';
    }
    setLoadError(friendly);
    console.error('[NativePdfViewer] failed to load PDF', err);
  }

  // Largura 50% menor no desktop para visualização compacta, confortável e elegante
  const effectiveWidth = containerWidth
    ? containerWidth > 640
      ? Math.min(Math.round(containerWidth * 0.5), 540)
      : Math.min(containerWidth - 32, 480)
    : undefined;

  return (
    <div
      className={cn(
        'w-full h-full min-h-screen flex flex-col items-center pt-8 pb-32',
        backgroundClass
      )}
      ref={containerRef}
    >
      <div className="w-full max-w-2xl px-4 mx-auto flex flex-col gap-6 items-center">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3 min-h-[50vh]">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-full mb-2 animate-pulse" />
              ) : (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50 mb-2" />
              )}
              <p className="text-xs uppercase tracking-widest opacity-60">carregando...</p>
            </div>
          }
          error={
            <div className="bg-destructive/10 text-destructive p-6 rounded-xl border border-destructive/20 text-center w-full max-w-lg">
              <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-80" />
              <p className="font-semibold mb-2">Erro ao carregar o PDF</p>
              <p className="text-sm opacity-90">{loadError ?? 'Não foi possível carregar o arquivo. O arquivo pode estar corrompido ou o link expirou.'}</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                download
                className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Tentar baixar o arquivo
              </a>
            </div>
          }
        >
          {numPages &&
            Array.from(new Array(numPages), (_, index) => (
              <PdfPageItem
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={effectiveWidth}
                onFirstPageRendered={onFirstPageRendered}
                firstPageCaptureRef={firstPageCaptureRef}
              />
            ))}
        </Document>
      </div>
    </div>
  );
}
