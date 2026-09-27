import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ClienteFamilia } from '@/types/cliente-supabase';

export function useFamiliaMutations(
  setFamilia: React.Dispatch<React.SetStateAction<ClienteFamilia[]>>
) {
  const adicionarFamilia = useCallback(async (clienteId: string, membro: Omit<ClienteFamilia, 'id' | 'cliente_id' | 'user_id' | 'created_at'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('clientes_familia')
        .insert({
          ...membro,
          cliente_id: clienteId,
          user_id: session.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao adicionar membro da família:', error);
      toast.error('Erro ao adicionar membro da família');
      throw error;
    }
  }, []);

  const atualizarFamilia = useCallback(async (id: string, dados: Partial<ClienteFamilia>) => {
    try {
      setFamilia(prev => prev.map(f => (f.id === id ? { ...f, ...dados } as ClienteFamilia : f)));

      const { error } = await supabase
        .from('clientes_familia')
        .update(dados)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar membro da família:', error);
      toast.error('Erro ao atualizar membro da família');
      throw error;
    }
  }, [setFamilia]);

  const removerFamilia = useCallback(async (id: string) => {
    let snapshot: ClienteFamilia[] = [];
    try {
      setFamilia(prev => {
        snapshot = prev;
        return prev.filter(f => f.id !== id);
      });

      const { error } = await supabase
        .from('clientes_familia')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      setFamilia(snapshot);
      console.error('Erro ao remover membro da família:', error);
      toast.error('Erro ao remover membro da família');
      throw error;
    }
  }, [setFamilia]);

  return {
    adicionarFamilia,
    atualizarFamilia,
    removerFamilia
  };
}
