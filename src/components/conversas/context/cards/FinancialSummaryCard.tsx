import { DollarSign } from 'lucide-react';

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
        <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-[#B8925F]" />
          Financeiro da sessão
        </span>
        <button
          type="button"
          onClick={() => onNavigate('/financas')}
          className="text-[10px] text-[#B8925F] font-medium"
        >
          Ver detalhes
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-zinc-500">Total</span>
          <span className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(total)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-zinc-500">Recebido</span>
          <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-500">{formatCurrency(totalRecebido)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-zinc-500">Pendente</span>
          <span className="text-[12px] font-bold text-red-600 dark:text-red-500">{formatCurrency(totalPendente)}</span>
        </div>
      </div>
    </div>
  );
}
