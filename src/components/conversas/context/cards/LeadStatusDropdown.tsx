import { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useLeadStatuses } from '@/hooks/useLeadStatuses';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { useLeads } from '@/hooks/useLeads';
import { useQueryClient } from '@tanstack/react-query';

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

  const queryClient = useQueryClient();

  const handleSelect = (statusKey: string) => {
    if (statusKey === currentStatusKey) {
      setOpen(false);
      return;
    }

    try {
      setIsUpdating(true);
      updateLead(leadId, { status: statusKey });
      
      // Invalida os caches do chat para refletir a mudança instantaneamente
      queryClient.invalidateQueries({ queryKey: ['conversas-context-lead'] });
      queryClient.invalidateQueries({ queryKey: ['conversas-contato-info'] });
      
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
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium tracking-tight text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : (
            <>
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: currentStatus?.color || '#ccc' }}
              />
              {displayLabel}
            </>
          )}
          <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
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
