import { DollarSign, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FinancialSummaryCardProps {
  cobrancas: any[];
  onNavigate: (path: string) => void;
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function FinancialSummaryCard({ cobrancas, onNavigate }: FinancialSummaryCardProps) {
  const totalPendente = cobrancas
    .filter(c => c.status === 'pendente' || c.status === 'vencida')
    .reduce((acc, curr) => acc + (curr.valor || 0), 0);

  const totalRecebido = cobrancas
    .filter(c => c.status === 'paga')
    .reduce((acc, curr) => acc + (curr.valor || 0), 0);

  const total = totalPendente + totalRecebido;

  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Resumo Financeiro
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Valor Total Contratado</span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(total)}</span>
        </div>
        
        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-500">
          <span className="text-xs font-medium">Já Recebido</span>
          <span className="text-xs font-bold">{formatCurrency(totalRecebido)}</span>
        </div>
        
        {totalPendente > 0 && (
          <div className="flex items-center justify-between text-red-600 dark:text-red-400">
            <span className="text-xs font-medium">Pendente</span>
            <span className="text-xs font-bold">{formatCurrency(totalPendente)}</span>
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onNavigate('/financas')}
          className="w-full h-7 mt-2 text-[11px]"
        >
          Ver detalhes <ExternalLink className="h-3 w-3 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
