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
      return ['fotografado', 'edicao', 'selecao', 'diagramacao', 'aprovacao'].includes(status);
    }) || gallery != null; 

    if (hasPostProduction) {
      return 'POST_PRODUCTION';
    }

    // 2. ACTIVE_SESSION: Sessão agendada futura ou hoje
    const hasActiveSession = sessions?.some(s => {
      if (!s.data_sessao) return false;
      const todayIso = new Date().toISOString().slice(0, 10);
      const isFuture = s.data_sessao.slice(0, 10) >= todayIso;
      
      const status = (s.status || '').toLowerCase();
      const isAgendado = !['entregue', 'cancelado', 'arquivado'].includes(status);
      
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

export function resolveTemplateContext(state: ChatContactState, sessions: any[]) {
  const firstSession = sessions?.[0] || null;
  const category = firstSession?.categoria || null;
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
