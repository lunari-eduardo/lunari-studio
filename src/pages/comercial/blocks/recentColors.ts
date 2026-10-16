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

// ============================================================
// ÚLTIMA COR DE TEXTO USADA (seletor flutuante de texto)
// Mantém fixa no seletor de texto a cor mais recentemente escolhida
// ============================================================

const TEXT_COLOR_KEY = 'lunari:proposal:recent-text-color';
const textListeners = new Set<() => void>();
let textColorCache: string | null = null;

function readTextColor(): string | null {
  if (textColorCache !== null) return textColorCache;
  try {
    const raw = localStorage.getItem(TEXT_COLOR_KEY);
    textColorCache = isHexColor(raw) ? raw.toLowerCase() : null;
  } catch {
    textColorCache = null;
  }
  return textColorCache;
}

export function getLastTextColor(): string | null {
  return readTextColor();
}

export function setLastTextColor(hex: string) {
  if (!isHexColor(hex)) return;
  const h = hex.toLowerCase();
  textColorCache = h;
  try {
    localStorage.setItem(TEXT_COLOR_KEY, h);
  } catch {}
  textListeners.forEach((l) => l());
}

const subscribeTextColor = (l: () => void) => {
  textListeners.add(l);
  return () => {
    textListeners.delete(l);
  };
};

/** Última cor de texto confirmada pelo fotógrafo (fixa no seletor da barra flutuante). */
export const useLastTextColor = () => useSyncExternalStore(subscribeTextColor, readTextColor, () => null);

/**
 * Ref de `<input type="color">`: grava nos recentes quando o seletor nativo confirma.
 * O `onChange` do React dispara a cada arrasto; só o evento `change` nativo marca a escolha final.
 */
export const commitRecentOnChange = (el: HTMLInputElement | null) => {
  el?.addEventListener('change', () => pushRecentColor(el.value));
};

/**
 * Ref de `<input type="color">` para texto: grava a última cor quando o seletor nativo confirma.
 */
export const commitRecentTextColorOnChange = (el: HTMLInputElement | null) => {
  el?.addEventListener('change', () => setLastTextColor(el.value));
};

