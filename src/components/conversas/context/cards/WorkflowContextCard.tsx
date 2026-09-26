import { Camera, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkflowContextCardProps {
  sessao: any;
  onOpenWorkflow: () => void;
}

function formatDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Data a definir';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export function WorkflowContextCard({ sessao, onOpenWorkflow }: WorkflowContextCardProps) {
  if (!sessao) return null;

  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-[#C9A87C]" />
          <span className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
            Próxima Sessão
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {sessao.capa_url && (
          <div className="w-full h-24 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            <img src={sessao.capa_url} alt="Capa" className="w-full h-full object-cover" />
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
            {sessao.nome || 'Sessão Fotográfica'}
          </h4>
          <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium border border-emerald-100 dark:border-emerald-800">
            {sessao.status?.replace('_', ' ')}
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <span className="truncate capitalize">{formatDateFull(sessao.data_ensaio)}</span>
          </div>
          {sessao.local_ensaio && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <span className="truncate">{sessao.local_ensaio}</span>
            </div>
          )}
        </div>

        <Button
          onClick={onOpenWorkflow}
          className="w-full h-8 text-xs bg-[#171717] hover:bg-[#2A2A2A] dark:bg-[#EFEFEF] dark:hover:bg-[#FFFFFF] dark:text-[#121212] transition-colors mt-2"
        >
          Abrir Workflow <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
