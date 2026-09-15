/**
 * useFormActions — ações de mutação para formulários do estúdio.
 * Encapsula as mutations existentes de useFormularios com feedback toast.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Formulario } from '@/types/formulario';

const QUERY_KEY = 'formularios';

/**
 * Arquiva um formulário (muda status para 'arquivado').
 * Não exclui dados — reversível via update de volta para 'rascunho'/'publicado'.
 */
async function archiveFormulario(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('formularios')
    .update({ status: 'arquivado' })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Duplica um formulário existente em rascunho (sem token público, sem respostas).
 */
async function duplicateFormulario(formulario: Formulario, userId: string): Promise<void> {
  const { error } = await supabase.from('formularios').insert({
    user_id: userId,
    titulo: `${formulario.titulo} (cópia)`,
    descricao: formulario.descricao,
    campos: formulario.campos as unknown as never,
    cliente_id: formulario.cliente_id,
    session_id: formulario.session_id,
    status: 'rascunho',
    status_envio: 'nao_enviado',
  });

  if (error) throw error;
}

/**
 * Exclui um formulário definitivamente (incluindo respostas).
 */
async function deleteFormulario(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('formularios')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export function useFormActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      await archiveFormulario(id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['formularios-cliente'] });
      queryClient.invalidateQueries({ queryKey: ['formularios-session'] });
      toast({ title: 'Formulário arquivado.' });
    },
    onError: (error) => {
      console.error('Erro ao arquivar formulário:', error);
      toast({
        title: 'Erro ao arquivar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (formulario: Formulario) => {
      if (!user) throw new Error('Usuário não autenticado');
      await duplicateFormulario(formulario, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['formularios-cliente'] });
      queryClient.invalidateQueries({ queryKey: ['formularios-session'] });
      toast({ title: 'Formulário duplicado.' });
    },
    onError: (error) => {
      console.error('Erro ao duplicar formulário:', error);
      toast({
        title: 'Erro ao duplicar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      await deleteFormulario(id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['formularios-cliente'] });
      queryClient.invalidateQueries({ queryKey: ['formularios-session'] });
      toast({ title: 'Formulário excluído.' });
    },
    onError: (error) => {
      console.error('Erro ao excluir formulário:', error);
      toast({
        title: 'Erro ao excluir',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return {
    archiveFormulario: archiveMutation.mutateAsync,
    duplicateFormulario: duplicateMutation.mutateAsync,
    deleteFormulario: deleteMutation.mutateAsync,
    isArchiving: archiveMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
