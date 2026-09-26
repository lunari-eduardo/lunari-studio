import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Plus, User, Briefcase, Sparkles } from 'lucide-react';
import type { ChatState } from '@/hooks/useChatStateResolver';

interface QuickActionsCardProps {
  state: ChatState;
  hasCliente: boolean;
  onNavigate: (path: string) => void;
}

export function QuickActionsCard({ state, hasCliente, onNavigate }: QuickActionsCardProps) {
  // Configurar as ações baseado no estado
  const actions = [];

  if (state === 'UNKNOWN') {
    actions.push({ id: 'lead', label: 'Criar Lead', icon: <User className="h-4 w-4" />, path: '/leads' });
    actions.push({ id: 'agenda', label: 'Abrir Agenda', icon: <Calendar className="h-4 w-4" />, path: '/agenda' });
    actions.push({ id: 'orcamento', label: 'Enviar Orçamento', icon: <DollarSign className="h-4 w-4" />, path: '/propostas' });
  } else if (state === 'LEAD') {
    actions.push({ id: 'agenda', label: 'Abrir Agenda', icon: <Calendar className="h-4 w-4" />, path: '/agenda' });
    actions.push({ id: 'tarefa', label: 'Criar Tarefa', icon: <Plus className="h-4 w-4" />, path: '/tarefas' });
  } else if (state === 'SESSION') {
    actions.push({ id: 'pagamento', label: 'Registrar Pagamento', icon: <DollarSign className="h-4 w-4" />, path: '/financas' });
    actions.push({ id: 'workflow', label: 'Abrir Workflow', icon: <Briefcase className="h-4 w-4" />, path: '/workflow' });
    actions.push({ id: 'tarefa', label: 'Criar Tarefa', icon: <Plus className="h-4 w-4" />, path: '/tarefas' });
  } else if (state === 'POST_SALE') {
    actions.push({ id: 'workflow', label: 'Abrir Workflow', icon: <Briefcase className="h-4 w-4" />, path: '/workflow' });
    actions.push({ id: 'tarefa', label: 'Criar Tarefa', icon: <Plus className="h-4 w-4" />, path: '/tarefas' });
  }

  // Sempre tem botão "Mais" no final
  actions.push({ id: 'mais', label: 'Mais', icon: <span className="font-serif tracking-widest leading-none mb-1 text-lg">...</span>, path: '/clientes' });

  return (
    <div className="mt-2 mb-2">
      <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2.5 px-1">
        <Sparkles className="h-3.5 w-3.5 text-[#C9A87C]" /> Ações rápidas
      </span>
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
        {actions.map((act) => (
          <button
            key={act.id}
            onClick={() => onNavigate(act.path)}
            className="flex flex-col items-center justify-center gap-1.5 flex-1 min-w-[76px] py-2.5 px-1 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.03] hover:bg-[#D4AF37]/10 transition-colors text-[#A87E43] dark:text-[#D4AF37]"
          >
            {act.icon}
            <span className="text-[10px] font-medium leading-tight text-center px-1">
              {act.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
