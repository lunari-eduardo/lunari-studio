import { Calendar, FileText, ChevronRight, User, AlignLeft, CreditCard, Clock, MoreVertical, Star, MoreHorizontal, Package } from 'lucide-react';
import type { ContextSessao, ContextOrcamento } from '@/hooks/useConversasContactContext';
import { formatDateForDisplay, parseDateFromStorage } from '@/utils/dateUtils';

interface SmartSessionCardProps {
  sessoes: ContextSessao[];
  orcamentos?: ContextOrcamento[];
  onOpenWorkflow: (sessionId?: string) => void;
  onNavigate?: (path: string) => void;
}

export function SmartSessionCard({ sessoes, orcamentos = [], onOpenWorkflow, onNavigate }: SmartSessionCardProps) {
  if ((!sessoes || sessoes.length === 0) && (!orcamentos || orcamentos.length === 0)) return null;

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const validSessions = sessoes.filter(s => !!s.data_sessao);

  // Futuras: data >= hoje, ordenadas de forma CRESCENTE (mais próxima primeiro)
  const futureSessions = validSessions
    .filter(s => s.data_sessao.slice(0, 10) >= todayIso)
    .sort((a, b) => a.data_sessao.slice(0, 10).localeCompare(b.data_sessao.slice(0, 10)));

  // Passadas: data < hoje, ordenadas de forma DECRESCENTE (mais recente primeiro)
  const pastSessions = validSessions
    .filter(s => s.data_sessao.slice(0, 10) < todayIso)
    .sort((a, b) => b.data_sessao.slice(0, 10).localeCompare(a.data_sessao.slice(0, 10)));

  const nextSession = futureSessions[0] || null;
  const lastSession = pastSessions[0] || (futureSessions.length === 0 && validSessions.length > 0 ? validSessions[0] : null);
  const mainOrcamento = orcamentos.length > 0 ? orcamentos[0] : null;

  const formatDisplayDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Sem data';
    const cleanDate = dateStr.slice(0, 10);
    const brDate = formatDateForDisplay(cleanDate);
    if (brDate) return brDate;
    const d = parseDateFromStorage(cleanDate);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
    return dateStr;
  };

  const isPaid = (total: number | null, pago: number | null) => {
    return pago !== null && total !== null && pago >= total && total > 0;
  };

  // 1. Mostrar Próxima Sessão
  if (nextSession) {
    return (
      <div 
        onClick={() => onOpenWorkflow(nextSession.id)}
        className="rounded-xl md:rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#131718] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-sm cursor-pointer hover:border-black/[0.12] dark:hover:border-white/15 transition-all group flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-[#38BDF8]">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Próxima sessão</span>
          </div>
          <button 
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors p-0.5 rounded"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-[84px_1fr] gap-x-2 gap-y-2 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <User className="h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0" /> Categoria
          </span>
          <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">{nextSession.categoria || 'Não definida'}</span>
          
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Package className="h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0" /> Pacote
          </span>
          <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">{nextSession.pacote || 'Não definido'}</span>
          
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <AlignLeft className="h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0" /> Descrição
          </span>
          <span className="text-zinc-800 dark:text-zinc-200 line-clamp-2">{nextSession.local_ensaio || 'Ensaio fotográfico'}</span>
        </div>

        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs mt-1">
          <Calendar className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
          <span>{formatDisplayDate(nextSession.data_sessao)}{nextSession.hora_sessao ? ` · ${nextSession.hora_sessao.slice(0, 5)}` : ''}</span>
        </div>

        <div className="pt-2.5 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Agendada
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors" />
        </div>
      </div>
    );
  }

  // 2. Mostrar Orçamento (Se não tem próxima sessão)
  if (mainOrcamento) {
    return (
      <div 
        onClick={() => onNavigate?.('/propostas')}
        className="rounded-xl md:rounded-2xl border border-amber-500/20 dark:border-[#F59E0B]/20 bg-amber-500/[0.03] dark:bg-[#171410] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-sm cursor-pointer hover:border-amber-500/30 transition-all flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-[#FBBF24]">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Orçamento enviado</span>
          </div>
          <button 
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors p-0.5 rounded"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-[84px_1fr] gap-x-2 gap-y-2 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <User className="h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0" /> Categoria
          </span>
          <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">Geral</span>
          
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Package className="h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0" /> Pacote
          </span>
          <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">{mainOrcamento.title || 'Orçamento Base'}</span>
          
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0" /> Enviado em
          </span>
          <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">{formatDisplayDate(mainOrcamento.date)}</span>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center gap-1.5 bg-[#8B5CF6]/10 text-[#8B5CF6] dark:text-[#A78BFA] px-2.5 py-1 rounded-md text-xs font-medium w-fit border border-[#8B5CF6]/20">
            <Star className="h-3 w-3 fill-current" />
            Orçamento enviado
          </div>
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-[#F59E0B] text-xs font-medium">
            <Clock className="h-3.5 w-3.5" />
            Follow-up pendente
          </div>
        </div>

        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate?.('/propostas');
          }}
          className="mt-2 w-full py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-[#FBBF24] border border-amber-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          Ver orçamento
        </button>
      </div>
    );
  }

  // 3. Mostrar Última Sessão
  if (lastSession) {
    const isSessionPaid = isPaid(lastSession.valor_total, lastSession.valor_pago);
    
    return (
      <div 
        onClick={() => onOpenWorkflow(lastSession.id)}
        className="rounded-xl md:rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#11141A] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-sm cursor-pointer hover:border-black/[0.12] dark:hover:border-white/15 transition-all group flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-[#60A5FA]">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Última sessão</span>
          </div>
          <button 
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors p-0.5 rounded"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-[84px_1fr] gap-x-2 gap-y-2 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <User className="h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0" /> Categoria
          </span>
          <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">{lastSession.categoria || 'Não definida'}</span>
          
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Package className="h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0" /> Pacote
          </span>
          <span className="text-zinc-800 dark:text-zinc-200 font-medium truncate">{lastSession.pacote || 'Não definido'}</span>
          
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <AlignLeft className="h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0" /> Descrição
          </span>
          <span className="text-zinc-800 dark:text-zinc-200 line-clamp-2">{lastSession.local_ensaio || 'Ensaio fotográfico concluído'}</span>
        </div>

        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs mt-1">
          <Calendar className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
          <span>{formatDisplayDate(lastSession.data_sessao)}</span>
        </div>

        <div className="flex items-center justify-between text-xs py-2 border-y border-black/[0.05] dark:border-white/[0.06] mt-1">
          <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" /> Pagamento
          </span>
          {isSessionPaid ? (
            <span className="text-emerald-600 dark:text-[#10B981] font-semibold">Pago</span>
          ) : (
            <span className="text-amber-600 dark:text-[#F59E0B] font-semibold">Pendente</span>
          )}
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Concluída
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300 transition-colors" />
        </div>
      </div>
    );
  }

  return null;
}


