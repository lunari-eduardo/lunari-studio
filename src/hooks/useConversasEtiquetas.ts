import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import type { Etiqueta } from '@/modules/conversas/types';

export function useConversasEtiquetas() {
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: etiquetas = [], isLoading } = useQuery({
    queryKey: ['conversas_etiquetas', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data, error } = await supabase
        .from('conversas_etiquetas' as any)
        .select('*')
        .eq('user_id', profile.user_id)
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as unknown as Etiqueta[];
    },
    enabled: !!profile?.user_id,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const createMutation = useMutation({
    mutationFn: async (etiqueta: Omit<Etiqueta, 'id' | 'user_id'>) => {
      if (!profile?.user_id) throw new Error('No user profile');
      const { data, error } = await supabase
        .from('conversas_etiquetas' as any)
        .insert([{ ...etiqueta, user_id: profile.user_id }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Jo existe uma etiqueta com este nome.');
        }
        throw error;
      }
      return data as unknown as Etiqueta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas_etiquetas'] });
    },
    onError: (err: any) => {
      if (err.message === 'Jo existe uma etiqueta com este nome.') {
        toast({ title: 'Aviso', description: err.message });
      } else {
        toast({ title: 'Erro', description: 'Nuo foi possível criar a etiqueta.', variant: 'destructive' });
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Omit<Etiqueta, 'id' | 'user_id'>> }) => {
      const { data, error } = await supabase
        .from('conversas_etiquetas' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Etiqueta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas_etiquetas'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: 'Nuo foi possível atualizar a etiqueta.', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('conversas_etiquetas' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas_etiquetas'] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: 'Nuo foi possível excluir a etiqueta.', variant: 'destructive' });
    }
  });

  return {
    etiquetas,
    isLoading,
    createEtiqueta: createMutation.mutateAsync,
    updateEtiqueta: async (id: string, updates: Partial<Omit<Etiqueta, 'id' | 'user_id'>>) => updateMutation.mutateAsync({ id, updates }),
    deleteEtiqueta: deleteMutation.mutateAsync,
  };
}
