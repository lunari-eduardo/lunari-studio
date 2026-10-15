/**
 * `setInterval` que só dispara com a aba visível e faz catch-up ao voltar.
 * Retorna a função de cleanup. Evita requests/logs de polling em abas ocultas
 * (cada aba oculta continuava consultando o Supabase em background).
 */
export function visibleInterval(fn: () => void, ms: number): () => void {
  let last = Date.now();
  const run = () => {
    last = Date.now();
    fn();
  };
  const id = setInterval(() => {
    if (document.visibilityState === 'visible') run();
  }, ms);
  const onVisible = () => {
    if (document.visibilityState === 'visible' && Date.now() - last >= ms) run();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
