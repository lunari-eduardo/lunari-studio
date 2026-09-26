import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConversasTemplate {
  id: string;
  user_id: string;
  nome: string;
  conteudo: string;
  categoria?: string | null;
  variaveis?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateContext {
  contactName?: string | null;
  studioName?: string | null;
  pixKey?: string | null;
}

/**
 * Interpola tags dinâmicas no conteúdo do template.
 * Suporta: {nome}, {nome_completo}, {saudacao}, {estudio}, {empresa}, {pix}.
 */
export function renderTemplateText(templateText: string, context?: TemplateContext): string {
  if (!templateText) return '';

  const now = new Date();
  const hours = now.getHours();
  const saudacao = hours < 12 ? 'Bom dia' : hours < 18 ? 'Boa tarde' : 'Boa noite';

  const rawName = context?.contactName?.trim() || '';
  const firstName = rawName.split(' ')[0] || '';

  return templateText
    .replace(/\{nome\}/gi, firstName || 'Cliente')
    .replace(/\{nome_completo\}/gi, rawName || 'Cliente')
    .replace(/\{saudacao\}/gi, saudacao)
    .replace(/\{estudio\}/gi, context?.studioName || 'Estúdio')
    .replace(/\{empresa\}/gi, context?.studioName || 'Estúdio')
    .replace(/\{pix\}/gi, context?.pixKey || '');
}

export const DEFAULT_TEMPLATES_SUGGESTIONS = [
  {
    nome: 'Chave Pix / Pagamento',
    categoria: 'Financeiro',
    conteudo: 'Olá {nome}, tudo bem?\n\nSeguem os dados para pagamento via Pix:\nChave: {pix}\n\nAssim que realizar o pagamento, por favor envie o comprovante por aqui. Muito obrigado!',
  },
  {
    nome: 'Orientações Pré-Ensaio',
    categoria: 'Pré-Ensaio',
    conteudo: '{saudacao}, {nome}!\n\nPassando para lembrar das recomendações para o nosso ensaio fotográfico:\n- Chegue com 15 minutos de antecedência;\n- Traga as opções de looks combinadas;\n- Venha com maquiagem/cabelo já preparados conforme alinhado.\n\nQualquer dúvida estou à disposição!',
  },
  {
    nome: 'Fotos Prontas / Envio de Galeria',
    categoria: 'Pós-Venda',
    conteudo: 'Olá {nome}! Boas notícias! 🎉\n\nAs fotos do seu ensaio já estão disponíveis na sua galeria online exclusiva.\n\nAcesse o link para conferir e selecionar suas fotos favoritas. Espero que você ame o resultado tanto quanto eu!',
  },
];

export function useConversasTemplates() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversas_templates'],
    queryFn: async (): Promise<ConversasTemplate[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('conversas_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar templates:', error);
        throw error;
      }

      return (data || []) as ConversasTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({
      nome,
      conteudo,
      categoria,
      variaveis,
    }: {
      nome: string;
      conteudo: string;
      categoria?: string | null;
      variaveis?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('conversas_templates')
        .insert({
          user_id: user.id,
          nome: nome.trim(),
          conteudo: conteudo.trim(),
          categoria: categoria || null,
          variaveis: (variaveis || []) as any,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas_templates'] });
      toast.success('Modelo criado com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao criar modelo: ' + (err.message || 'Tente novamente'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      nome,
      conteudo,
      categoria,
      variaveis,
    }: {
      id: string;
      nome: string;
      conteudo: string;
      categoria?: string | null;
      variaveis?: string[];
    }) => {
      const { error } = await supabase
        .from('conversas_templates')
        .update({
          nome: nome.trim(),
          conteudo: conteudo.trim(),
          categoria: categoria || null,
          variaveis: (variaveis || []) as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas_templates'] });
      toast.success('Modelo atualizado!');
    },
    onError: (err: any) => {
      toast.error('Erro ao atualizar modelo: ' + (err.message || 'Tente novamente'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('conversas_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas_templates'] });
      toast.success('Modelo removido.');
    },
    onError: (err: any) => {
      toast.error('Erro ao remover modelo: ' + (err.message || 'Tente novamente'));
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const toInsert = DEFAULT_TEMPLATES_SUGGESTIONS.map(t => ({
        user_id: user.id,
        nome: t.nome,
        conteudo: t.conteudo,
        categoria: t.categoria || null,
        variaveis: [] as any,
      }));

      const { error } = await supabase.from('conversas_templates').insert(toInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas_templates'] });
      toast.success('Modelos sugeridos adicionados com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao carregar modelos padrão: ' + (err.message || 'Tente novamente'));
    },
  });

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    createTemplate: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateTemplate: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteTemplate: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    seedDefaultTemplates: seedDefaultsMutation.mutateAsync,
    isSeeding: seedDefaultsMutation.isPending,
  };
}
