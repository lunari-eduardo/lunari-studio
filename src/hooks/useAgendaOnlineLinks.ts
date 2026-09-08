import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AgendaOnlineLink, NewAgendaOnlineLink } from '@/types/agendaOnline';
import { toast } from 'sonner';

export function useAgendaOnlineLinks() {
  const queryClient = useQueryClient();
  const queryKey = ['agenda_online_links'];

  const { data: links = [], isLoading, error } = useQuery<AgendaOnlineLink[]>({
    queryKey,
    queryFn: async () => {
      const { data: userRes, error: userError } = await supabase.auth.getUser();
      if (userError || !userRes.user) return [];

      const { data, error } = await supabase
        .from('agenda_online_links')
        .select('*')
        .eq('user_id', userRes.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar links de agendamento online:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        ...row,
        pacotes_permitidos: Array.isArray(row.pacotes_permitidos) ? row.pacotes_permitidos : [],
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: NewAgendaOnlineLink) => {
      const { data: userRes, error: userError } = await supabase.auth.getUser();
      if (userError || !userRes.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('agenda_online_links')
        .insert({
          ...payload,
          user_id: userRes.user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar link de agendamento online:', error);
        if (error.code === '23505') {
          throw new Error('Este link (slug) já está em uso. Escolha outro.');
        }
        throw new Error(error.message || 'Falha ao salvar link');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Link de agendamento criado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao criar link');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NewAgendaOnlineLink> }) => {
      const { data: userRes, error: userError } = await supabase.auth.getUser();
      if (userError || !userRes.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('agenda_online_links')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userRes.user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar link de agendamento online:', error);
        if (error.code === '23505') {
          throw new Error('Este link (slug) já está em uso por outro link.');
        }
        throw new Error(error.message || 'Falha ao atualizar link');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Link atualizado com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar link');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data: userRes, error: userError } = await supabase.auth.getUser();
      if (userError || !userRes.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('agenda_online_links')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userRes.user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(variables.is_active ? 'Link ativado!' : 'Link desativado!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao alterar status do link');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: userRes, error: userError } = await supabase.auth.getUser();
      if (userError || !userRes.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('agenda_online_links')
        .delete()
        .eq('id', id)
        .eq('user_id', userRes.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Link removido com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao remover link');
    },
  });

  return {
    links,
    isLoading,
    error,
    createLink: createMutation.mutateAsync,
    updateLink: (id: string, updates: Partial<NewAgendaOnlineLink>) =>
      updateMutation.mutateAsync({ id, updates }),
    toggleLinkActive: (id: string, is_active: boolean) =>
      toggleActiveMutation.mutateAsync({ id, is_active }),
    deleteLink: deleteMutation.mutateAsync,
    isSubmitting:
      createMutation.isPending ||
      updateMutation.isPending ||
      toggleActiveMutation.isPending ||
      deleteMutation.isPending,
  };
}
