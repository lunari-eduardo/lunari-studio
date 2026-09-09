import { useEffect, useState, useCallback, useRef } from 'react';
import { BUILD_COMMIT } from '@/version';
import { forceCleanReload } from '@/lib/chunkRecovery';
import { toast } from 'sonner';

/**
 * Hook para verificar se há nova versão do app no servidor.
 * Compara BUILD_COMMIT local com version.json remoto em intervalos regulares
 * e quando o usuário retorna à aba (visibilitychange / focus).
 */
export function useVersionCheck() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const hasNotifiedRef = useRef(false);

  const checkVersion = useCallback(async () => {
    // Ignora checagem em ambiente de desenvolvimento local
    if (BUILD_COMMIT === 'local-dev') return;

    try {
      setIsChecking(true);
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!response.ok) return;

      const remote = await response.json();
      const remoteCommit = remote?.commit;

      if (remoteCommit && remoteCommit !== 'local-dev' && remoteCommit !== BUILD_COMMIT) {
        console.warn('⚠️ [Version Check] Nova versão detectada:', remoteCommit, 'Atual:', BUILD_COMMIT);
        setNeedsUpdate(true);

        if (!hasNotifiedRef.current) {
          hasNotifiedRef.current = true;
          toast('Nova versão do Lunari disponível!', {
            id: 'lunari-version-update',
            description: 'Uma nova versão foi publicada. Clique em Atualizar para carregar os recursos mais recentes.',
            duration: 30000,
            action: {
              label: 'Atualizar agora',
              onClick: () => {
                forceCleanReload(false);
              },
            },
          });
        }
      }
    } catch (error) {
      console.debug('[Version Check] Verificação silenciosa de versão:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // 1. Checagem inicial após montagem
    checkVersion();

    // 2. Checagem a cada 5 minutos
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    // 3. Checagem imediata quando o usuário volta para a aba
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [checkVersion]);

  return {
    needsUpdate,
    isChecking,
    checkVersion,
  };
}

