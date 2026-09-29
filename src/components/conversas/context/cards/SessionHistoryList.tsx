import { useState } from 'react';
import { CalendarDays, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import type { ContextSessao } from '@/hooks/useConversasContactContext';

interface SessionHistoryListProps {
  sessoes: ContextSessao[];
  onOpenWorkflow: (sessionId?: string) => void;
}

export function SessionHistoryList({ sessoes, onOpenWorkflow }: SessionHistoryListProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sessoes || sessoes.length === 0) return null;

  return (
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between outline-none"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
            Histórico de Trabalhos ({sessoes.length})
          </span>
        </div>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
      </button>
      
      {isOpen && (
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
      
      <div className="flex flex-col gap-2">
        {sessoes.slice(0, 3).map((sessao) => (
          <div 
            key={sessao.id}
            onClick={() => onOpenWorkflow(sessao.session_id || sessao.id)}
            className="group flex flex-col gap-1 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] border border-transparent hover:border-black/[0.05] dark:hover:border-white/[0.05] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                {sessao.categoria || 'Sessão'}
              </span>
              <ExternalLink className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <span>
                {sessao.data_sessao ? new Date(sessao.data_sessao).toLocaleDateString('pt-BR') : 'Sem data'}
              </span>
              <span className="capitalize">{sessao.status || 'Concluída'}</span>
            </div>
          </div>
        ))}
        {sessoes.length > 3 && (
          <div className="text-center mt-1">
            <span className="text-[10px] text-zinc-400 italic">+{sessoes.length - 3} sessões anteriores</span>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}

