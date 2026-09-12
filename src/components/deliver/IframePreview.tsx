import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface IframePreviewProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  children: React.ReactNode;
  viewport?: 'desktop' | 'mobile';
}

export function IframePreview({
  children,
  title = 'Preview',
  viewport,
  ...props
}: IframePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);

  const virtualWidth = viewport === 'desktop' ? 1280 : 375;
  const virtualHeight = viewport === 'desktop' ? 720 : 667;

  // Atualiza o fator de escala dinamicamente baseado no tamanho físico do container
  useEffect(() => {
    if (!viewport) {
      setScale(1);
      return;
    }
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const updateScale = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw > 0 && ch > 0) {
        const s = Math.min(cw / virtualWidth, ch / virtualHeight);
        setScale(s);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);

    return () => observer.disconnect();
  }, [viewport, virtualWidth, virtualHeight]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    const copyStyles = () => {
      const styles = document.head.querySelectorAll('style');
      styles.forEach((style) => {
        const clonedStyle = style.cloneNode(true);
        doc.head.appendChild(clonedStyle);
      });

      const links = document.head.querySelectorAll('link[rel="stylesheet"]');
      links.forEach((link) => {
        const clonedLink = link.cloneNode(true);
        doc.head.appendChild(clonedLink);
      });

      const fonts = document.head.querySelectorAll('link[rel="preconnect"]');
      fonts.forEach((link) => {
        const clonedLink = link.cloneNode(true);
        doc.head.appendChild(clonedLink);
      });
    };

    let ro: ResizeObserver | null = null;

    const initIframe = () => {
      if (!doc.head) return;
      if (!doc.head.querySelector('style')) {
        doc.head.innerHTML = '';
        const baseTag = doc.createElement('base');
        baseTag.href = window.location.origin + '/';
        doc.head.appendChild(baseTag);
        copyStyles();

        const baseReset = doc.createElement('style');
        baseReset.textContent = `
          html, body { height: 100%; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          #iframe-root { display: flex; flex-direction: column; width: 100%; height: 100%; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.25); border-radius: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
        `;
        doc.head.appendChild(baseReset);

        doc.documentElement.className = document.documentElement.className;
        doc.body.className = 'bg-background text-foreground antialiased h-full w-full overflow-y-auto overflow-x-hidden';

        const rootDiv = doc.createElement('div');
        rootDiv.id = 'iframe-root';
        rootDiv.className = 'w-full flex flex-col overflow-hidden';
        doc.body.appendChild(rootDiv);

        const syncHeight = () => {
          if (iframe.clientHeight > 0) {
            rootDiv.style.height = `${iframe.clientHeight}px`;
            rootDiv.style.minHeight = `${iframe.clientHeight}px`;
          }
        };

        if (typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(syncHeight);
          ro.observe(iframe);
        }
        syncHeight();

        setMountNode(rootDiv);
      }
    };

    if (doc.readyState === 'complete') {
      initIframe();
    } else {
      iframe.onload = initIframe;
    }

    const timer = setTimeout(() => {
      if (!mountNode) initIframe();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden flex items-center justify-center bg-background select-none"
    >
      <iframe
        ref={iframeRef}
        title={title}
        className="border-0 bg-background shrink-0"
        sandbox="allow-same-origin allow-scripts"
        style={
          viewport
            ? {
                width: `${virtualWidth}px`,
                height: `${virtualHeight}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease-out',
              }
            : {
                width: '100%',
                height: '100%',
              }
        }
        {...props}
      >
        {mountNode && createPortal(children, mountNode)}
      </iframe>
    </div>
  );
}
