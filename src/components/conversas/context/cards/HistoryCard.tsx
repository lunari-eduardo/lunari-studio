import { History, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HistoryCardProps {
  cliente: any;
  onNavigate: (path: string) => void;
}

export function HistoryCard({ cliente, onNavigate }: HistoryCardProps) {
  if (!cliente) return null;

  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <History className="h-4 w-4 text-[#C9A87C]" />
          <span className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Histórico Recente
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Este cliente já realizou ensaios conosco no passado, mas não possui sessões futuras agendadas.
        </p>

        <Button
          onClick={() => onNavigate(`/clientes/${cliente.id}`)}
          className="w-full h-8 text-xs bg-[#171717] hover:bg-[#2A2A2A] dark:bg-[#EFEFEF] dark:hover:bg-[#FFFFFF] dark:text-[#121212] transition-colors"
        >
          Ver histórico completo <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
