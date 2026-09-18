import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AudioSalvo = {
  id: string;
  user_id: string;
  nome: string;
  duration: number;       // segundos
  file_size: number | null;
  media_url: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
  uso_count: number;
};

// ─── List ────────────────────────────────────────────────────────────────────

export function useAudiosSalvos() {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ['audios_salvos'],
    queryFn: async (): Promise<AudioSalvo[]> => {
      const edgeUrl = import.meta.env.VITE_EDGE_API_URL || '';
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Não autenticado');

      const res = await fetch(`${edgeUrl}/api/conversas/audios_salvos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || 'Erro ao carregar áudios salvos');
      }
      const data = await res.json();
      return data.audios ?? [];
    },
  });

  // ─── Upload & Save ─────────────────────────────────────────────────────────

  const save = useMutation({
    mutationFn: async ({
      file,
      nome,
      duration,
    }: {
      file: File;
      nome?: string;
      duration: number;
    }): Promise<AudioSalvo> => {
      const edgeUrl = import.meta.env.VITE_EDGE_API_URL || '';
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Não autenticado');

      // Limites
      const MAX_DURATION = 600; // 10 min
      const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
      if (duration > MAX_DURATION) {
        throw new Error(`O áudio deve ter no máximo ${MAX_DURATION / 60} minutos`);
      }
      if (file.size > MAX_SIZE) {
        throw new Error('O áudio deve ter no máximo 10 MB');
      }

      const fd = new FormData();
      fd.append('file', file);
      if (nome) fd.append('nome', nome);
      fd.append('duration', String(duration));

      const res = await fetch(`${edgeUrl}/api/conversas/audios_salvos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || 'Erro ao salvar áudio');
      }
      return (await res.json()).audio as AudioSalvo;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['audios_salvos'] });
      toast.success('Áudio salvo na biblioteca');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ─── Update nome ──────────────────────────────────────────────────────────

  const rename = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }): Promise<AudioSalvo> => {
      const edgeUrl = import.meta.env.VITE_EDGE_API_URL || '';
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Não autenticado');

      const res = await fetch(`${edgeUrl}/api/conversas/audios_salvos/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || 'Erro ao renomear áudio');
      }
      return (await res.json()).audio as AudioSalvo;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['audios_salvos'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ─── Delete ───────────────────────────────────────────────────────────────

  const remove = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const edgeUrl = import.meta.env.VITE_EDGE_API_URL || '';
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Não autenticado');

      const res = await fetch(`${edgeUrl}/api/conversas/audios_salvos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || 'Erro ao excluir áudio');
      }
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['audios_salvos'] });
      const prev = queryClient.getQueryData<AudioSalvo[]>(['audios_salvos']);
      if (prev) {
        queryClient.setQueryData(
          ['audios_salvos'],
          prev.filter((a) => a.id !== deletedId),
        );
      }
      return { prev };
    },
    onError: (_err: Error, _id: string, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['audios_salvos'], ctx.prev);
      }
      toast.error('Erro ao excluir áudio');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['audios_salvos'] });
    },
  });

  return {
    audios: list.data ?? [],
    isLoading: list.isLoading,
    error: list.error,
    save,
    rename,
    remove,
  };
}
