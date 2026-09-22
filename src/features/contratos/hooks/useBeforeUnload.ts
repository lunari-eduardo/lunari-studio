import { useEffect } from 'react';

/**
 * Hook para avisar o usuário se ele tentar fechar ou recarregar a aba
 * enquanto houver alterações não salvas (dirty state).
 */
export function useBeforeUnload(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);
}
