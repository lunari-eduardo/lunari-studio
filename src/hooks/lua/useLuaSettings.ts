import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LuaDnaProfile {
  id: string;
  user_id: string;
  version: number;
  status: string;
  attributes: any;
  voice_summary: string | null;
  learning_metrics: any;
  derived_from: any;
  created_at: string;
  updated_at: string;
}

export interface LuaStudioKnowledge {
  id: string;
  user_id: string;
  hours: string | null;
  policies: string | null;
  services: string | null;
  pix_reference: string | null;
  websites: string | null;
  socials: string | null;
  notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export function useLuaSettings() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['lua_dna_profile_active'],
    queryFn: async (): Promise<LuaDnaProfile | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('lua_dna_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar DNA ativo:', error);
        return null;
      }

      return (data as LuaDnaProfile) || null;
    },
  });

  const knowledgeQuery = useQuery({
    queryKey: ['lua_studio_knowledge'],
    queryFn: async (): Promise<LuaStudioKnowledge | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('lua_studio_knowledge')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar conhecimento do estúdio:', error);
        return null;
      }

      return (data as LuaStudioKnowledge) || null;
    },
  });

  const upsertKnowledgeMutation = useMutation({
    mutationFn: async (payload: Partial<LuaStudioKnowledge>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Check if exists
      const { data: existing } = await supabase
        .from('lua_studio_knowledge')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('lua_studio_knowledge')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('lua_studio_knowledge')
          .insert({
            user_id: user.id,
            ...payload
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      // Avoid firing global invasive toasts, just invalidate
      queryClient.setQueryData(['lua_studio_knowledge'], data);
    },
    onError: (err: any) => {
      toast.error('Falha ao salvar conhecimento: ' + err.message);
    }
  });

  return {
    profile: profileQuery.data ?? null,
    isLoadingProfile: profileQuery.isLoading,
    knowledge: knowledgeQuery.data ?? null,
    isLoadingKnowledge: knowledgeQuery.isLoading,
    updateKnowledge: upsertKnowledgeMutation.mutateAsync,
    isUpdatingKnowledge: upsertKnowledgeMutation.isPending,
  };
}
