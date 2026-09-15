/**
 * useBeforeUnload — proteção contra perda de trabalho ao fechar/refresh.
 *
 * Comportamento:
 *  - Quando `when === true`, registra um listener `beforeunload` que aciona
 *    o prompt nativo do navegador ("Tem certeza que deseja sair?").
 *  - Quando `when === false`, remove o listener.
 *
 * Não cobre navegação SPA interna (entre rotas do Lunari). Para isso seria
 * necessário um data router + `useBlocker` — fora do escopo desta etapa.
 */
import { useEffect } from 'react';

export function useBeforeUnload(when: boolean): void {
  useEffect(() => {
    if (!when) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome exige returnValue definido; alguns navegadores ignoram a string.
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);
}
