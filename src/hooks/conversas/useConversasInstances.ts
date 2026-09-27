import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { InstanciaStatus } from '@/modules/conversas/types';

export function useConversasInstances(
  setInstancias: React.Dispatch<React.SetStateAction<Array<{
    id: string;
    instance_name: string;
    status: InstanciaStatus;
    phone?: string | null;
    qrcode_data?: string | null;
    qrcode_expires_at?: string | null;
  }>>>
) {
  const refreshQrCode = useCallback(async (instanceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada – faça login novamente.');
        return;
      }

      const workerUrl = import.meta.env.VITE_EDGE_API_URL;
      if (!workerUrl) {
        toast.error('VITE_EDGE_API_URL não configurada no ambiente.');
        return;
      }

      const response = await fetch(`${workerUrl}/api/conversas/instance/connect/${instanceId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error ?? 'Resposta inválida do Worker');
      }

      const qrcode = payload.data?.qrcode ?? {};
      setInstancias(prev =>
        prev.map(i =>
          i.id === instanceId
            ? {
                ...i,
                qrcode_data: qrcode.code ?? null,
                qrcode_expires_at: qrcode.expiresAt ?? null,
                status: 'connecting' as InstanciaStatus,
              }
            : i,
        ),
      );
    } catch (err: any) {
      toast.error('Não foi possível gerar um novo código. Verifique sua conexão e tente novamente.');
    }
  }, [setInstancias]);

  const createInstance = useCallback(async (instanceName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada – faça login novamente.');
        return;
      }

      const workerUrl = import.meta.env.VITE_EDGE_API_URL;
      if (!workerUrl) {
        toast.error('VITE_EDGE_API_URL não configurada no ambiente.');
        return;
      }

      const response = await fetch(`${workerUrl}/api/conversas/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ instanceName }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error ?? 'Resposta inválida do Worker');
      }

      const inserted = payload.data?.instance;
      if (inserted) {
        setInstancias(prev => {
          const exists = prev.some(i => i.id === inserted.id);
          if (exists) return prev.map(i => i.id === inserted.id ? { ...i, ...inserted } : i);
          return [...prev, inserted];
        });
      }
    } catch (err: any) {
      toast.error('Não foi possível gerar o código. Verifique sua conexão e tente novamente.');
      throw err;
    }
  }, [setInstancias]);

  const checkInstanceStatus = useCallback(async (instanceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const workerUrl = import.meta.env.VITE_EDGE_API_URL;
      if (!workerUrl) return;

      const response = await fetch(`${workerUrl}/api/conversas/instance/status/${instanceId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload.ok && payload.data?.status) {
          setInstancias(prev =>
            prev.map(i =>
              i.id === instanceId
                ? { ...i, status: payload.data.status, phone: payload.data.phone || i.phone }
                : i,
            ),
          );
        }
      }
    } catch (err) {
      console.error('[Conversas] checkInstanceStatus error:', err);
    }
  }, [setInstancias]);

  const disconnectInstance = useCallback(async (instanceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const workerUrl = import.meta.env.VITE_EDGE_API_URL;
      if (!workerUrl) return;

      await fetch(`${workerUrl}/api/conversas/instance/disconnect/${instanceId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    } catch (err) {
      console.error('[Conversas] disconnectInstance error:', err);
    }
  }, []);

  const deleteInstance = useCallback(async (instanceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada – faça login novamente.');
        return;
      }

      const workerUrl = import.meta.env.VITE_EDGE_API_URL;
      if (!workerUrl) {
        toast.error('VITE_EDGE_API_URL não configurada.');
        return;
      }

      const response = await fetch(`${workerUrl}/api/conversas/instance/delete/${instanceId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) throw new Error('Falha ao excluir na API externa');

      const { error } = await supabase.from('conversas_instancias').delete().eq('id', instanceId);
      if (error) throw error;

      setInstancias(prev => prev.filter(i => i.id !== instanceId));
      toast.success('Dispositivo desconectado e removido.');
    } catch (err: any) {
      toast.error('Erro ao excluir instância: ' + (err.message || 'Falha na operação'));
      throw err;
    }
  }, [setInstancias]);

  const syncHistoricalChats = useCallback(async (instanceId: string, options?: { showToast?: boolean }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return { synced: 0, total: 0 };

      const workerUrl = import.meta.env.VITE_EDGE_API_URL;
      if (!workerUrl) return { synced: 0, total: 0 };

      const response = await fetch(`${workerUrl}/api/conversas/instance/sync-chats/${instanceId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        throw new Error('Falha na sincronização.');
      }

      const payload = await response.json();
      if (options?.showToast) {
        if (payload.data?.synced > 0) {
          toast.success(`${payload.data.synced} de ${payload.data.total} contatos históricos sincronizados.`);
        } else {
          toast.info('Nenhuma nova conversa histórica encontrada no WhatsApp.');
        }
      }

      return {
        synced: payload.data?.synced ?? 0,
        total: payload.data?.total ?? 0
      };
    } catch (err: any) {
      if (options?.showToast) toast.error('Erro na sincronização histórica.');
      return { synced: 0, total: 0 };
    }
  }, []);

  return {
    refreshQrCode,
    createInstance,
    checkInstanceStatus,
    disconnectInstance,
    deleteInstance,
    syncHistoricalChats
  };
}
