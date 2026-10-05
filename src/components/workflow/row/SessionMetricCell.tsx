import { SessionCreditBadge } from "@/components/finance/SessionCreditBadge";
import { useSessionCreditContext } from "@/hooks/useSessionCreditContext";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface SessionMetricCellProps {
  sessionId: string | null;
  clienteId: string | null;
  pendente: number;
  formatCurrency: (v: number) => string;
  className?: string;
}

export function SessionMetricCell({
  sessionId,
  clienteId,
  pendente,
  formatCurrency,
  className
}: SessionMetricCellProps) {
  const { data: ctx } = useSessionCreditContext(sessionId);
  const generated = ctx?.generatedBySession ?? 0;
  const showBadge = generated > 0 && clienteId;

  return (
    <div className={cn("flex flex-col min-w-0 min-h-[40px] justify-center items-end", className)}>
      {showBadge ? (
        <SessionCreditBadge
          clienteId={clienteId as string}
          sessionId={sessionId}
          sessionPendente={Math.max(0, pendente)}
        />
      ) : pendente > 0.001 ? (
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-1">
            Faltando
          </span>
          <span className="text-sm font-semibold text-destructive tabular-nums leading-none">
            {formatCurrency(Math.max(0, pendente))}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-end">
          <span 
            className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
            title="Quitado"
          >
            <CheckCircle2 className="h-3 w-3" />
            Pago
          </span>
        </div>
      )}
    </div>
  );
}

