/**
 * Máquina de estados consolidada do Contexto Ativo.
 *
 * Prioridade inegociável (Top-Down):
 * 1. ACTIVE_SESSION: Existe uma sessão em andamento (pós-produção ou marcada para hoje).
 * 2. NEXT_SESSION: Existe uma sessão agendada no futuro (amanhã em diante).
 * 3. OPEN_OPPORTUNITY: Existe uma oportunidade (lead) aberta e não finalizada.
 * 4. CLIENT: Cliente da base, sem oportunidade e sem sessão.
 * 5. NEW_CONTACT: Contato sem vínculo.
 */

import { useMemo } from 'react';

export type ChatContactState = 
  | 'ACTIVE_SESSION'
  | 'NEXT_SESSION'
  | 'OPEN_OPPORTUNITY'
  | 'CLIENT'
  | 'NEW_CONTACT';

export interface ChatStateData {
  client: any | null;
  lead: any | null;
  sessions: any[];
  gallery: any | null;
}

export function useChatStateResolver({ client, lead, sessions, gallery }: ChatStateData): ChatContactState {
  return useMemo(() => {
    // Helper to get ISO date locally
    const getIsoDateLocal = (dateString: string) => {
      const parts = dateString.split('T')[0].split('-');
      if (parts.length >= 3) {
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      }
      return dateString.slice(0, 10);
    };

    const todayIso = new Date().toISOString().slice(0, 10);

    // Filter valid sessions (not cancelled, finished, or delivered)
    const validSessions = sessions?.filter(s => {
      const status = (s.status || '').toLowerCase();
      return !['finalizado', 'cancelado', 'arquivado', 'entregue'].includes(status);
    }) || [];

    // 1. ACTIVE_SESSION (Pós-produção ou Hoje)
    // Uma sessão é ACTIVE se está em pós-produção OU está agendada exatamente para hoje.
    const hasActiveSession = validSessions.some(s => {
      const status = (s.status || '').toLowerCase();
      const isPos = ['fotografado', 'edicao', 'selecao', 'diagramacao', 'aprovacao'].includes(status);
      const dataSessao = s.data_sessao || s.data;
      const isToday = dataSessao && getIsoDateLocal(dataSessao) === todayIso;
      return isPos || isToday;
    }) || gallery != null;

    if (hasActiveSession) return 'ACTIVE_SESSION';

    // 2. NEXT_SESSION (Agendada para o Futuro)
    const hasFutureSession = validSessions.some(s => {
      const dataSessao = s.data_sessao || s.data;
      if (!dataSessao) return false;
      const isFuture = getIsoDateLocal(dataSessao) > todayIso;
      const status = (s.status || '').toLowerCase();
      const isAgendado = !['fotografado', 'edicao', 'selecao', 'diagramacao', 'aprovacao'].includes(status);
      return isFuture && isAgendado;
    });

    if (hasFutureSession) return 'NEXT_SESSION';

    // 3. OPEN_OPPORTUNITY (Lead ativo)
    // A oportunidade tem prioridade sobre o status genérico de Cliente.
    if (lead && lead.id) {
      const statusLower = (lead.status || '').toLowerCase();
      const isFinished = ['fechado', 'perdido', 'ganho', 'convertido', 'lost', 'won'].includes(statusLower);
      if (!isFinished) {
        return 'OPEN_OPPORTUNITY';
      }
    }

    // 4. CLIENT (Cliente base)
    if (client && client.id) {
      return 'CLIENT';
    }

    // 5. NEW_CONTACT
    return 'NEW_CONTACT';
  }, [client, lead, sessions, gallery]);
}

export function resolveTemplateContext(state: ChatContactState, categoriaPrincipalId: string | null) {
  const category = categoriaPrincipalId || null;
  let stage: string | null = null;

  switch (state) {
    case 'NEW_CONTACT':
      stage = 'primeiro_contato';
      break;
    case 'OPEN_OPPORTUNITY':
      stage = 'orcamento';
      break;
    case 'CLIENT':
      stage = 'relacionamento';
      break;
    case 'NEXT_SESSION':
      stage = 'pre_ensaio';
      break;
    case 'ACTIVE_SESSION':
      stage = 'pos_venda'; // Ou fotografado/pos-venda, ideal seria refinar isso
      break;
  }

  return { category, stage };
}

// ---------------------------------------------------------------------------------
// NOVO MOTOR DE ETIQUETAS INTELIGENTES
// ---------------------------------------------------------------------------------

const isPosProducao = (status: string) => {
  return ['fotografado', 'edicao', 'selecao', 'diagramacao', 'aprovacao'].includes(status.toLowerCase());
};

/**
 * 1. PONTEIRO DO WORKFLOW ATIVO E CONCORRÊNCIA
 */
export function resolveActiveWorkflowContext(sessions: any[] = []) {
  const activeSessions = sessions.filter(s => {
    const status = (s.status || '').toLowerCase();
    return !['finalizado', 'cancelado', 'arquivado', 'entregue'].includes(status);
  });

  if (!activeSessions.length) return { activeWorkflow: null, futureCount: 0 };

  const getIsoDateLocal = (dateString: string) => {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length >= 3) return `${parts[0]}-${parts[1]}-${parts[2]}`;
    return dateString.slice(0, 10);
  };
  const todayIso = new Date().toISOString().slice(0, 10);

  // Filtra as sessões que estão em pós-produção OU são exatamente hoje
  const prioritySessions = activeSessions.filter(s => {
    const dataSessao = s.data_sessao || s.data;
    const isToday = dataSessao && getIsoDateLocal(dataSessao) === todayIso;
    return isPosProducao(s.status || '') || isToday;
  });

  if (prioritySessions.length > 0) {
    // Se houver mais de uma (ex: uma de hoje e uma de 2025), a MAIS RECENTE ganha o foco principal.
    const active = prioritySessions.sort((a, b) => {
      const dataA = a.data_sessao || a.data;
      const dataB = b.data_sessao || b.data;
      // Ordenação decrescente: B - A
      return new Date(dataB).getTime() - new Date(dataA).getTime();
    })[0];
    return { activeWorkflow: active, futureCount: activeSessions.length - 1 };
  }

  // Se não tem pós nem hoje, pega a futura MAIS PRÓXIMA (crescente)
  const futureSessions = activeSessions.sort((a, b) => {
    const dataA = a.data_sessao || a.data;
    const dataB = b.data_sessao || b.data;
    return new Date(dataA).getTime() - new Date(dataB).getTime();
  });
  return { activeWorkflow: futureSessions[0], futureCount: activeSessions.length - 1 };
}

export type CategoriaPrincipalInfo = { id: string | null; modo: 'MANUAL' | 'AUTOMATICO' };

/**
 * 2. CATEGORIA PRINCIPAL (Manual x Cascata Automática)
 */
export function resolveCategoriaPrincipal(contato: any, activeWorkflow: any, allSessions: any[]): CategoriaPrincipalInfo {
  if (contato?.categoria_manual_id) return { id: contato.categoria_manual_id, modo: 'MANUAL' };

  if (activeWorkflow?.categoria) return { id: activeWorkflow.categoria, modo: 'AUTOMATICO' };
  
  const ultimos = allSessions.filter(s => ['finalizado', 'entregue'].includes((s.status || '').toLowerCase()))
    .sort((a, b) => {
      const dataA = a.data_sessao || a.data;
      const dataB = b.data_sessao || b.data;
      return new Date(dataB).getTime() - new Date(dataA).getTime();
    });
  
  if (ultimos.length > 0 && ultimos[0].categoria) return { id: ultimos[0].categoria, modo: 'AUTOMATICO' };
  if (contato?.categoria_ia_id) return { id: contato.categoria_ia_id, modo: 'AUTOMATICO' };

  return { id: null, modo: 'AUTOMATICO' };
}

/**
 * 3. ETAPA VIGENTE (Espelhamento Direto)
 */
export function resolveEtapaVigente(contato: any, activeWorkflow: any, hasOrcamento: boolean): string | null {
  if (activeWorkflow) return activeWorkflow.status || null; // Espelho direto do Kanban
  
  if (contato?.id && contato.status) { // Se for Lead
    const status = contato.status.toLowerCase();
    return ['convertido', 'fechado', 'perdido'].includes(status) 
      ? null
      : contato.status; 
  }

  return null;
}
