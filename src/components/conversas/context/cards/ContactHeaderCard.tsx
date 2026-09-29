import { Star, CalendarDays, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ChatState } from '@/hooks/useChatStateResolver';
import LeadStatusSelector from '@/components/leads/LeadStatusSelector';

interface ContactHeaderCardProps {
  chat: any;
  state: ChatState;
  cliente?: any;
  lead?: any;
}

export function ContactHeaderCard({ chat, state, cliente, lead }: ContactHeaderCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const name = cliente?.nome || chat?.contato_nome || chat?.contato_phone_normalized || 'Desconhecido';
  const clienteId = cliente?.id || chat?.cliente_id;
  
  const handleStatusChange = async (newStatus: string) => {
    if (!lead?.id) return;
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', lead.id);
        
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['conversas-context-lead'] });
      toast.success('Status do lead atualizado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status.');
    }
  };

  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col gap-3">
      {/* Top Row: Info + Badge + Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
            {name}
          </h3>
          {/* Tag lateral */}
          {state === 'ACTIVE_LEAD' && (
            <div className="flex shrink-0 items-center gap-1 bg-[#8B5CF6]/10 text-[#8B5CF6] px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#8B5CF6]/20">
              <Star className="h-2.5 w-2.5 fill-current" /> Lead
            </div>
          )}
          {state === 'ACTIVE_SESSION' && (
            <div className="flex shrink-0 items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-500/20">
              <Star className="h-2.5 w-2.5 fill-current" /> Cliente
            </div>
          )}
          {state === 'CLIENT' && (
            <div className="flex shrink-0 items-center gap-1 bg-[#3B82F6]/10 text-[#3B82F6] px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#3B82F6]/20">
              <CalendarDays className="h-2.5 w-2.5" /> Cliente
            </div>
          )}
        </div>
        
        {clienteId && (
          <button
            onClick={() => navigate(`/app/clientes/${clienteId}`)}
            className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <span className="text-[10px] font-medium">Ver Cliente</span>
            <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Bottom Row: Status Selector if Lead */}
      {lead?.status && (
        <div className="flex items-center gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
          <span className="text-[11px] font-medium text-zinc-500">Fase atual:</span>
          <LeadStatusSelector 
            lead={lead as any} 
            onStatusChange={handleStatusChange} 
          />
        </div>
      )}
    </div>
  );
}
