/**
 * Hook React para consumir o Motor de Intenção Comercial.
 *
 * Wrapper leve com useMemo sobre detectCommercialIntent().
 * Recalcula apenas quando o número de mensagens muda (evita re-runs caros).
 *
 * Uso:
 * ```tsx
 * const intent = useCommercialIntent(messages, categorias);
 * if (intent.detected) {
 *   // Exibir card de "Nova oportunidade detectada"
 * }
 * ```
 */

import { useMemo } from 'react';
import {
  detectCommercialIntent,
  type CommercialIntent,
  type IntentMessage,
} from '@/modules/conversas/detectCommercialIntent';
import type { Mensagem } from '@/modules/conversas/types';

/**
 * Adapta o tipo Mensagem do Supabase para o formato simplificado que
 * o motor de intenção espera, evitando acoplamento com o schema do banco.
 */
function toIntentMessages(messages: Mensagem[]): IntentMessage[] {
  return messages.map((m) => ({
    direction: m.direction,
    content: m.content || '',
    timestamp: m.timestamp || m.created_at,
    type: m.type,
  }));
}

export function useCommercialIntent(
  messages: Mensagem[] | undefined,
  availableCategories: string[] = []
): CommercialIntent {
  // O key de memoização é o length de mensagens + categorias.
  // Isso garante que o motor só re-execute quando chega uma nova mensagem,
  // e não a cada render do componente.
  const messagesCount = messages?.length ?? 0;
  const categoriesKey = availableCategories.join(',');

  return useMemo(() => {
    if (!messages || messages.length === 0) {
      return {
        detected: false,
        service: undefined,
        confidence: 0,
        matchedKeywords: [],
        rawScore: 0,
      };
    }

    const intentMessages = toIntentMessages(messages);
    return detectCommercialIntent(intentMessages, availableCategories);
  }, [messagesCount, categoriesKey]); // eslint-disable-line react-hooks/exhaustive-deps
}
