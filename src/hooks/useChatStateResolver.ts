import { useMemo } from 'react';

export type ChatState = 'UNKNOWN' | 'LEAD' | 'SESSION' | 'POST_SALE';

export interface ChatStateData {
  cliente: any | null;
  lead: any | null;
  sessoes: any[];
}

export function useChatStateResolver({ cliente, lead, sessoes }: ChatStateData): ChatState {
  return useMemo(() => {
    // ESTADO 3: Tem sessão em andamento/ativa
    if (sessoes && sessoes.length > 0) {
      return 'SESSION';
    }

    // ESTADO 2: Tem um lead ativo (não ganho/perdido)
    if (lead && lead.id) {
      return 'LEAD';
    }

    // ESTADO 4: Tem vínculo com cliente, mas sem sessão ativa ou lead (Pós-Venda)
    if (cliente && cliente.id) {
      return 'POST_SALE';
    }

    // ESTADO 1: Sem cliente e sem lead
    return 'UNKNOWN';
  }, [cliente, lead, sessoes]);
}
