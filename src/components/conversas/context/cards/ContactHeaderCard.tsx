import { RefreshCcw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { UnifiedContactContext } from '@/hooks/useConversasContactContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  chat: any;
  context: UnifiedContactContext;
}

export function ContactHeaderCard({ chat, context }: Props) {
  const queryClient = useQueryClient();
  const { state, categoriaPrincipal, etapaVigente, futureCount, contact, client, lead } = context;

  const getMacroStateLabel = () => {
    switch(state) {
      
      case 'ACTIVE_SESSION': return 'Sessão Ativa';
      case 'NEXT_SESSION': return 'Próxima Sessão';
      case 'NEXT_SESSION': return 'Próxima Sessão';
      case 'CLIENT': return 'Cliente';
      case 'OPEN_OPPORTUNITY': return 'Oportunidade';
      case 'NEW_CONTACT': return 'Novo Contato';
      default: return 'Desconhecido';
    }
  };

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

  // Mock provisório para nome da categoria, até que possamos puxar do contexto global
  // Em uma etapa futura, usaríamos as categorias carregadas da configuração
  const categoriaNome = categoriaPrincipal?.id ? 'Categoria Vinculada' : 'Sem Categoria'; 
  
  // (Idealmente, o id da categoria seria traduzido para o nome pelo hook global de config)

  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col gap-3">
      
      {/* Camada 1: Estado Macro e Trabalhos Futuros */}
      <div className="flex justify-between items-center text-[10px]">
        <Badge variant="outline" className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-medium">
          {getMacroStateLabel()}
        </Badge>
        {futureCount > 0 && (
          <span className="text-zinc-500 font-medium">+{futureCount} {futureCount === 1 ? 'trabalho' : 'trabalhos'}</span>
        )}
      </div>

      {/* Camada 2: Categoria Principal (Identidade) */}
      <div className="flex items-center gap-3 mt-1">
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
          {categoriaPrincipal?.id && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider">
                {categoriaNome}
              </span>
              {categoriaPrincipal.modo === 'MANUAL' && (
                <button 
                  onClick={clearManualMode} 
                  className="text-zinc-400 hover:text-zinc-600 transition-colors ml-1"
                  title="Restaurar identificação automática"
                >
                  <RefreshCcw size={11} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Camada 3: Etapa do Workflow (Espelhamento Direto) */}
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
