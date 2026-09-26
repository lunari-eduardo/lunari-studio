import { Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HistoryCardProps {
  cliente: any;
  onNavigate: (path: string) => void;
}

export function HistoryCard({ cliente, onNavigate }: HistoryCardProps) {
  if (!cliente) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Top Card: Última sessão */}
      <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 mb-3">
          <Calendar className="h-3.5 w-3.5 text-[#3B82F6]" />
          <span className="text-[11px] font-semibold">Última sessão • Newborn</span>
        </div>

        <div className="flex gap-3">
          <div className="h-12 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-black/5">
            <img src="https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=150&q=80" alt="Newborn" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <span className="text-[11px] text-zinc-500 flex items-center gap-1.5 mb-1">
              <Calendar className="h-3 w-3" /> 12/04/2025
            </span>
            <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
              <span className="w-3 h-3 flex items-center justify-center">🏠</span> Estúdio
            </span>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => onNavigate(`/clientes/${cliente.id}`)}
              className="text-[10px] font-medium text-[#B8925F] border border-[#B8925F]/30 hover:bg-[#B8925F]/10 px-2.5 py-1.5 rounded transition-colors"
            >
              Ver histórico
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Card: Histórico Recente */}
      <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            Histórico recente
          </span>
          <button
            type="button"
            onClick={() => onNavigate('/workflow')}
            className="text-[10px] text-[#B8925F] font-medium"
          >
            Ver no Workflow
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {/* Item 1 */}
          <div className="flex items-center justify-between p-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-12 bg-zinc-200 dark:bg-zinc-800 rounded md overflow-hidden border border-black/5">
                <img src="https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=100&q=80" alt="Newborn" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">Newborn</span>
                <span className="text-[9px] text-zinc-500">12/04/2025 · Estúdio</span>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          </div>

          {/* Item 2 */}
          <div className="flex items-center justify-between p-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-12 bg-zinc-200 dark:bg-zinc-800 rounded md overflow-hidden border border-black/5">
                <img src="https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=100&q=80" alt="Gestante" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">Gestante</span>
                <span className="text-[9px] text-zinc-500">10/11/2023 · Estúdio</span>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          </div>
        </div>

        <Button
          onClick={() => onNavigate('/workflow/new')}
          className="w-full h-8 mt-3 text-[11px] font-semibold bg-[#FDF8F3] dark:bg-[#C9A87C]/10 text-[#A87E43] dark:text-[#D4AF37] border border-[#C9A87C]/20 hover:bg-[#F9EBDD] dark:hover:bg-[#C9A87C]/20 transition-colors shadow-none"
        >
          <Calendar className="h-3.5 w-3.5 mr-1.5" />
          Agendar nova sessão
        </Button>
      </div>
    </div>
  );
}
