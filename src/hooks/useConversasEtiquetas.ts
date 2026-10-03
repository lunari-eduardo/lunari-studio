import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import type { Etiqueta } from '@/modules/conversas/types';

export function useConversasEtiquetas() {
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEtiquetas = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversas_etiquetas' as any)
        .select('*')
        .eq('user_id', profile.id)
        .order('nome', { ascending: true });

      if (error) throw error;
      setEtiquetas(data as unknown as unknown as Etiqueta[]);
    } catch (err: any) {
      console.error('Erro ao buscar etiquetas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchEtiquetas();
  }, [fetchEtiquetas]);

  const createEtiqueta = async (etiqueta: Omit<Etiqueta, 'id' | 'user_id'>) => {
    if (!profile?.id) return null;
    try {
      const { data, error } = await supabase
        .from('conversas_etiquetas' as any)
        .insert([{ ...etiqueta, user_id: profile.id }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Aviso', description: 'Já existe uma etiqueta com este nome.' });
          return null;
        }
        throw error;
      }
      
      setEtiquetas(prev => [...prev, data as unknown as Etiqueta].sort((a, b) => a.nome.localeCompare(b.nome)));
      return data as unknown as unknown as Etiqueta;
    } catch (err: any) {
      console.error('Erro ao criar etiqueta:', err);
      toast({ title: 'Erro', description: 'Não foi possível criar a etiqueta.', variant: 'destructive' });
      return null;
    }
  };

  const updateEtiqueta = async (id: string, updates: Partial<Omit<Etiqueta, 'id' | 'user_id'>>) => {
    try {
      const { data, error } = await supabase
        .from('conversas_etiquetas' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setEtiquetas(prev => prev.map(e => (e.id === id ? (data as unknown as Etiqueta) : e)).sort((a, b) => a.nome.localeCompare(b.nome)));
      return data as unknown as unknown as Etiqueta;
    } catch (err: any) {
      console.error('Erro ao atualizar etiqueta:', err);
      toast({ title: 'Erro', description: 'Não foi possível atualizar a etiqueta.', variant: 'destructive' });
      return null;
    }
  };

  const deleteEtiqueta = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversas_etiquetas' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setEtiquetas(prev => prev.filter(e => e.id !== id));
      
      // We should ideally also remove it from chats, but a cascade delete or a cron job is better,
      // or just filtering invalid ids in the frontend. 
      // For now, we will handle missing tags gracefully.
      return true;
    } catch (err: any) {
      console.error('Erro ao excluir etiqueta:', err);
      toast({ title: 'Erro', description: 'Não foi possível excluir a etiqueta.', variant: 'destructive' });
      return false;
    }
  };

  return {
    etiquetas,
    isLoading,
    createEtiqueta,
    updateEtiqueta,
    deleteEtiqueta,
    refreshEtiquetas: fetchEtiquetas,
  };
}
