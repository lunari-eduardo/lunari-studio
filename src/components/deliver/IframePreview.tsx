import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface IframePreviewProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  children: React.ReactNode;
}

export function IframePreview({ children, title = 'Preview', ...props }: IframePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    // Copia todos os estilos do documento pai para o iframe
    const copyStyles = () => {
      // 1. Copia as tags <style> (ex: criadas pelo vite/tailwind ou styled-components)
      const styles = document.head.querySelectorAll('style');
      styles.forEach((style) => {
        const clonedStyle = style.cloneNode(true);
        doc.head.appendChild(clonedStyle);
      });

      // 2. Copia as tags <link rel="stylesheet"> (ex: fontes ou CSS externo)
      const links = document.head.querySelectorAll('link[rel="stylesheet"]');
      links.forEach((link) => {
        const clonedLink = link.cloneNode(true);
        doc.head.appendChild(clonedLink);
      });
      
      // Também copiamos os links de fontes do google
      const fonts = document.head.querySelectorAll('link[rel="preconnect"]');
      fonts.forEach((link) => {
        const clonedLink = link.cloneNode(true);
        doc.head.appendChild(clonedLink);
      });
    };

    // Usando setTimeout para garantir que o iframe tenha sido inicializado no DOM pelo navegador.
    const initIframe = () => {
      if (!doc.head) return;
      if (!doc.head.querySelector('style')) {
          doc.head.innerHTML = '';
          copyStyles();
          
          // Injeta regras essenciais de altura e scrollbar sutil
          const baseReset = doc.createElement('style');
          baseReset.textContent = `
            html, body { height: 100%; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
            #iframe-root { height: 100%; min-height: 100%; display: flex; flex-direction: column; }
            ::-webkit-scrollbar { width: 4px; height: 4px; }
            ::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.25); border-radius: 4px; }
            ::-webkit-scrollbar-track { background: transparent; }
          `;
          doc.head.appendChild(baseReset);
          
          // Adiciona classes base do tailwind/app ao HTML/Body do iframe para manter herança
          doc.documentElement.className = document.documentElement.className;
          doc.body.className = 'bg-background text-foreground antialiased h-full w-full overflow-y-auto overflow-x-hidden';
          
          // O container raiz onde o React fará o portal
          const rootDiv = doc.createElement('div');
          rootDiv.id = 'iframe-root';
          rootDiv.className = 'w-full h-full min-h-full flex flex-col';
          doc.body.appendChild(rootDiv);
          
          setMountNode(rootDiv);
      }
    };
    
    // As vezes iframe.contentDocument.readyState demora um momento pra estar 'complete'
    if (doc.readyState === 'complete') {
      initIframe();
    } else {
      iframe.onload = initIframe;
    }
    
    // Se ainda não montou depois de um tempo curto (comum no React), força init
    const timer = setTimeout(() => {
      if (!mountNode) initIframe();
    }, 100);

    return () => clearTimeout(timer);
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
