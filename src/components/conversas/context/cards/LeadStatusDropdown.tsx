import { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useLeadStatuses } from '@/hooks/useLeadStatuses';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { useLeads } from '@/hooks/useLeads';

interface LeadStatusDropdownProps {
  leadId: string;
  currentStatusKey: string;
}

export function LeadStatusDropdown({ leadId, currentStatusKey }: LeadStatusDropdownProps) {
  const { statuses, isLoading: isStatusesLoading } = useLeadStatuses();
  const { updateLead } = useLeads();
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const currentStatus = statuses.find((s) => s.key === currentStatusKey);
  const displayLabel = currentStatus?.name || 'Status Desconhecido';

  const handleSelect = (statusKey: string) => {
    if (statusKey === currentStatusKey) {
      setOpen(false);
      return;
    }

    try {
      setIsUpdating(true);
      updateLead(leadId, { status: statusKey });
      setOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar status', error);
    } finally {
      // Pequeno timeout visual
      setTimeout(() => setIsUpdating(false), 500);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          disabled={isStatusesLoading || isUpdating}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-600 dark:text-amber-500 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
        >
          {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : displayLabel}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>Nenhum status encontrado.</CommandEmpty>
            <CommandGroup>
              {statuses.map((status) => (
                <CommandItem
                  key={status.key}
                  value={status.key}
                  onSelect={(currentValue) => {
                    handleSelect(status.key);
                  }}
                  className="text-xs"
                >
                  <div
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: status.color || '#ccc' }}
                  />
                  {status.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
