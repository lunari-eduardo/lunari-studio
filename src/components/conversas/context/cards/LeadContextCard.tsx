import { FileText, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeadContextCardProps {
  lead: any;
  onOpenCRM: () => void;
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calculateDaysAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'há 1 dia';
  return `há ${diffDays} dias`;
}

export function LeadContextCard({ lead, onOpenCRM }: LeadContextCardProps) {
  if (!lead) return null;

  const title = `Orçamento · ${lead.categoria?.nome || 'Geral'}`;
  const daysAgo = calculateDaysAgo(lead.created_at);
  const followUpDays = lead.diasSemInteracao || 0; // fallback para dias sem interação

  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col gap-3">
      
      <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
        <FileText className="h-3.5 w-3.5 text-[#C9A87C]" />
        <span className="text-[12px] font-semibold">{title}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[18px] font-bold text-zinc-900 dark:text-zinc-100">
          {formatCurrency(lead.valor)}
        </span>
        <button
          type="button"
          onClick={onOpenCRM}
          className="text-[10px] font-medium text-amber-700 dark:text-[#C9A87C] bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 px-2 py-1 rounded transition-colors border border-amber-200/50 dark:border-amber-500/20"
        >
          Ver orçamento
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-black/[0.04] dark:border-white/[0.04] pt-2 text-[10px]">
        <span className="flex items-center gap-1 text-zinc-500">
          <Clock className="h-3 w-3" /> 
          Enviado {daysAgo}
        </span>
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500 font-medium">
          <Clock className="h-3 w-3" /> 
          {followUpDays > 0 ? `Follow-up em ${followUpDays} ${followUpDays === 1 ? 'dia' : 'dias'}` : 'Follow-up ativo'}
        </span>
      </div>
    </div>
  );
}
