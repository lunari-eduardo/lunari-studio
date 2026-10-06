import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Financials {
  totalMonth: number;
  paidMonth: number;
  remainingMonth: number;
  creditosGerados?: number;
  creditosUtilizados?: number;
  caixaRecebido?: number;
}

interface Props {
  showMetrics: boolean;
  onToggle: (next: boolean) => void;
  financials: Financials;
  sessionCount: number;
  isLoading?: boolean;
}

const formatCurrency = (value: unknown) =>
  `R$ ${(Number(value) || 0).toFixed(2).replace(".", ",")}`;

const Skeleton = ({ w = "w-24" }: { w?: string }) => (
  <span
    className={`inline-block h-7 ${w} rounded-md bg-muted/60 animate-pulse`}
    aria-hidden="true"
  />
);

export function WorkflowMetricsBar({ showMetrics, onToggle, financials, sessionCount, isLoading = false }: Props) {
  if (!showMetrics) {
    return (
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggle(true)}
          className="h-7 px-2 text-xs text-muted-foreground gap-1.5 hover:text-foreground"
        >
          <Eye className="h-3.5 w-3.5" />
          Mostrar métricas
        </Button>
      </div>
    );
  }

  const creditosGerados = Number(financials.creditosGerados) || 0;
  const creditosUtilizados = Number(financials.creditosUtilizados) || 0;

  return (
    <div className="flex items-center gap-6 sm:gap-8 flex-wrap px-1 pt-2 pb-4 relative group">
      
      {/* Receita */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          Receita
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground leading-none">
          {isLoading ? <Skeleton /> : formatCurrency(financials.paidMonth)}
        </span>
      </div>

      <div className="w-[1px] h-8 bg-border/40 hidden sm:block" />

      {/* Previsto */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          Previsto
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground leading-none">
          {isLoading ? <Skeleton /> : formatCurrency(financials.totalMonth)}
        </span>
      </div>

      <div className="w-[1px] h-8 bg-border/40 hidden sm:block" />

      {/* Pendente */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
          Pendente
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground leading-none">
          {isLoading ? <Skeleton /> : formatCurrency(financials.remainingMonth)}
        </span>
      </div>

      {(!isLoading && creditosGerados > 0) && (
        <>
          <div className="w-[1px] h-8 bg-border/40 hidden sm:block" />
          <div className="flex flex-col gap-1.5" title="Crédito gerado por overpayment em sessões deste mês">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Créd. Gerados
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground leading-none">
              {formatCurrency(creditosGerados)}
            </span>
          </div>
        </>
      )}

      {(!isLoading && creditosUtilizados > 0) && (
        <>
          <div className="w-[1px] h-8 bg-border/40 hidden sm:block" />
          <div className="flex flex-col gap-1.5" title="Créditos aplicados como pagamento em sessões deste mês">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Créd. Usados
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground leading-none">
              {formatCurrency(creditosUtilizados)}
            </span>
          </div>
        </>
      )}

      <div className="w-[1px] h-8 bg-border/40 hidden sm:block" />

      {/* Sessões */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          Sessões
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground leading-none">
          {isLoading ? <Skeleton w="w-12" /> : sessionCount}
        </span>
      </div>

      {/* Ocultar (Aparece no hover do container) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onToggle(false)}
        className="h-7 w-7 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Ocultar métricas"
      >
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

