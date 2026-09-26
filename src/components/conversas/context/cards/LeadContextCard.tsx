import { Briefcase, Calendar, Clock, DollarSign, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeadContextCardProps {
  lead: any;
  onOpenCRM: () => void;
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function LeadContextCard({ lead, onOpenCRM }: LeadContextCardProps) {
  if (!lead) return null;

  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-4 w-4 text-[#C9A87C]" />
          <span className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Oportunidade Comercial
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenCRM}
          className="text-[11px] text-[#B8925F] dark:text-[#D4AF37] hover:underline flex items-center gap-0.5"
        >
          Ver CRM <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
            {lead.nome}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium border border-blue-100 dark:border-blue-800">
              {lead.status}
            </span>
            <span className="text-zinc-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Follow-up ativo
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-50 dark:bg-[#202020] rounded-lg border border-black/[0.03] dark:border-white/[0.03]">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Valor</span>
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-zinc-400" />
              {formatCurrency(lead.valor)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Data Início</span>
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-zinc-400" />
              {formatDate(lead.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
