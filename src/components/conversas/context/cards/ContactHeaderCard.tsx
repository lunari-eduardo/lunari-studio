import { RefreshCcw, Star, Calendar, MoreVertical, Plus, Link, Tag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UnifiedContactContext } from '@/hooks/useConversasContactContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { LeadStatusDropdown } from './LeadStatusDropdown';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useConversasEtiquetas } from '@/hooks/useConversasEtiquetas';

interface Props {
  chat: any;
  context: UnifiedContactContext;
  onCreateLead?: () => void;
  onLinkClient?: () => void;
  onOpenClient?: () => void;
}

export function ContactHeaderCard({ chat, context, onCreateLead, onLinkClient, onOpenClient }: Props) {
  const queryClient = useQueryClient();
  const { state, categoriaPrincipal, etapaVigente, futureCount, contact, client, lead } = context;
  const { etiquetas } = useConversasEtiquetas();
  
  const chatEtiquetas = (chat?.etiquetas || []).map((id: string) => etiquetas.find(e => e.id === id)).filter(Boolean);

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

  const isLeadFinished = lead?.status ? ['fechado', 'perdido', 'ganho', 'convertido', 'lost', 'won'].includes(lead.status.toLowerCase()) : false;
  const hasOpenLead = !!lead?.id && !isLeadFinished;
  
  const isClientBase = !!client?.id;
  const hasFutureSession = state === 'NEXT_SESSION' || futureCount > 0;
  
  const canCreateLead = !hasOpenLead;
  const showMenu = (canCreateLead && onCreateLead) || onLinkClient || isClientBase;

  return (
    <div className="flex flex-col gap-2 p-3 pb-2">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-[16px] font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight pr-2">
            {contact.name}
          </h3>
          
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            {hasOpenLead && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium tracking-tight">
                <Star className="h-2.5 w-2.5 fill-current opacity-70" />
                Lead
              </div>
            )}
            
            {isClientBase && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium tracking-tight">
                <Star className="h-2.5 w-2.5 fill-current opacity-70" />
                Cliente
              </div>
            )}

            {chatEtiquetas.map(e => (
              <div 
                key={e!.id} 
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-tight" 
                style={{ backgroundColor: e!.cor + '1A', color: e!.cor, border: `1px solid ${e!.cor}33` }}
              >
                <Tag className="h-2.5 w-2.5 opacity-70" />
                {e!.nome}
              </div>
            ))}

            {hasFutureSession && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-500/10 text-[10px] font-medium tracking-tight text-sky-600 dark:text-sky-500">
                <Calendar className="h-2.5 w-2.5 opacity-70" />
                Sessão agendada
              </div>
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

        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 outline-none flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canCreateLead && onCreateLead && (
                <DropdownMenuItem onClick={onCreateLead} className="gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <Plus className="h-4 w-4" />
                  Criar Lead
                </DropdownMenuItem>
              )}
              {onLinkClient && (
                <DropdownMenuItem onClick={onLinkClient} className="gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <Link className="h-4 w-4" />
                  Vincular Cliente Existente
                </DropdownMenuItem>
              )}
              {isClientBase && onOpenClient && (
                <DropdownMenuItem onClick={onOpenClient} className="gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <Star className="h-4 w-4" />
                  Ver Cliente no CRM
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {etapaVigente && (
        <div className="flex items-center gap-1.5 mt-1">
          <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 text-[10px] font-medium border border-black/5 dark:border-white/5">
            <span className="opacity-60 mr-1 uppercase text-[9px] tracking-wider font-bold">FASE</span>
            {etapaVigente}
          </div>
        </div>
      )}
    </div>
  );
}
