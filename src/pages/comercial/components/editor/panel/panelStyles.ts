import { useCallback, useState, useSyncExternalStore } from 'react';
import { safeStorage } from '@/lib/safeStorage';

// ============================================================
// Receitas compartilhadas do painel do editor (lista de seções, inspetor, itens de lista).
// DNA: 3 níveis visuais (§4), hover sutil `bg-muted` (ui-components §1), grafite como cor de seleção.
// ============================================================

/** Rótulo de bloco (nível 3): "SEÇÃO 03 · …", "Modelo", títulos de subseção. */
export const EYEBROW = 'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground';

/** Anel de foco por teclado dos controles personalizados. */
export const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40';

/** Linha navegável: repouso/hover e selecionada (a mesma receita na lista de seções e nos itens abertos). */
export const ROW_IDLE = 'border-transparent bg-background/50 hover:bg-muted/60 hover:border-border/60';
export const ROW_SELECTED = 'border-primary/40 bg-primary/10 ring-1 ring-primary/30';

export const clampWidth = (value: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, value)));

/**
 * Largura escolhida pelo fotógrafo para uma coluna (preferência do aparelho, fora do documento e do Ctrl+Z).
 * `null` = padrão responsivo da coluna.
 */
export function useStoredWidth(key: string, min: number, max: number): [number | null, (width: number | null) => void] {
  const [width, setWidth] = useState<number | null>(() => {
    const n = Number(safeStorage.get(key));
    return Number.isFinite(n) && n > 0 ? clampWidth(n, min, max) : null;
  });
  const update = useCallback(
    (next: number | null) => {
      setWidth(next);
      if (next === null) safeStorage.remove(key);
      else safeStorage.set(key, String(next));
    },
    [key]
  );
  return [width, update];
}

// ---------- Preferência "formulário de textos aberto" (compartilhada entre a seção e o detalhe de grupo) ----------
const TEXTS_FORM_KEY = 'lunari:proposal:texts-form-open';
const textsListeners = new Set<() => void>();
let textsFormCache: boolean | null = null;

function readTextsForm(): boolean {
  if (textsFormCache !== null) return textsFormCache;
  const saved = safeStorage.get(TEXTS_FORM_KEY);
  // Sem escolha salva, abre sozinho em ponteiro grosso (toque), onde o duplo toque na arte é menos confiável
  textsFormCache = saved !== null ? saved === '1' : typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  return textsFormCache;
}

/** Formulário "Editar como formulário" aberto ou recolhido: preferência do fotógrafo, vale para todas as seções. */
export function useTextsFormOpen(): [boolean, (open: boolean) => void] {
  const open = useSyncExternalStore(
    (l) => {
      textsListeners.add(l);
      return () => textsListeners.delete(l);
    },
    readTextsForm,
    () => false
  );
  const set = useCallback((next: boolean) => {
    textsFormCache = next;
    safeStorage.set(TEXTS_FORM_KEY, next ? '1' : '0');
    textsListeners.forEach((l) => l());
  }, []);
  return [open, set];
}
