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
    // Prioridade 1: Sessão ativa ou futura
    if (sessoes && sessoes.length > 0) {
      return 'ACTIVE_SESSION';
    }

    // Prioridade 2: Lead ativo no funil (não ganho/perdido)
    if (lead && lead.id) {
      return 'ACTIVE_LEAD';
    }

    // Prioridade 3: Cliente vinculado ao CRM (sem sessão nem lead ativo)
    if (cliente && cliente.id) {
      return 'CLIENT';
    }

    // Prioridade 4: Contato desconhecido
    return 'UNKNOWN';
  }, [cliente, lead, sessoes]);
}
