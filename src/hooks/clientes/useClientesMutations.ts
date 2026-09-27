import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ClienteSupabase } from '@/types/cliente-supabase';

export function useClientesMutations(
  setClientes: React.Dispatch<React.SetStateAction<ClienteSupabase[]>>
) {
  const adicionarCliente = useCallback(async (cliente: Omit<ClienteSupabase, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          ...cliente,
          user_id: session.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error);
      toast.error('Erro ao adicionar cliente');
      throw error;
    }
  }, []);

  const atualizarCliente = useCallback(async (id: string, dados: Partial<ClienteSupabase>) => {
    try {
      if (!dados || Object.keys(dados).length === 0) return;

      // Optimistic update
      setClientes(prev => prev.map(c =>
        c.id === id ? { ...c, ...dados, updated_at: new Date().toISOString() } as ClienteSupabase : c
      ));

      const { error } = await supabase
        .from('clientes')
        .update(dados)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente');
      throw error;
    }
  }, [setClientes]);

  const removerCliente = useCallback(async (id: string) => {
    let snapshot: ClienteSupabase[] = [];
    try {
      setClientes(prev => {
        snapshot = prev;
        return prev.filter(c => c.id !== id);
      });

      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Cliente removido com sucesso');
    } catch (error) {
      setClientes(snapshot);
      console.error('Erro ao remover cliente:', error);
      toast.error('Erro ao remover cliente');
      throw error;
    }
  }, [setClientes]);

  const verificarClienteTemDados = useCallback(async (id: string): Promise<{
    temDados: boolean;
    sessoes: number;
    pagamentos: number;
  }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Usuário não autenticado');
      const user = session.user;

      const { count: sessoesCount, error: sessoesError } = await supabase
        .from('clientes_sessoes')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', id)
        .eq('user_id', user.id);

      if (sessoesError) throw sessoesError;

      const { count: transacoesCount, error: transacoesError } = await supabase
        .from('clientes_transacoes')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', id)
        .eq('user_id', user.id);

      if (transacoesError) throw transacoesError;

      const sessoes = sessoesCount || 0;
      const pagamentos = transacoesCount || 0;

      return {
        temDados: sessoes > 0 || pagamentos > 0,
        sessoes,
        pagamentos
      };
    } catch (error) {
      console.error('Erro ao verificar dados do cliente:', error);
      return { temDados: false, sessoes: 0, pagamentos: 0 };
    }
  }, []);

  return {
    adicionarCliente,
    atualizarCliente,
    removerCliente,
    verificarClienteTemDados
  };
}
