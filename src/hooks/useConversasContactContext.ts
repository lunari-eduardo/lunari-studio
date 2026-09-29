import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Chat, EnrichedChat } from '@/modules/conversas/types';
import { toast } from 'sonner';
import { useChatStateResolver, resolveTemplateContext, type ChatContactState, type ChatStateData } from './useChatStateResolver';

export interface ContactIdentity {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  firstContactAt: Date | null;
  source: 'whatsapp' | 'instagram' | 'manual';
}

export interface UnifiedContactContext {
  state: ChatContactState;
  contact: ContactIdentity;
  client: any | null;
  lead: any | null;
  nextSession: any | null;
  lastSession: any | null;
  activeWorkflow: any | null;
  gallery: any | null;
  metrics: {
    totalSessions: number;
    lifetimeValue: number;
    clientSince: Date | null;
    recurrence: "low" | "medium" | "high";
  };
  templateContext: {
    category: string | null;
    stage: string | null;
  };
  isLoading: boolean;
  error: Error | null;
}

// Interfaces internas (podem ser refinadas no futuro)
export interface ContextCliente {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  observacoes: string | null;
  created_at: string | null;
}

export interface ContextSessao {
  id: string;
  session_id: string | null;
  categoria: string;
  pacote: string | null;
  data_sessao: string;
  hora_sessao: string;
  status: string | null;
  valor_total: number | null;
  valor_pago: number | null;
  descricao: string | null;
  detalhes: string | null;
  galeria_id: string | null;
  galerias: { id: string; status: string } | null;
}

export interface ContextLead {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  status: string;
  origem: string | null;
  valor_estimado: number | null;
  needs_follow_up: boolean | null;
  created_at: string;
}

export interface ContextTask {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

export interface ContextOrcamento {
  id: string;
  type: string;
  status: string;
  date: string | null;
  time: string | null;
  title: string | null;
}

export interface ContextCobranca {
  id: string;
  status: string;
  valor: number | null;
  created_at: string | null;
  descricao: string | null;
}

export function useConversasContactContext(chat: Chat | EnrichedChat | null) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [internalError, setInternalError] = useState<Error | null>(null);

  const chatId = chat?.id;
  const contatoId = chat?.contato_id;
  const rawPhone = chat?.contato_phone_normalized || '';

  // 1. Carregar informaÃ§Ãµes do Contato de Conversas
  const { data: contatoInfo, isLoading: isLoadingContato } = useQuery({
    queryKey: ['conversas-contato-info', contatoId],
    queryFn: async () => {
      if (!contatoId) return null;
      const { data, error } = await supabase
        .from('conversas_contatos')
        .select('*')
        .eq('id', contatoId)
        .maybeSingle();

      if (error) {
        console.warn('[useConversasContactContext] Erro ao buscar contato:', error);
        return null;
      }
      return data;
    },
    enabled: !!contatoId,
    staleTime: 1000 * 60 * 2,
  });

  const effectiveClienteId = chat?.cliente_id || contatoInfo?.cliente_id;
  const effectiveLeadId = chat?.lead_id || contatoInfo?.lead_id;

  // 2. Carregar dados do Cliente (se houver clienteId vinculado ou por telefone)
  const { data: cliente, isLoading: isLoadingCliente, error: errorCliente } = useQuery({
    queryKey: ['conversas-context-cliente', effectiveClienteId, rawPhone, userId],
    queryFn: async () => {
      if (!userId) return null;

      // Se temos o ID direto
      if (effectiveClienteId) {
        const { data, error } = await supabase
          .from('clientes')
          .select('id, nome, email, telefone, whatsapp, observacoes, created_at')
          .eq('id', effectiveClienteId)
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        return data as unknown as ContextCliente;
      }

      // Tentativa de correspondÃªncia determinÃ­stica por telefone normalizado
      if (rawPhone && rawPhone.length >= 10) {
        const cleanPhone = rawPhone.replace(/\D/g, '');
        const phoneWithoutDdi = cleanPhone.startsWith('55') && cleanPhone.length >= 12
          ? cleanPhone.slice(2)
          : cleanPhone;

        const { data: exactData, count: exactCount } = await supabase
          .from('clientes')
          .select('id, nome, email, telefone, whatsapp, observacoes, created_at', { count: 'exact' })
          .eq('user_id', userId)
          .or(`telefone.eq.${phoneWithoutDdi},whatsapp.eq.${phoneWithoutDdi}`)
          .limit(2);

        if (exactCount === 1 && exactData?.[0]) {
          return exactData[0] as unknown as ContextCliente;
        }

        if (!exactData || exactData.length === 0) {
          const suffix = cleanPhone.slice(-8);
          const { data: fallbackData, count: fallbackCount } = await supabase
            .from('clientes')
            .select('id, nome, email, telefone, whatsapp, observacoes, created_at', { count: 'exact' })
            .eq('user_id', userId)
            .or(`telefone.ilike.%${suffix}%,whatsapp.ilike.%${suffix}%`)
            .limit(2);

          if (fallbackCount === 1 && fallbackData?.[0]) {
            return fallbackData[0] as unknown as ContextCliente;
          }
        }
      }
      return null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // 3. Carregar SessÃµes de forma direta e rÃ¡pida (Query Split)
  const { data: sessoesDiretas, isLoading: isLoadingSessoes, error: errorSessoes } = useQuery({
    queryKey: ['conversas-sessoes-diretas', cliente?.id, userId],
    queryFn: async () => {
      if (!cliente?.id || !userId) return [];
      
      const { data, error } = await supabase
        .from('clientes_sessoes')
        .select('id, session_id, categoria, pacote, data_sessao, hora_sessao, status, valor_total, valor_pago, descricao, detalhes, galeria_id, galerias(id, status)')
        .eq('cliente_id', cliente.id)
        .order('data_sessao', { ascending: false })
        .limit(10); // Busca atÃ© 10 para o metrics e o next/last session

      if (error) {
        console.error('[useConversasContactContext] Erro CrÃ­tico ao buscar sessÃµes:', error);
        throw error;
      }
      return data as unknown as ContextSessao[];
    },
    enabled: !!cliente?.id && !!userId,
    staleTime: 1000 * 60 * 2,
  });

  // 4. Carregar Contexto Completo via RPC (Background)
  const { data: rpcContext } = useQuery({
    queryKey: ['conversas-context-rpc', cliente?.id, userId],
    queryFn: async () => {
      if (!cliente?.id || !userId) return null;
      const { data, error } = await (supabase as any).rpc('get_conversas_cliente_context', {
        p_cliente_id: cliente.id,
        p_user_id: userId
      });

      if (error) {
        console.warn('[useConversasContactContext] Erro no RPC:', error);
        return null;
      }
      return data as any;
    },
    enabled: !!cliente?.id && !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // 5. Carregar Lead / Oportunidade
  const { data: lead, isLoading: isLoadingLead, error: errorLead } = useQuery({
    queryKey: ['conversas-context-lead', effectiveLeadId, rawPhone, userId],
    queryFn: async () => {
      if (!userId) return null;

      if (effectiveLeadId) {
        const { data, error } = await (supabase as any)
          .from('leads')
          .select('id, nome, email, telefone, status, origem, valor_estimado, needs_follow_up, created_at')
          .eq('id', effectiveLeadId)
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        return data as unknown as ContextLead;
      }

      if (rawPhone && rawPhone.length >= 10) {
        const cleanPhone = rawPhone.replace(/\D/g, '');
        const phoneWithoutDdi = cleanPhone.startsWith('55') && cleanPhone.length >= 12
          ? cleanPhone.slice(2)
          : cleanPhone;

        const { data: exactData, count: exactCount } = await (supabase as any)
          .from('leads')
          .select('id, nome, email, telefone, status, origem, valor_estimado, needs_follow_up, created_at', { count: 'exact' })
          .eq('user_id', userId)
          .or(`telefone.eq.${phoneWithoutDdi},whatsapp.eq.${phoneWithoutDdi}`)
          .limit(2);

        if (exactCount === 1 && exactData?.[0]) {
          return exactData[0] as unknown as ContextLead;
        }

        if (!exactData || exactData.length === 0) {
          const suffix = cleanPhone.slice(-8);
          const { data: fallbackData, count: fallbackCount } = await (supabase as any)
            .from('leads')
            .select('id, nome, email, telefone, status, origem, valor_estimado, needs_follow_up, created_at', { count: 'exact' })
            .eq('user_id', userId)
            .or(`telefone.ilike.%${suffix}%,whatsapp.ilike.%${suffix}%`)
            .limit(2);

          if (fallbackCount === 1 && fallbackData?.[0]) {
            return fallbackData[0] as unknown as ContextLead;
          }
        }
      }

      return null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // CÃ¡lculo do contexto
  const sessoes = sessoesDiretas || [];
  const validSessions = sessoes.filter(s => !!s.data_sessao);
  
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const futureSessions = validSessions
    .filter(s => s.data_sessao.slice(0, 10) >= todayIso)
    .sort((a, b) => a.data_sessao.slice(0, 10).localeCompare(b.data_sessao.slice(0, 10)));

  const pastSessions = validSessions
    .filter(s => s.data_sessao.slice(0, 10) < todayIso)
    .sort((a, b) => b.data_sessao.slice(0, 10).localeCompare(a.data_sessao.slice(0, 10)));

  const nextSession = futureSessions[0] || null;
  const lastSession = pastSessions[0] || null;
  
  // Pegar galeria ativa 
  const gallery = sessoes.find(s => s.galerias != null)?.galerias || null;
  
  // Active workflow (sessÃ£o que estÃ¡ em ediÃ§Ã£o/seleÃ§Ã£o)
  const activeWorkflow = sessoes.find(s => {
    const status = (s.status || '').toLowerCase();
    return ['fotografado', 'edicao', 'selecao', 'diagramacao', 'aprovacao'].includes(status);
  }) || null;

  // CÃ¡lculo de mÃ©tricas
  const totalSessions = validSessions.length;
  const lifetimeValue = validSessions.reduce((acc, s) => acc + (s.valor_total || 0), 0);
  const clientSinceStr = validSessions.length > 0 ? validSessions[validSessions.length - 1].data_sessao : cliente?.created_at;
  const clientSince = clientSinceStr ? new Date(clientSinceStr) : null;
  const recurrence = totalSessions > 3 ? "high" : totalSessions > 1 ? "medium" : "low";

  // Identidade de contato
  const contact: ContactIdentity = {
    id: contatoId || chat?.id || '',
    name: chat?.contato_nome || contatoInfo?.nome || cliente?.nome || lead?.nome || 'Contato desconhecido',
    phone: rawPhone || cliente?.telefone || lead?.telefone || '',
    firstContactAt: contatoInfo?.created_at ? new Date(contatoInfo.created_at) : null,
    source: 'whatsapp', // SimplificaÃ§Ã£o base
  };

  const chatState = useChatStateResolver({
    client: cliente,
    lead: lead,
    sessions: sessoes,
    gallery: gallery
  });

  const templateContext = resolveTemplateContext(chatState, sessoes);
  const isGlobalLoading = isLoadingContato || isLoadingCliente || isLoadingSessoes || isLoadingLead;
  const globalError = errorCliente || errorSessoes || errorLead || internalError || null;

  const unifiedContext: UnifiedContactContext = {
    state: chatState,
    contact,
    client: cliente,
    lead,
    nextSession,
    lastSession,
    activeWorkflow,
    gallery,
    metrics: {
      totalSessions,
      lifetimeValue,
      clientSince,
      recurrence
    },
    templateContext,
    isLoading: isGlobalLoading,
    error: globalError
  };

  // Mutations de VinculaÃ§Ã£o
  const linkClienteMutation = useMutation({
    mutationFn: async (clienteIdToLink: string) => {
      if (!chatId || !userId) throw new Error('Chat nÃ£o selecionado');

      const { error: chatError } = await supabase
        .from('conversas_chats')
        .update({ cliente_id: clienteIdToLink, updated_at: new Date().toISOString() })
        .eq('id', chatId);

      if (chatError) throw chatError;

      if (contatoId) {
        await supabase
          .from('conversas_contatos')
          .update({ cliente_id: clienteIdToLink, tipo: 'cliente', updated_at: new Date().toISOString() })
          .eq('id', contatoId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas-context-cliente'] });
      queryClient.invalidateQueries({ queryKey: ['conversas-sessoes-diretas'] });
    },
    onError: (err) => {
      console.error('[linkClienteMutation] Erro:', err);
      toast.error('NÃ£o foi possÃ­vel vincular o cliente.');
    },
  });

  const linkLeadMutation = useMutation({
    mutationFn: async (leadIdToLink: string) => {
      if (!chatId || !userId) throw new Error('Chat nÃ£o selecionado');

      const { error: chatError } = await supabase
        .from('conversas_chats')
        .update({ lead_id: leadIdToLink, updated_at: new Date().toISOString() })
        .eq('id', chatId);

      if (chatError) throw chatError;

      if (contatoId) {
        await supabase
          .from('conversas_contatos')
          .update({ lead_id: leadIdToLink, tipo: 'lead', updated_at: new Date().toISOString() })
          .eq('id', contatoId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas-context-lead'] });
    },
    onError: (err) => {
      console.error('[linkLeadMutation] Erro:', err);
      toast.error('NÃ£o foi possÃ­vel vincular o lead.');
    },
  });

  const linkAmbosMutation = useMutation({
    mutationFn: async ({ leadId, clienteId }: { leadId?: string; clienteId?: string }) => {
      if (!chatId || !userId) throw new Error('Chat nÃ£o selecionado');

      const chatUpdates: { cliente_id?: string; lead_id?: string; updated_at: string } = {
        updated_at: new Date().toISOString(),
      };
      if (clienteId) chatUpdates.cliente_id = clienteId;
      if (leadId) chatUpdates.lead_id = leadId;

      const { error: chatError } = await (supabase
        .from('conversas_chats')
        .update as any)(chatUpdates)
        .eq('id', chatId);

      if (chatError) throw chatError;

      if (contatoId) {
        const contatoUpdates: { cliente_id?: string; lead_id?: string; tipo?: string; updated_at: string } = {
          updated_at: new Date().toISOString(),
        };
        if (clienteId) {
          contatoUpdates.cliente_id = clienteId;
          contatoUpdates.tipo = 'cliente';
        }
        if (leadId) {
          contatoUpdates.lead_id = leadId;
          if (!clienteId) contatoUpdates.tipo = 'lead';
        }
        await (supabase
          .from('conversas_contatos')
          .update as any)(contatoUpdates)
          .eq('id', contatoId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas-context-cliente'] });
      queryClient.invalidateQueries({ queryKey: ['conversas-context-lead'] });
      queryClient.invalidateQueries({ queryKey: ['conversas-sessoes-diretas'] });
    },
    onError: (err) => {
      console.error('[linkAmbosMutation] Erro:', err);
      toast.error('NÃ£o foi possÃ­vel vincular o lead/cliente Ã  conversa.');
    },
  });

  const createQuickTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!cliente?.id || !userId) throw new Error('Cliente nÃ£o identificado');
      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: title.trim(),
          status: 'todo',
          priority: 'medium',
          type: 'simple',
          source: 'manual',
          related_cliente_id: cliente.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas-context-rpc'] });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas-context-rpc'] });
    },
  });

  return {
    unifiedContext,
    
    // Mapeamento legado que continua necessÃ¡rio atÃ© as modais migrarem
    cliente,
    lead,
    sessoes,
    tarefas: (rpcContext?.tarefas || []) as ContextTask[],
    orcamentos: (rpcContext?.orcamentos || []) as ContextOrcamento[],
    cobrancas: (rpcContext?.cobrancas || []) as ContextCobranca[],
    leadsPerdidos: (rpcContext?.leads_perdidos || []),
    isLoading: isGlobalLoading,
    
    isLinkedToCliente: !!cliente?.id,
    isLinkedToLead: !!lead?.id,
    vincularCliente: linkClienteMutation.mutateAsync,
    vincularLead: linkLeadMutation.mutateAsync,
    vincularAmbos: linkAmbosMutation.mutateAsync,
    criarTarefaRapida: createQuickTaskMutation.mutateAsync,
    concluirTarefa: completeTaskMutation.mutateAsync,
  };
}



