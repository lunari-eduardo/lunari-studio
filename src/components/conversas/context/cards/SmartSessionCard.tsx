import { Calendar, Camera, ChevronRight, Clock, MapPin } from 'lucide-react';
import type { ContextSessao } from '@/hooks/useConversasContactContext';

interface SmartSessionCardProps {
  sessoes: ContextSessao[];
  onOpenWorkflow: (sessionId?: string) => void;
}

export function SmartSessionCard({ sessoes, onOpenWorkflow }: SmartSessionCardProps) {
  if (!sessoes || sessoes.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureSessions = sessoes.filter(s => new Date(s.data_sessao) >= today);
  const pastSessions = sessoes.filter(s => new Date(s.data_sessao) < today);

  // A mais próxima do futuro é a última do array de futuras (já que vem DESC do banco)
  const nextSession = futureSessions.length > 0 ? futureSessions[futureSessions.length - 1] : null;
  // A mais recente do passado é a primeira do array de passadas
  const lastSession = pastSessions.length > 0 ? pastSessions[0] : null;

  const mainSession = nextSession || lastSession;
  const isFuture = !!nextSession;

  if (!mainSession) return null;

  // Histórico exclui a sessão principal e pega as 3 mais recentes
  const historySessions = sessoes
    .filter(s => s.id !== mainSession.id)
    .slice(0, 3);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="flex flex-col gap-2">
      {/* ─── Main Session (Próxima ou Última) ─── */}
      <div 
        onClick={() => onOpenWorkflow(mainSession.id)}
        className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer hover:border-black/[0.12] dark:hover:border-white/[0.12] transition-colors group"
      >
        <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 mb-2">
          {isFuture ? (
            <Camera className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
          ) : (
            <Calendar className="h-3.5 w-3.5 text-[#3B82F6]" />
          )}
          <span className="text-[11px] font-semibold">
            {isFuture ? 'Próxima sessão' : 'Última sessão'} • {mainSession.pacote || mainSession.categoria || 'Sessão'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1 flex flex-col gap-1.5">
            <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> 
              {formatDate(mainSession.data_sessao)}
              {isFuture && mainSession.hora_sessao && ` às ${mainSession.hora_sessao.slice(0, 5)}`}
            </span>
            <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> 
              {mainSession.local_ensaio || 'Estúdio'}
            </span>
          </div>
          
          <div className="flex items-center pl-2">
            <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors" />
          </div>
        </div>
      </div>

      {/* ─── Histórico Recente ─── */}
      {historySessions.length > 0 && (
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              Histórico recente
            </span>
            <button
              type="button"
              onClick={() => onOpenWorkflow()}
              className="text-[10px] text-[#B8925F] font-medium hover:underline"
            >
              Ver Workflow
            </button>
          </div>

          <div className="flex flex-col gap-1">
            {historySessions.map(sessao => (
              <div 
                key={sessao.id}
                onClick={() => onOpenWorkflow(sessao.id)}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {sessao.pacote || sessao.categoria || 'Sessão'}
                  </span>
                  <span className="text-[9px] text-zinc-500 flex items-center gap-1">
                    {formatDate(sessao.data_sessao)} • {sessao.local_ensaio || 'Estúdio'}
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
