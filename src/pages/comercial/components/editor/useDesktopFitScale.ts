import { useLayoutEffect, useState, type RefObject } from 'react';

/** Largura nominal da arte (max-w-5xl do VisualRenderer): a composição de desktop é desenhada para ela. */
export const DESKTOP_DOC_REM = 64;

/**
 * Escala que encaixa a composição de desktop na largura disponível do elemento (1 = cabe inteira).
 * A arte é diagramada na largura nominal e reduzida com `zoom`, em vez de reorganizar as colunas:
 * o cliente vê o mesmo desenho do editor, só menor.
 */
export function useDesktopFitScale(ref: RefObject<HTMLElement>, enabled: boolean): number {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) {
      setScale(1);
      return;
    }
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const nominal = DESKTOP_DOC_REM * rem;
      const avail = el.clientWidth;
      // Tolerância: a borda do cartão (md:border) tira ~2px da largura útil no desktop cheio
      const next = avail >= nominal - 4 ? 1 : Math.floor((avail / nominal) * 1000) / 1000;
      setScale((prev) => (prev === next ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled]);

  return enabled ? scale : 1;
}
