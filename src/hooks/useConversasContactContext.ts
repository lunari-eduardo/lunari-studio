/**
 * Hook para carregar o contexto operacional e comercial do contato
 * vinculado à conversa atual (Cliente, Lead, Sessões, Tarefas e Ações Rápidas).
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Chat, EnrichedChat } from '@/modules/conversas/types';
import { toast } from 'sonner';

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
  status_workflow: string | null;
  valor_total: number | null;
  valor_pago: number | null;
  local_ensaio: string | null;
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

export interface ContextLeadPerdido {
  id: string;
  nome: string;
  status: string;
  perdido_em: string | null;
  motivo_perda: string | null;
}

export function useConversasContactContext(chat: Chat | EnrichedChat | null) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const chatId = chat?.id;
  const contatoId = chat?.contato_id;
  const rawPhone = chat?.contato_phone_normalized || '';

  // 1. Carregar informações do Contato de Conversas
  const { data: contatoInfo } = useQuery({
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
  const { data: cliente, isLoading: isLoadingCliente } = useQuery({
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
        if (error) return null;
        return data as unknown as ContextCliente;
      }

      // Tentativa de correspondência determinística por telefone normalizado
      // phone_normalized de conversas vem com DDI (ex: 5511987654321)
      // clientes.telefone é armazenado sem DDI (ex: 11987654321)
      if (rawPhone && rawPhone.length >= 10) {
        const cleanPhone = rawPhone.replace(/\D/g, '');
        const phoneWithoutDdi = cleanPhone.startsWith('55') && cleanPhone.length >= 12
          ? cleanPhone.slice(2)
          : cleanPhone;

        // Passo 1: Match exato (formato do CRM, sem DDI)
        const { data: exactData, count: exactCount } = await supabase
          .from('clientes')
          .select('id, nome, email, telefone, whatsapp, observacoes, created_at', { count: 'exact' })
          .eq('user_id', userId)
          .or(`telefone.eq.${phoneWithoutDdi},whatsapp.eq.${phoneWithoutDdi}`)
          .limit(2);

        // Só retorna se match for único e determinístico
        if (exactCount === 1 && exactData?.[0]) {
          return exactData[0] as unknown as ContextCliente;
        }

        // Passo 2: Fallback suffix-8 (para números salvos com formatação diferente)
        if (!exactData || exactData.length === 0) {
          const suffix = cleanPhone.slice(-8);
          const { data: fallbackData, count: fallbackCount } = await supabase
            .from('clientes')
            .select('id, nome, email, telefone, whatsapp, observacoes, created_at', { count: 'exact' })
            .eq('user_id', userId)
            .or(`telefone.ilike.%${suffix}%,whatsapp.ilike.%${suffix}%`)
            .limit(2);

          // Só retorna se match único (ambiguidade → null → fotógrafo resolve)
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

  // 3. Carregar Contexto Completo via RPC
  const { data: rpcContext, isLoading: isLoadingRpc } = useQuery({
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
    staleTime: 1000 * 60 * 2,
  });

  const sessoes = (rpcContext?.sessoes || []) as ContextSessao[];
  const tarefas = (rpcContext?.tarefas || []) as ContextTask[];
  const orcamentos = (rpcContext?.orcamentos || []) as ContextOrcamento[];
  const cobrancas = (rpcContext?.cobrancas || []) as ContextCobranca[];
  const leadsPerdidos = (rpcContext?.leads_perdidos || []) as ContextLeadPerdido[];

  // 4. Carregar Lead / Oportunidade
  const { data: lead, isLoading: isLoadingLead } = useQuery({
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
        if (error) return null;
        return data as unknown as ContextLead;
      }

      // Tentativa de correspondência determinística por telefone normalizado
      if (rawPhone && rawPhone.length >= 10) {
        const cleanPhone = rawPhone.replace(/\D/g, '');
        const phoneWithoutDdi = cleanPhone.startsWith('55') && cleanPhone.length >= 12
          ? cleanPhone.slice(2)
          : cleanPhone;

        // Passo 1: Match exato (formato do CRM, sem DDI)
        const { data: exactData, count: exactCount } = await (supabase as any)
          .from('leads')
          .select('id, nome, email, telefone, status, origem, valor_estimado, needs_follow_up, created_at', { count: 'exact' })
          .eq('user_id', userId)
          .or(`telefone.eq.${phoneWithoutDdi},whatsapp.eq.${phoneWithoutDdi}`)
          .limit(2);

        if (exactCount === 1 && exactData?.[0]) {
          return exactData[0] as unknown as ContextLead;
        }

        // Passo 2: Fallback suffix-8
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

  
  // Mutations de Vinculação
  const linkClienteMutation = useMutation({
    mutationFn: async (clienteIdToLink: string) => {
      if (!chatId || !userId) throw new Error('Chat não selecionado');

      // Atualiza o chat
      const { error: chatError } = await supabase
        .from('conversas_chats')
        .update({ cliente_id: clienteIdToLink, updated_at: new Date().toISOString() })
        .eq('id', chatId);

      if (chatError) throw chatError;

      // Se houver contatoId, atualiza também o contato
      if (contatoId) {
        await supabase
          .from('conversas_contatos')
          .update({ cliente_id: clienteIdToLink, tipo: 'cliente', updated_at: new Date().toISOString() })
          .eq('id', contatoId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas-context-cliente'] });
      queryClient.invalidateQueries({ queryKey: ['conversas-contato-info'] });
      queryClient.invalidateQueries({ queryKey: ['conversas-chats'] });
    },
    onError: (err) => {
      console.error('[linkClienteMutation] Erro:', err);
      toast.error('Não foi possível vincular o cliente.');
    },
  });

  const linkLeadMutation = useMutation({
    mutationFn: async (leadIdToLink: string) => {
      if (!chatId || !userId) throw new Error('Chat não selecionado');

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
      queryClient.invalidateQueries({ queryKey: ['conversas-contato-info'] });
      queryClient.invalidateQueries({ queryKey: ['conversas-chats'] });
    },
    onError: (err) => {
      console.error('[linkLeadMutation] Erro:', err);
      toast.error('Não foi possível vincular o lead.');
    },
  });

  const linkAmbosMutation = useMutation({
    mutationFn: async ({ leadId, clienteId }: { leadId?: string; clienteId?: string }) => {
      if (!chatId || !userId) throw new Error('Chat não selecionado');

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
      queryClient.invalidateQueries({ queryKey: ['conversas-contato-info'] });
      queryClient.invalidateQueries({ queryKey: ['conversas-chats'] });
    },
    onError: (err) => {
      console.error('[linkAmbosMutation] Erro:', err);
      toast.error('Não foi possível vincular o lead/cliente à conversa.');
    },
  });

  const createQuickTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!cliente?.id || !userId) throw new Error('Cliente não identificado');
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
    onError: () => {
      toast.error('Erro ao adicionar tarefa.');
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
    cliente,
    lead,
    sessoes,
    tarefas,
    orcamentos,
    cobrancas,
    leadsPerdidos,
    isLoading: isLoadingCliente || isLoadingRpc || isLoadingLead,
    isLinkedToCliente: !!cliente?.id,
    isLinkedToLead: !!lead?.id,
    vincularCliente: linkClienteMutation.mutateAsync,
    vincularLead: linkLeadMutation.mutateAsync,
    vincularAmbos: linkAmbosMutation.mutateAsync,
    criarTarefaRapida: createQuickTaskMutation.mutateAsync,
    concluirTarefa: completeTaskMutation.mutateAsync,
  };
}
