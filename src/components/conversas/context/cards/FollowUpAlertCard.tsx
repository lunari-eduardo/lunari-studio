import { AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowUpAlertCardProps {
  daysIgnored: number;
}

export function FollowUpAlertCard({ daysIgnored }: FollowUpAlertCardProps) {
  return (
    <div className={cn(
      "rounded-xl border p-3 flex flex-col gap-2 transition-all shadow-sm",
      daysIgnored >= 7 
        ? "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20"
        : "border-zinc-200 bg-zinc-50 dark:border-zinc-800/40 dark:bg-zinc-900/40"
    )}>
      <div className="flex items-start gap-2.5">
        <div className={cn(
          "p-1.5 rounded-full shrink-0",
          daysIgnored >= 7 ? "bg-red-100 dark:bg-red-900/50" : "bg-zinc-100 dark:bg-zinc-800/50"
        )}>
          {daysIgnored >= 7 ? (
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          ) : (
            <Clock className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          )}
        </div>
        <div>
          <h4 className={cn(
            "text-xs font-semibold",
            daysIgnored >= 7 ? "text-red-900 dark:text-red-100" : "text-zinc-900 dark:text-zinc-100"
          )}>
            Acompanhamento Pendente
          </h4>
          <p className={cn(
            "text-[11px] mt-0.5 leading-relaxed",
            daysIgnored >= 7 ? "text-red-700 dark:text-red-300" : "text-zinc-600 dark:text-zinc-400"
          )}>
            O cliente não respondeu ao orçamento há <strong>{daysIgnored} dias</strong>. Sugerimos enviar uma mensagem de acompanhamento ou encerrar a oportunidade.
          </p>
        </div>
      </div>
    </div>
  );
}
