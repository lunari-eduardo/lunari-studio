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
        : "border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/20"
    )}>
      <div className="flex items-start gap-2.5">
        <div className={cn(
          "p-1.5 rounded-full shrink-0",
          daysIgnored >= 7 ? "bg-red-100 dark:bg-red-900/50" : "bg-orange-100 dark:bg-orange-900/50"
        )}>
          {daysIgnored >= 7 ? (
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          ) : (
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          )}
        </div>
        <div>
          <h4 className={cn(
            "text-xs font-semibold",
            daysIgnored >= 7 ? "text-red-900 dark:text-red-100" : "text-orange-900 dark:text-orange-100"
          )}>
            Acompanhamento Pendente
          </h4>
          <p className={cn(
            "text-[11px] mt-0.5 leading-relaxed",
            daysIgnored >= 7 ? "text-red-700 dark:text-red-300" : "text-orange-700 dark:text-orange-300"
          )}>
            O cliente não respondeu ao orçamento há <strong>{daysIgnored} dias</strong>. Sugerimos enviar uma mensagem de acompanhamento ou encerrar a oportunidade.
          </p>
        </div>
      </div>
    </div>
  );
}
