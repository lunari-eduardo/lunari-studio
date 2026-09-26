import { Camera, Calendar, ChevronRight } from 'lucide-react';

interface WorkflowContextCardProps {
  sessao: any;
  onOpenWorkflow: () => void;
}

export function WorkflowContextCard({ sessao, onOpenWorkflow }: WorkflowContextCardProps) {
  if (!sessao) return null;

  return (
    <div 
      onClick={onOpenWorkflow}
      className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer hover:border-black/[0.12] dark:hover:border-white/[0.12] transition-colors group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
          <Camera className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
          <span className="text-[11px] font-semibold">Próxima sessão • {sessao.categoria || sessao.nome || 'Gestante Premium'}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-14 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-black/5">
          <img 
            src={sessao.capa_url || "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=100&q=80"} 
            alt="Sessão" 
            className="w-full h-full object-cover" 
          />
        </div>
        
        <div className="flex-1 flex flex-col justify-center gap-1.5">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> 
            {sessao.data_ensaio ? new Date(sessao.data_ensaio).toLocaleDateString('pt-BR') : '22/09/2025'} - 14:00
          </span>
          <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <span className="w-3 h-3 flex items-center justify-center">🏠</span> 
            {sessao.local_ensaio || 'Estúdio'}
          </span>
        </div>
        
        <div className="flex items-center pl-2">
          <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors" />
        </div>
      </div>
    </div>
  );
}
