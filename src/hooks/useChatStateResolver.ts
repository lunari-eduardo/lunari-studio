/**
 * Máquina de estados estrita para o contexto da conversa.
 *
 * Prioridade inegociável (Top-Down):
 * 1. POST_PRODUCTION (Galeria pendente ou edição ativa)
 * 2. ACTIVE_SESSION (Sessão futura)
 * 3. CLIENT (Sem trabalho ativo)
 * 4. LEAD (Lead em funil)
 * 5. NEW_CONTACT (Sem vínculo)
 */

import { useMemo } from 'react';

export type ChatContactState = 
  | 'NEW_CONTACT'
  | 'LEAD'
  | 'CLIENT'
  | 'ACTIVE_SESSION'
  | 'POST_PRODUCTION';

export interface ChatStateData {
  client: any | null;
  lead: any | null;
  sessions: any[];
  gallery: any | null;
}

export function useChatStateResolver({ client, lead, sessions, gallery }: ChatStateData): ChatContactState {
  return useMemo(() => {
    // 1. POST_PRODUCTION: Galeria pendente ou sessão em edição
    const hasPostProduction = sessions?.some(s => {
      const status = (s.status || '').toLowerCase();
      // Retrocompatibilidade até uso total de tipo_fase
      return ['fotografado', 'edicao', 'selecao', 'diagramacao', 'aprovacao'].includes(status);
    }) || gallery != null; 

    if (hasPostProduction) {
      return 'POST_PRODUCTION';
    }

    // 2. ACTIVE_SESSION: Sessão agendada futura ou hoje
    const hasActiveSession = sessions?.some(s => {
      const dataSessao = s.data_sessao || s.data;
      if (!dataSessao) return false;
      const todayIso = new Date().toISOString().slice(0, 10);
      const isFuture = dataSessao.slice(0, 10) >= todayIso;
      
      const status = (s.status || '').toLowerCase();
      const isAgendado = !['entregue', 'cancelado', 'arquivado', 'finalizado'].includes(status);
      
      return isFuture && isAgendado;
    });

    if (hasActiveSession) {
      return 'ACTIVE_SESSION';
    }

    // 3. CLIENT: Cliente sem trabalho ativo
    if (client && client.id) {
      return 'CLIENT';
    }

    // 4. LEAD: Lead ativo no funil (não ganho/perdido)
    if (lead && lead.id) {
      const statusLower = (lead.status || '').toLowerCase();
      const isFinished = ['fechado', 'perdido', 'ganho', 'convertido', 'lost', 'won'].includes(statusLower);
      if (!isFinished) {
        return 'LEAD';
      }
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
    case 'LEAD':
      stage = 'orcamento';
      break;
    case 'CLIENT':
      stage = 'relacionamento';
      break;
    case 'ACTIVE_SESSION':
      stage = 'pre_ensaio';
      break;
    case 'POST_PRODUCTION':
      stage = 'pos_venda';
      break;
  }

  return { category, stage };
}

// ---------------------------------------------------------------------------------
// NOVO MOTOR DE ETIQUETAS INTELIGENTES
// ---------------------------------------------------------------------------------

// Função auxiliar para mapeamento do status interno
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

  const postProdSessions = activeSessions.filter(s => isPosProducao(s.status || ''));

  if (postProdSessions.length > 0) {
    const active = postProdSessions.sort((a, b) => {
      const dataA = a.data_sessao || a.data;
      const dataB = b.data_sessao || b.data;
      return new Date(dataA).getTime() - new Date(dataB).getTime();
    })[0];
    return { activeWorkflow: active, futureCount: activeSessions.length - 1 };
  }

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
      ? null // Se já foi convertido ou perdido, não exibe etiqueta
      : contato.status; // Pode ser "Em Atendimento", "Orçamento Enviado", etc.
  }

  return null;
}
