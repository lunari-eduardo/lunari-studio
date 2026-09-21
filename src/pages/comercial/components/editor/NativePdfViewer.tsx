import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configura o worker do pdf.js a partir do bundle já instalado em node_modules.
// Evita a dependência do unpkg em runtime (que pode estar bloqueada em
// produção por CSP ou indisponibilidade de rede) e usa exatamente a mesma
// versão do `pdfjs-dist` empacotada no build Vite.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface NativePdfViewerProps {
  url: string;
  logoUrl?: string;
  /** Cor de fundo da moldura externa que envolve as páginas do PDF. */
  backgroundClass?: string;
  /** Callback opcional para capturar a primeira página renderizada (capa). */
  onFirstPageRendered?: (dataUrl: string) => void;
}

export function NativePdfViewer({ url, logoUrl, backgroundClass = 'bg-[#F3F4F6]', onFirstPageRendered }: NativePdfViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [renderedUpToPage, setRenderedUpToPage] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstPageCaptureRef = useRef<{ attempted: boolean }>({ attempted: false });
  // Resize observer to ensure the PDF fits the container perfectly
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          // Adjust width, minus a small padding if desired
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

  // Limpa o erro sempre que a URL muda (substituição de PDF)
  useEffect(() => {
    setLoadError(null);
    setNumPages(undefined);
    setRenderedUpToPage(1);
    firstPageCaptureRef.current.attempted = false;
  }, [url]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setLoadError(null);
  }

  function onDocumentLoadError(err: Error): void {
    // Mantém uma mensagem útil para diagnóstico sem expor detalhes internos.
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

  return (
    <div
      className={cn(
        'w-full h-full min-h-screen flex flex-col items-center pt-8 pb-32',
        backgroundClass
      )}
      ref={containerRef}
    >
      <div className="w-full max-w-4xl px-4 md:px-8 mx-auto flex flex-col gap-6 items-center">
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
            <div className="bg-destructive/10 text-destructive p-6 rounded-xl border border-destructive/20 text-center w-full max-w-2xl">
              <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-80" />
              <p className="font-semibold mb-2">Erro ao carregar o PDF</p>
              <p className="text-sm opacity-90">{loadError ?? 'Não foi possível carregar o arquivo. O arquivo pode estar corrompido ou o link expirou.'}</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Tentar baixar o arquivo
              </a>
            </div>
          }
        >
          {numPages && Array.from(new Array(numPages), (el, index) => (
            <div
              key={`page_${index + 1}`}
              data-page={index + 1}
              className="mb-6 shadow-xl rounded-md overflow-hidden bg-white mx-auto transition-transform hover:shadow-2xl flex flex-col"
              style={{ width: 'fit-content' }}
            >
              {index + 1 <= renderedUpToPage ? (
                <Page
                  pageNumber={index + 1}
                  width={containerWidth ? Math.min(containerWidth - 32, 1024) : undefined}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  onRenderSuccess={(page) => {
                    if (index + 1 === renderedUpToPage && index + 1 < numPages) {
                      setRenderedUpToPage(prev => prev + 1);
                    }
                    // Captura a primeira página como data URL para uso de capa.
                    // O `Page` do react-pdf não expõe o canvas na page callback;
                    // capturamos pelo DOM que acabou de ser renderizado.
                    if (
                      onFirstPageRendered &&
                      index === 0 &&
                      !firstPageCaptureRef.current.attempted
                    ) {
                      firstPageCaptureRef.current.attempted = true;
                      // Aguarda o próximo frame para garantir que o canvas já está visível
                      requestAnimationFrame(() => {
                        const root = containerRef.current?.querySelector(
                          '[data-page-1] canvas.react-pdf__Page__canvas'
                        ) as HTMLCanvasElement | null;
                        if (!root) return;
                        try {
                          const dataUrl = root.toDataURL('image/jpeg', 0.7);
                          onFirstPageRendered(dataUrl);
                        } catch {
                          // Canvas tainted (cross-origin) ou outro motivo: silencioso.
                          // A capa fica com o placeholder já existente.
                        }
                      });
                    }
                  }}
                  loading={
                    <div className="flex justify-center items-center min-h-[400px] bg-white w-full max-w-3xl aspect-[1/1.414]">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
                    </div>
                  }
                />
              ) : (
                <div className="flex justify-center items-center min-h-[400px] bg-white w-full max-w-3xl aspect-[1/1.414]">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
                </div>
              )}
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
