import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ConversasSticker = {
  id: string;
  user_id: string;
  media_url: string;
  title: string | null;
  tags: string[] | null;
  is_favorite: boolean;
  created_at: string;
};

export function useConversasStickers() {
  const queryClient = useQueryClient();

  const {
    data: stickers = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['conversas_stickers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversas_stickers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ConversasSticker[];
    }
  });

  const saveSticker = useMutation({
    mutationFn: async ({ file, url, title }: { file?: File; url?: string; title?: string }) => {
      const edgeUrl = import.meta.env.VITE_EDGE_API_URL || '';
      
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) throw new Error('Usuário não autenticado');

      let body: any;
      let headers: HeadersInit = {
        Authorization: `Bearer ${token}`
      };

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        if (title) formData.append('title', title);
        body = formData;
      } else if (url) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ media_url: url, title });
      } else {
        throw new Error('Forneça um arquivo ou uma URL');
      }

      const res = await fetch(`${edgeUrl}/api/conversas/stickers`, {
        method: 'POST',
        headers,
        body,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Erro ao salvar figurinha');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas_stickers'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao salvar figurinha');
    }
  });

  const deleteSticker = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('conversas_stickers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['conversas_stickers'] });
      const previousStickers = queryClient.getQueryData<ConversasSticker[]>(['conversas_stickers']);
      
      if (previousStickers) {
        queryClient.setQueryData(
          ['conversas_stickers'],
          previousStickers.filter(s => s.id !== deletedId)
        );
      }
      return { previousStickers };
    },
    onError: (err: Error, newTodo, context) => {
      if (context?.previousStickers) {
        queryClient.setQueryData(['conversas_stickers'], context.previousStickers);
      }
      toast.error('Erro ao excluir figurinha');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas_stickers'] });
    }
  });

  const proxySticker = useMutation({
    mutationFn: async (url: string) => {
      const edgeUrl = import.meta.env.VITE_EDGE_API_URL || '';
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) throw new Error('Usuário não autenticado');

      const res = await fetch(`${edgeUrl}/api/conversas/stickers/proxy-send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      if (!res.ok) {
        throw new Error('Erro ao processar figurinha para envio');
      }

      const data = await res.json();
      return data.url as string;
    }
  });

  return {
    stickers,
    isLoading,
    error,
    saveSticker,
    deleteSticker,
    proxySticker
  };
}
