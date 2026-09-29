/**
 * Máquina de estados simplificada para o contexto da conversa.
 *
 * 4 estados base — a intenção comercial NÃO é um estado,
 * mas uma camada contextual paralela (CommercialIntent).
 *
 * Prioridade de resolução:
 *   1. Sessão ativa/futura → ACTIVE_SESSION
 *   2. Lead ativo no funil → ACTIVE_LEAD
 *   3. Cliente existente no CRM → CLIENT
 *   4. Nenhum vínculo → UNKNOWN
 */

import { useMemo } from 'react';

export type ChatState = 'UNKNOWN' | 'CLIENT' | 'ACTIVE_LEAD' | 'ACTIVE_SESSION';

export interface ChatStateData {
  cliente: any | null;
  lead: any | null;
  sessoes: any[];
}

export function useChatStateResolver({ cliente, lead, sessoes }: ChatStateData): ChatState {
  return useMemo(() => {
    // Prioridade 1: Sessão ativa ou futura (data >= hoje ou workflow não finalizado)
    const hasActiveSession = sessoes?.some(s => {
      if (!s.data_sessao) return false;
      const todayIso = new Date().toISOString().slice(0, 10);
      const isFuture = s.data_sessao.slice(0, 10) >= todayIso;
      const isPendingWorkflow = s.status_workflow && !['entregue', 'cancelado', 'arquivado'].includes(s.status_workflow.toLowerCase());
      return isFuture || isPendingWorkflow;
    });

    if (hasActiveSession) {
      return 'ACTIVE_SESSION';
    }

    // Prioridade 2: Lead ativo no funil (não ganho/perdido)
    if (lead && lead.id) {
      const statusLower = (lead.status || '').toLowerCase();
      const isFinished = ['fechado', 'perdido', 'ganho', 'convertido', 'lost', 'won'].includes(statusLower);
      if (!isFinished) {
        return 'ACTIVE_LEAD';
      }
    }

    // Prioridade 3: Cliente vinculado ao CRM (sem sessão nem lead ativo)
    if (cliente && cliente.id) {
      return 'CLIENT';
    }

    // Prioridade 4: Contato desconhecido
    return 'UNKNOWN';
  }, [cliente, lead, sessoes]);
}
