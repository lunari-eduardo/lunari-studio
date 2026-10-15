/**
 * Barramento de mudanças de tabela (estilo "refetch").
 *
 * Substitui `supabase.channel().on('postgres_changes')` nos hooks que apenas
 * recarregam dados quando algo muda e não usam o payload. Ganhos:
 *  - 1 canal por (usuário, tabela), compartilhado por todos os consumidores
 *    (antes: 10 canais em `clientes_sessoes`, 8 em `clientes_transacoes`);
 *  - INSERT/UPDATE filtrados por `user_id` (o Realtime descarta eventos de
 *    outros usuários antes de avaliar RLS);
 *  - callback com debounce: N linhas alteradas em lote = 1 refetch.
 *
 * DELETE não aceita filtro (o registro antigo só traz a PK), por isso é
 * assinado sem filtro — mesmo comportamento anterior.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/** Tabelas sem coluna `user_id`: assinadas sem filtro (RLS continua valendo). */
const NO_USER_ID = new Set(['cobranca_parcelas', 'gateway_cash_movements']);
const DISPOSE_GRACE_MS = 3_000;

interface Entry {
  channel: RealtimeChannel;
  listeners: Set<() => void>;
  disposeTimer: ReturnType<typeof setTimeout> | null;
}

// globalThis: sobrevive à duplicação de módulo por code-splitting.
const KEY = '__lunari_table_change_bus_v1__';
const g = globalThis as unknown as Record<string, Map<string, Entry> | undefined>;
const store = (g[KEY] ??= new Map<string, Entry>());

function acquire(table: string, userId: string, listener: () => void): () => void {
  const key = `${userId}:${table}`;
  let entry = store.get(key);

  if (!entry) {
    const listeners = new Set<() => void>();
    const fire = () => listeners.forEach((l) => l());
    const scoped = NO_USER_ID.has(table) ? {} : { filter: `user_id=eq.${userId}` };
    const channel = supabase
      .channel(`bus_${table}_${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, ...scoped }, fire)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, ...scoped }, fire)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, fire)
      .subscribe();
    entry = { channel, listeners, disposeTimer: null };
    store.set(key, entry);
  }

  if (entry.disposeTimer) {
    clearTimeout(entry.disposeTimer);
    entry.disposeTimer = null;
  }
  entry.listeners.add(listener);
  const current = entry;

  return () => {
    current.listeners.delete(listener);
    if (current.listeners.size > 0 || current.disposeTimer) return;
    // Grace curto: remount rápido (StrictMode, troca de aba) reaproveita o canal.
    current.disposeTimer = setTimeout(() => {
      if (current.listeners.size > 0 || store.get(key) !== current) return;
      try {
        void supabase.removeChannel(current.channel);
      } catch {
        /* noop */
      }
      store.delete(key);
    }, DISPOSE_GRACE_MS);
  };
}

/**
 * Chama `callback` (debounced) quando qualquer uma das `tables` do usuário
 * logado mudar. Retorna a função de cleanup — pode ser usada direto em useEffect.
 */
export function onTableChange(
  tables: string | string[],
  callback: () => void,
  debounceMs = 400,
): () => void {
  const list = Array.isArray(tables) ? tables : [tables];
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsubs: Array<() => void> = [];

  const debounced = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!cancelled) callback();
    }, debounceMs);
  };

  // getSession lê do storage local (sem round-trip).
  void supabase.auth.getSession().then(({ data: { session } }) => {
    const userId = session?.user?.id;
    if (cancelled || !userId) return;
    for (const table of list) unsubs.push(acquire(table, userId, debounced));
  });

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    unsubs.forEach((u) => u());
    unsubs.length = 0;
  };
}
