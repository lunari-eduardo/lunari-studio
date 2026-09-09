/**
 * Utilitário centralizado para detecção e auto-recuperação de ChunkLoadError pós-deploy.
 * Garante que a aplicação se recupere de forma limpa quando arquivos JS antigos
 * deixam de existir no servidor, sem deslogar o fotógrafo.
 */

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const err = error as any;
  const msg = String(err?.message || err?.toString?.() || error || '').toLowerCase();

  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('dynamically imported module') ||
    msg.includes('load failed') ||
    msg.includes('failed to load resource') ||
    msg.includes('unable to preload') ||
    msg.includes("unexpected token '<'") ||
    msg.includes('mime type') ||
    msg.includes('network error when attempting to fetch resource')
  );
}

/**
 * Executa limpeza cirúrgica de Service Workers e Caches do navegador
 * preservando credenciais do Supabase (sb-*), e força o recarregamento com cache-bust.
 */
export async function forceCleanReload(clearStorageExceptAuth = false): Promise<void> {
  try {
    // 1. Se solicitado, limpa localStorage preservando tokens Supabase
    if (clearStorageExceptAuth) {
      const authBackup: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('sb-') || k.includes('auth-token') || k.includes('supabase'))) {
          authBackup[k] = localStorage.getItem(k) || '';
        }
      }
      localStorage.clear();
      Object.entries(authBackup).forEach(([k, v]) => localStorage.setItem(k, v));
      sessionStorage.clear();
    }

    // 2. Unregister TODOS os Service Workers ativos
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }

    // 3. Limpar todos os CacheStorage do Workbox / PWA
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  } catch (e) {
    console.warn('[chunkRecovery] Erro durante limpeza de caches/workers:', e);
  } finally {
    // 4. Recarrega substituindo a rota atual com parâmetro de versão para furar cache de CDN
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('_v', String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  }
}

/**
 * Trata o erro de chunk com proteção anti-loop (15 segundos).
 * Retorna true se iniciou a recuperação, ou false se está no período de resguardo.
 */
export async function handleChunkErrorWithAutoReload(error: unknown): Promise<boolean> {
  if (!isChunkLoadError(error)) return false;

  const key = 'chunk_auto_reload_ts';
  const last = Number(sessionStorage.getItem(key) || '0');
  const now = Date.now();

  if (now - last > 15_000) {
    sessionStorage.setItem(key, String(now));
    await forceCleanReload();
    return true;
  }

  return false;
}
