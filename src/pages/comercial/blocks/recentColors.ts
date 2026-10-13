import { useSyncExternalStore } from 'react';
import { isHexColor } from './design';

// ============================================================
// CORES RECENTES (seletor rápido de fundo)
// Preferência do fotógrafo, não da proposta: vale para todas as propostas,
// não entra no histórico (Ctrl+Z) nem no rascunho salvo.
// ============================================================

const KEY = 'lunari:proposal:recent-colors';
const MAX = 6;
const EMPTY: string[] = [];

const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    cache = Array.isArray(raw) ? raw.filter(isHexColor).map((c) => c.toLowerCase()).slice(0, MAX) : [];
  } catch {
    cache = [];
  }
  return cache;
}

/** Cor confirmada pelo fotógrafo vai para a frente da lista (sem duplicatas). */
export function pushRecentColor(hex: string) {
  if (!isHexColor(hex)) return;
  const h = hex.toLowerCase();
  if (read()[0] === h) return;
  cache = [h, ...read().filter((c) => c !== h)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // armazenamento bloqueado: a lista vale só nesta sessão
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Últimas cores livres confirmadas, mais recente primeiro (minúsculas, #rrggbb). */
export const useRecentColors = () => useSyncExternalStore(subscribe, read, () => EMPTY);

/**
 * Ref de `<input type="color">`: grava nos recentes quando o seletor nativo confirma.
 * O `onChange` do React dispara a cada arrasto; só o evento `change` nativo marca a escolha final.
 */
export const commitRecentOnChange = (el: HTMLInputElement | null) => {
  el?.addEventListener('change', () => pushRecentColor(el.value));
};
