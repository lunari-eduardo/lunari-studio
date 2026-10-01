import { useState } from 'react';
import { CalendarDays, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import type { ContextSessao } from '@/hooks/useConversasContactContext';
import { cn } from '@/lib/utils';

interface SessionHistoryListProps {
  sessoes: ContextSessao[];
  onOpenWorkflow: (sessionId?: string) => void;
}

export function SessionHistoryList({ sessoes, onOpenWorkflow }: SessionHistoryListProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sessoes || sessoes.length === 0) return null;

  return (
    <div className={cn(
      "flex flex-col rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all overflow-hidden",
      isOpen && "pb-1"
    )}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <CalendarDays className="h-4 w-4 text-zinc-400" />
          <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
            Histórico de trabalhos · {sessoes.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </div>
      
      {isOpen && (
        <div className="px-3 pb-2 flex flex-col gap-2">
          {sessoes.slice(0, 5).map((sessao) => (
            <div 
              key={sessao.id}
              onClick={() => onOpenWorkflow(sessao.session_id || sessao.id)}
              className="group flex flex-col gap-1.5 p-2.5 rounded-lg border border-black/[0.04] dark:border-white/[0.05] bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <span className="text-[12px] font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
                  {sessao.categoria || 'Sessão'} {sessao.pacote ? `- ${sessao.pacote}` : ''}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-zinc-400 hover:text-[#B8925F] transition-colors p-0.5 opacity-0 group-hover:opacity-100" />
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>
                  {sessao.data_sessao ? new Date(sessao.data_sessao).toLocaleDateString('pt-BR') : 'Sem data'}
                </span>
                <span className="capitalize px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/5">{sessao.status || 'Concluída'}</span>
              </div>
            </div>
          ))}
          {sessoes.length > 5 && (
            <div className="text-center mt-1">
              <span className="text-[10px] text-zinc-400 italic">+{sessoes.length - 5} sessões</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

