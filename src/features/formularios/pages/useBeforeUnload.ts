/**
 * useBeforeUnload — proteção contra perda de dados ao fechar/refresh.
 *
 * Quando `when` for true, registra `beforeunload` no window para mostrar o
 * alerta nativo do navegador pedindo confirmação para sair. O alerta do
 * navegador é a única proteção confiável cross-browser (regras 20 e 33
 * do brief).
 *
 * Observações:
 *  - Navegação interna do React Router não dispara `beforeunload`. Para
 *    interceptar navegação SPA, use `useBlocker` (react-router v6.7+).
 *    Implementação extra adicionada em `useRouteLeaveGuard`.
 *  - O navegador pode ignorar o alerta se o usuário nunca interagiu com
 *    a página; é o comportamento esperado.
 */
import { useEffect } from 'react';

export function useBeforeUnload(when: boolean): void {
  useEffect(() => {
    if (!when) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requer returnValue setado
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);
}
