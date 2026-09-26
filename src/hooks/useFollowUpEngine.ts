import { useMemo } from 'react';
import type { Chat } from '@/modules/conversas/types';

export interface FollowUpConfig {
  daysThreshold: number; // Quantos dias sem resposta consideramos ignorado
}

export function useFollowUpEngine(chat: Chat | null, lead: any | null, config: FollowUpConfig = { daysThreshold: 2 }) {
  return useMemo(() => {
    if (!chat || !lead) return { needsFollowUp: false, daysIgnored: 0 };
    
    // Se o lead já foi ganho ou perdido, não precisa de follow-up de orçamento.
    if (lead.status === 'Ganho' || lead.status === 'Perdido') {
      return { needsFollowUp: false, daysIgnored: 0 };
    }

    // A última mensagem da conversa deve ser 'outbound' (nós enviamos)
    if (chat.ultima_mensagem_direction !== 'outbound' || !chat.ultima_mensagem_data) {
      return { needsFollowUp: false, daysIgnored: 0 };
    }

    const lastMessageDate = new Date(chat.ultima_mensagem_data);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastMessageDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= config.daysThreshold) {
      return { 
        needsFollowUp: true, 
        daysIgnored: diffDays,
        suggestedCategory: 'Recuperação/Lembrete'
      };
    }

    return { needsFollowUp: false, daysIgnored: 0 };
  }, [chat, lead, config.daysThreshold]);
}
