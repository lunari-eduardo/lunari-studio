import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, ExternalLink, Plus, User, Image } from 'lucide-react';
import type { ChatState } from '@/hooks/useChatStateResolver';

interface QuickActionsCardProps {
  state: ChatState;
  hasCliente: boolean;
  onNavigate: (path: string) => void;
}

export function QuickActionsCard({ state, hasCliente, onNavigate }: QuickActionsCardProps) {
  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-2">
        Ações Rápidas
      </span>
      <div className="grid grid-cols-1 gap-1.5">
        {(state === 'UNKNOWN' || state === 'LEAD') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/propostas')}
            className="w-full justify-between text-xs h-8 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-[#C9A87C]" />
              {state === 'UNKNOWN' ? 'Enviar Orçamento' : 'Atualizar Orçamento'}
            </span>
            <ExternalLink className="h-3 w-3 text-zinc-400" />
          </Button>
        )}

        {(state === 'UNKNOWN' || state === 'LEAD') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/agenda')}
            className="w-full justify-between text-xs h-8 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-[#C9A87C]" />
              Abrir Agenda
            </span>
            <ExternalLink className="h-3 w-3 text-zinc-400" />
          </Button>
        )}

        {state === 'SESSION' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/financas/receitas')}
            className="w-full justify-between text-xs h-8 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              Registrar Pagamento
            </span>
            <ExternalLink className="h-3 w-3 text-zinc-400" />
          </Button>
        )}

        {hasCliente && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/clientes')}
            className="w-full justify-between text-xs h-8 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-[#C9A87C]" />
              Ficha do Cliente
            </span>
            <ExternalLink className="h-3 w-3 text-zinc-400" />
          </Button>
        )}
      </div>
    </div>
  );
}
