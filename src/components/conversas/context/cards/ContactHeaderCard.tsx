import { RefreshCcw, Star, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UnifiedContactContext } from '@/hooks/useConversasContactContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { LeadStatusDropdown } from './LeadStatusDropdown';

interface Props {
  chat: any;
  context: UnifiedContactContext;
}

export function ContactHeaderCard({ chat, context }: Props) {
  const queryClient = useQueryClient();
  const { state, categoriaPrincipal, etapaVigente, futureCount, contact, client, lead } = context;

  const clearManualMode = async () => {
    try {
      const contatoReal = client || lead;
      if (!contatoReal?.id) return;
      
      const tabela = client ? 'clientes' : 'leads';
      const { error } = await (supabase.from(tabela).update as any)({ categoria_manual_id: null }).eq('id', contatoReal.id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['conversas-context-cliente'] });
      queryClient.invalidateQueries({ queryKey: ['conversas-context-lead'] });
      toast.success('Categoria retornou para o modo automático.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao restaurar modo automático.');
    }
  };

  const isLeadActive = state === 'OPEN_OPPORTUNITY' && lead?.id;
  const isClientBase = client?.id && !isLeadActive;
  const hasFutureSession = state === 'NEXT_SESSION' || futureCount > 0;

  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col gap-3">
      
      {/* Camada 1: Identidade e Badges */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-black/5 dark:border-white/5">
          <AvatarImage src={contact.avatar || ''} />
          <AvatarFallback className="bg-zinc-100 text-zinc-600 font-medium">
            {contact.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
            {contact.name}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {isLeadActive && (
              <>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-bold">
                  <Star className="h-3 w-3 fill-current" />
                  Lead
                </div>
                <LeadStatusDropdown leadId={lead.id} currentStatusKey={lead.status} />
              </>
            )}
            
            {isClientBase && (
              <>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                  <Star className="h-3 w-3 fill-current" />
                  Cliente
                </div>
                {hasFutureSession && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-600 dark:text-amber-500">
                    <Calendar className="h-3 w-3" />
                    Sessão agendada
                  </div>
                )}
              </>
            )}

            {categoriaPrincipal?.id && categoriaPrincipal.modo === 'MANUAL' && (
              <button 
                onClick={clearManualMode} 
                className="text-zinc-400 hover:text-zinc-600 transition-colors ml-1"
                title="Restaurar identificação automática"
              >
                <RefreshCcw size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Camada 2: Etapa do Workflow (Espelhamento Direto) */}
      {etapaVigente && (
        <div className="pt-3 mt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
          <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium border border-black/5 dark:border-white/5">
            <span className="opacity-60 mr-1.5 uppercase text-[9px] tracking-wider font-bold">FASE</span>
            {etapaVigente}
          </div>
        </div>
      )}
    </div>
  );
}
