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
  isFinished?: boolean;
}

export function useChatLeadStatuses(chats: EnrichedChat[]) {
  const { user } = useAuth();
  const userId = user?.id;
  const { statuses } = useLeadStatuses();

  const leadIds = useMemo(() => {
    const ids = new Set<string>();
    for (const chat of chats) {
      if (chat.lead_id) ids.add(chat.lead_id);
    }
    return Array.from(ids);
  }, [chats]);

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

  const statusDefMap = useMemo(() => {
    const m: Record<string, { label: string; color?: string; isFinished?: boolean }> = {};
    for (const s of statuses) {
      m[s.key] = { 
        label: s.name, 
        color: s.color,
        isFinished: s.isConverted || s.isLost
      };
    }
    return m;
  }, [statuses]);

  const getLeadStatusForChat = useMemo(() => {
    return (chat: EnrichedChat): LeadStatusInfo | null => {
      if (!chat.lead_id) return null;
      const statusKey = leadStatusMap[chat.lead_id];
      if (!statusKey) return null;
      
      const def = statusDefMap[statusKey];
      
      // Regra de negcios: no exibir a tag na lista de conversas se for ganho/perdido (finished)
      if (def?.isFinished || ['fechado', 'perdido', 'ganho', 'convertido', 'lost', 'won'].includes(statusKey.toLowerCase())) {
        return null;
      }

      return {
        key: statusKey,
        label: def?.label ?? statusKey.replace(/_/g, ' '),
        color: def?.color,
      };
    };
  }, [leadStatusMap, statusDefMap]);

  return {
    getLeadStatusForChat,
    leadStatuses: statuses,
    leadStatusMap,
  };
}
