import { Calendar, FileText, ChevronRight, User, AlignLeft, CreditCard, Clock, MoreVertical, Star, MoreHorizontal } from 'lucide-react';
import type { ContextSessao, ContextOrcamento } from '@/hooks/useConversasContactContext';

interface SmartSessionCardProps {
  sessoes: ContextSessao[];
  orcamentos?: ContextOrcamento[];
  onOpenWorkflow: (sessionId?: string) => void;
  onNavigate?: (path: string) => void;
}

export function SmartSessionCard({ sessoes, orcamentos = [], onOpenWorkflow, onNavigate }: SmartSessionCardProps) {
  if ((!sessoes || sessoes.length === 0) && (!orcamentos || orcamentos.length === 0)) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureSessions = sessoes.filter(s => {
    if (!s.data_sessao) return false;
    const d = new Date(s.data_sessao);
    if (isNaN(d.getTime())) return false;
    return d >= today;
  });
  
  const pastSessions = sessoes.filter(s => {
    if (!s.data_sessao) return true;
    const d = new Date(s.data_sessao);
    if (isNaN(d.getTime())) return true;
    return d < today;
  });

  const nextSession = futureSessions.length > 0 ? futureSessions[futureSessions.length - 1] : null;
  const lastSession = pastSessions.length > 0 ? pastSessions[0] : null;
  const mainOrcamento = orcamentos.length > 0 ? orcamentos[0] : null;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Sem data';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Sem data';
    return d.toLocaleDateString('pt-BR');
  };

  const isPaid = (total: number | null, pago: number | null) => {
    return pago !== null && total !== null && pago >= total && total > 0;
  };

  // 1. Mostrar Próxima Sessão
  if (nextSession) {
    return (
      <div 
        onClick={() => onOpenWorkflow(nextSession.id)}
        className="rounded-2xl bg-[#131718] border border-white/5 p-4 shadow-sm cursor-pointer hover:border-white/10 transition-colors group flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#0EA5E9]/10">
              <Calendar className="h-4 w-4 text-[#38BDF8]" />
            </div>
            <span className="text-sm font-semibold text-zinc-100">Próxima sessão</span>
          </div>
          <button className="text-zinc-500 hover:text-zinc-300">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-2 text-xs">
          <span className="text-zinc-500 flex items-center gap-1.5"><User className="h-3 w-3" /> Categoria</span>
          <span className="text-zinc-300">{nextSession.categoria || 'Não definida'}</span>
          
          <span className="text-zinc-500 flex items-center gap-1.5">Pacote</span>
          <span className="text-zinc-300">{nextSession.pacote || 'Não definido'}</span>
          
          <span className="text-zinc-500 flex items-center gap-1.5"><AlignLeft className="h-3 w-3" /> Descrição</span>
          <span className="text-zinc-300 line-clamp-2">{nextSession.local_ensaio || 'Ensaio fotográfico'}</span>
        </div>

        <div className="flex items-center gap-2 text-zinc-400 text-xs mt-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(nextSession.data_sessao)}{nextSession.hora_sessao ? ` · ${nextSession.hora_sessao.slice(0, 5)}` : ''}</span>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5 bg-[#10B981]/10 text-[#10B981] px-2.5 py-1 rounded-full text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Agendada
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
        </div>
      </div>
    );
  }

  // 2. Mostrar Orçamento (Se não tem próxima sessão)
  if (mainOrcamento) {
    return (
      <div className="rounded-2xl bg-[#171410] border border-[#F59E0B]/10 p-4 shadow-sm cursor-pointer hover:border-[#F59E0B]/20 transition-colors flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#F59E0B]/10">
              <FileText className="h-4 w-4 text-[#FBBF24]" />
            </div>
            <span className="text-sm font-semibold text-zinc-100">Orçamento enviado</span>
          </div>
          <button className="text-zinc-500 hover:text-zinc-300">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-2 text-xs">
          <span className="text-zinc-500 flex items-center gap-1.5"><User className="h-3 w-3" /> Categoria</span>
          <span className="text-zinc-300">Geral</span>
          
          <span className="text-zinc-500 flex items-center gap-1.5">Pacote</span>
          <span className="text-zinc-300">{mainOrcamento.title || 'Orçamento Base'}</span>
          
          <span className="text-zinc-500 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Enviado em</span>
          <span className="text-zinc-300">{formatDate(mainOrcamento.date)}</span>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center gap-1.5 bg-[#8B5CF6]/10 text-[#A78BFA] px-2.5 py-1 rounded-md text-xs font-medium w-fit">
            <Star className="h-3 w-3 fill-current" />
            Orçamento enviado
          </div>
          <div className="flex items-center gap-1.5 text-[#F59E0B] text-xs font-medium">
            <Clock className="h-3.5 w-3.5" />
            Follow-up pendente
          </div>
        </div>

        <button 
          onClick={() => onNavigate?.('/propostas')}
          className="mt-2 w-full py-2 rounded-lg bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
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
        className="rounded-2xl bg-[#11141A] border border-white/5 p-4 shadow-sm cursor-pointer hover:border-white/10 transition-colors group flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#3B82F6]/10">
              <Calendar className="h-4 w-4 text-[#60A5FA]" />
            </div>
            <span className="text-sm font-semibold text-zinc-100">Última sessão</span>
          </div>
          <button className="text-zinc-500 hover:text-zinc-300">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-2 text-xs">
          <span className="text-zinc-500 flex items-center gap-1.5"><User className="h-3 w-3" /> Categoria</span>
          <span className="text-zinc-300">{lastSession.categoria || 'Não definida'}</span>
          
          <span className="text-zinc-500 flex items-center gap-1.5">Pacote</span>
          <span className="text-zinc-300">{lastSession.pacote || 'Não definido'}</span>
          
          <span className="text-zinc-500 flex items-center gap-1.5"><AlignLeft className="h-3 w-3" /> Descrição</span>
          <span className="text-zinc-300 line-clamp-2">{lastSession.local_ensaio || 'Ensaio fotográfico concluído'}</span>
        </div>

        <div className="flex items-center gap-2 text-zinc-400 text-xs mt-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(lastSession.data_sessao)}</span>
        </div>

        <div className="flex items-center justify-between text-xs py-2 border-y border-white/5 mt-1">
          <span className="text-zinc-500 flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Pagamento</span>
          {isSessionPaid ? (
            <span className="text-[#10B981] font-semibold">Pago</span>
          ) : (
            <span className="text-[#F59E0B] font-semibold">Pendente</span>
          )}
        </div>

        <div className="pt-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-[#10B981]/10 text-[#10B981] px-2.5 py-1 rounded-full text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Concluída
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
        </div>
      </div>
    );
  }

  return null;
}

