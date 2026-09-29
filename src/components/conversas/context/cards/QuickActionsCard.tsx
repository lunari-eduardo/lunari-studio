import { Calendar, DollarSign, Briefcase, Sparkles, User, Link } from 'lucide-react';
import type { ChatState } from '@/hooks/useChatStateResolver';

interface QuickActionsCardProps {
  state: ChatState;
  hasCliente: boolean;
  onNavigate: (path: string) => void;
  onCreateLead?: () => void;
  onOpenWorkflow?: () => void;
  onOpenPayment?: () => void;
  onOpenChargeLink?: () => void;
}

export function QuickActionsCard({ state, hasCliente, onNavigate, onCreateLead, onOpenWorkflow, onOpenPayment, onOpenChargeLink }: QuickActionsCardProps) {
  const actions = [];

  if (state === 'UNKNOWN') {
    actions.push({ id: 'lead', label: 'Criar Lead', icon: <User className="h-4 w-4" />, onClick: onCreateLead || (() => onNavigate('/app/leads')) });
    actions.push({ id: 'agenda', label: 'Abrir Agenda', icon: <Calendar className="h-4 w-4" />, onClick: () => onNavigate('/app/agenda') });
    actions.push({ id: 'orcamento', label: 'Enviar Orçamento', icon: <DollarSign className="h-4 w-4" />, onClick: () => onNavigate('/app/comercial') });
  } else if (state === 'ACTIVE_LEAD') {
    actions.push({ id: 'agenda', label: 'Abrir Agenda', icon: <Calendar className="h-4 w-4" />, onClick: () => onNavigate('/app/agenda') });
    actions.push({ id: 'orcamento', label: 'Enviar Orçamento', icon: <DollarSign className="h-4 w-4" />, onClick: () => onNavigate('/app/comercial') });
  } else if (state === 'ACTIVE_SESSION') {
    actions.push({ id: 'pagamento', label: 'Registrar Pagamento', icon: <DollarSign className="h-4 w-4" />, onClick: onOpenPayment });
    actions.push({ id: 'workflow', label: 'Abrir Workflow', icon: <Briefcase className="h-4 w-4" />, onClick: onOpenWorkflow });
    actions.push({ id: 'charge', label: 'Cobrar via link', icon: <Link className="h-4 w-4" />, onClick: onOpenChargeLink });
  } else if (state === 'CLIENT') {
    actions.push({ id: 'lead', label: 'Criar Oportunidade', icon: <User className="h-4 w-4" />, onClick: onCreateLead || (() => onNavigate('/app/leads')) });
    actions.push({ id: 'workflow', label: 'Abrir Workflow', icon: <Briefcase className="h-4 w-4" />, onClick: onOpenWorkflow });
    actions.push({ id: 'agenda', label: 'Nova Sessão', icon: <Calendar className="h-4 w-4" />, onClick: () => onNavigate('/app/agenda') });
  }

  return (
    <div className="mt-2 mb-2">
      <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-2.5 px-1">
        <Sparkles className="h-3.5 w-3.5 text-[#C9A87C]" /> Ações rápidas
      </span>
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
        {actions.map((act) => (
          <button
            key={act.id}
            onClick={act.onClick}
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
