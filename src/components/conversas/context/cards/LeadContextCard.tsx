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
    <div className="flex flex-col gap-2">
      {/* Top Card: Highlight */}
      <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
            <Briefcase className="h-3.5 w-3.5 text-[#C9A87C]" />
            <span className="text-[11px] font-semibold">Orçamento • {lead.categoria?.nome || 'Geral'}</span>
          </div>
          <button
            type="button"
            onClick={onOpenCRM}
            className="text-[10px] font-medium text-[#B8925F] hover:bg-[#B8925F]/10 px-2 py-1 rounded transition-colors"
          >
            Ver orçamento
          </button>
        </div>

        <div className="text-[18px] font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          {formatCurrency(lead.valor)}
        </div>

        <div className="flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.04] pt-2 text-[10px]">
          <span className="flex items-center gap-1 text-zinc-500">
            <Clock className="h-3 w-3" /> Enviado em {formatDate(lead.created_at)}
          </span>
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
            <Clock className="h-3 w-3" /> Follow-up ativo
          </span>
        </div>
      </div>

      {/* Bottom Card: Table Data */}
      <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
            Orçamento enviado
          </span>
          <button
            type="button"
            onClick={onOpenCRM}
            className="text-[10px] text-[#B8925F] font-medium"
          >
            Ver detalhes
          </button>
        </div>

        <div className="flex flex-col gap-2.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-zinc-500">Serviço</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"></span>
              {lead.categoria?.nome || 'Sessão Fotográfica'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Valor</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(lead.valor)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Enviado em</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatDate(lead.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Status</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
              {lead.status || 'Aguardando retorno'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
