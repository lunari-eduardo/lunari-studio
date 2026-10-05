import React from 'react';
import { Lead } from '@/types/leads';
import LeadCard from './LeadCard';
import { useLeads } from '@/hooks/useLeads';
import { useLeadStatuses } from '@/hooks/useLeadStatuses';

interface LeadHistoryGridProps {
  leads: Lead[];
  onScheduleClient?: () => void;
}

export default function LeadHistoryGrid({ leads, onScheduleClient }: LeadHistoryGridProps) {
  const { deleteLead, convertToClient } = useLeads();
  const { statuses } = useLeadStatuses();
  
  const statusOptions = React.useMemo(() => statuses.map(s => ({ value: s.key, label: s.name })), [statuses]);

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <p>Nenhum lead encontrado neste perodo.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 pb-[calc(8rem+env(safe-area-inset-bottom))]">
      {leads.map(lead => (
        <LeadCard
          key={lead.id}
          lead={lead}
          onDelete={() => deleteLead(lead.id)}
          onConvertToClient={() => convertToClient(lead.id)}
          statusOptions={statusOptions}
          onScheduleClient={onScheduleClient}
        />
      ))}
    </div>
  );
}

