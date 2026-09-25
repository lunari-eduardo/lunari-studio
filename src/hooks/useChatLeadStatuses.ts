/**
 * Hook que resolve o status do lead vinculado para cada chat em batch.
 * Retorna um mapa { lead_id → status_key } para uso na renderização da lista.
 * Uma única query para todos os chats visíveis.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { EnrichedChat } from '@/modules/conversas/types';
import { useLeadStatuses } from '@/hooks/useLeadStatuses';

export interface LeadStatusInfo {
  key: string;
  label: string;
  color?: string;
}

export function useChatLeadStatuses(chats: EnrichedChat[]) {
  const { user } = useAuth();
  const userId = user?.id;
  const { statuses } = useLeadStatuses();

  // Extrair todos os lead_ids únicos e não nulos dos chats
  const leadIds = useMemo(() => {
    const ids = new Set<string>();
    for (const chat of chats) {
      if (chat.lead_id) ids.add(chat.lead_id);
    }
    return Array.from(ids);
  }, [chats]);

  // Buscar os status dos leads em batch (1 query)
  const { data: leadStatusMap = {} } = useQuery({
    queryKey: ['chat-lead-statuses', userId, leadIds.join(',')],
    queryFn: async () => {
      if (!userId || leadIds.length === 0) return {};

      const { data, error } = await supabase
        .from('leads')
        .select('id, status')
        .eq('user_id', userId)
        .in('id', leadIds);

      if (error || !data) return {};

      const map: Record<string, string> = {};
      for (const lead of data) {
        map[lead.id] = lead.status;
      }
      return map;
    },
    enabled: !!userId && leadIds.length > 0,
    staleTime: 1000 * 60 * 2, // 2 min
    refetchOnWindowFocus: false,
  });

  // Mapa de status_key → LeadStatusDef para traduzir key → label
  const statusDefMap = useMemo(() => {
    const m: Record<string, { label: string; color?: string }> = {};
    for (const s of statuses) {
      m[s.key] = { label: s.name, color: s.color };
    }
    return m;
  }, [statuses]);

  /**
   * Retorna a informação do status do lead vinculado ao chat,
   * ou null se o chat não tiver lead vinculado.
   */
  const getLeadStatusForChat = useMemo(() => {
    return (chat: EnrichedChat): LeadStatusInfo | null => {
      if (!chat.lead_id) return null;
      const statusKey = leadStatusMap[chat.lead_id];
      if (!statusKey) return null;
      const def = statusDefMap[statusKey];
      return {
        key: statusKey,
        label: def?.label ?? statusKey.replace(/_/g, ' '),
        color: def?.color,
      };
    };
  }, [leadStatusMap, statusDefMap]);

  return { getLeadStatusForChat };
}
