import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface IframePreviewProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  children: React.ReactNode;
}

export function IframePreview({ children, title = 'Preview', ...props }: IframePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  // Armazenado no escopo do effect para poder ser limpo no return
  const roRef = { current: null as ResizeObserver | null };

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
          #iframe-root { display: flex; flex-direction: column; }
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

        // Sincroniza altura explícita do rootDiv com a altura real do iframe.
        // Garante que h-[100svh] dentro dos variantes de capa resolva corretamente.
        const syncHeight = () => {
          if (iframe.clientHeight > 0) {
            rootDiv.style.height = `${iframe.clientHeight}px`;
            rootDiv.style.minHeight = `${iframe.clientHeight}px`;
          }
        };

        roRef.current = new ResizeObserver(syncHeight);
        roRef.current.observe(iframe);
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
      roRef.current?.disconnect();
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className="w-full h-full border-0 bg-background"
      sandbox="allow-same-origin allow-scripts"
      {...props}
    >
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  );
}
