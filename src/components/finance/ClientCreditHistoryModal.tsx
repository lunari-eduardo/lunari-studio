import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useClienteCredito,
  useRevokeClientCredit,
  ClienteCreditoLedgerRow,
} from "@/hooks/useClienteCredito";
import { formatCurrency } from "@/utils/currencyUtils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Wallet,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClientCreditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
}

function getOrigemBadge(origem: string, valor: number) {
  switch (origem) {
    case "estorno_para_credito":
      return {
        label: "Cancelamento de Sessão",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    case "ajuste_manual":
      return {
        label: valor > 0 ? "Crédito Manual" : "Ajuste de Saldo",
        className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
      };
    case "overpay":
      return {
        label: "Pagamento a Maior",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    case "consumo_desconto":
      return {
        label: "Utilizado em Sessão",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    case "reversao_grant":
      return {
        label: "Estorno / Remoção",
        className: "bg-destructive/10 text-destructive border-destructive/20",
      };
    case "reversao_consumo":
      return {
        label: "Estorno de Consumo",
        className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
      };
    case "expiracao":
      return {
        label: "Expirado",
        className: "bg-muted text-muted-foreground border-border",
      };
    default:
      return {
        label: origem.replace("_", " "),
        className: "bg-muted text-muted-foreground border-border",
      };
  }
}

export function ClientCreditHistoryModal({
  isOpen,
  onClose,
  clienteId,
}: ClientCreditHistoryModalProps) {
  const { data, isLoading } = useClienteCredito(clienteId, true);
  const revokeMutation = useRevokeClientCredit();
  const [revokingItem, setRevokingItem] = useState<ClienteCreditoLedgerRow | null>(null);
  const [motivoReversao, setMotivoReversao] = useState("");

  const historico = data?.historico ?? [];
  const saldo = data?.saldo ?? 0;

  // Mapear quais IDs já foram revertidos por reversões anteriores
  const revokedLedgerIds = useMemo(() => {
    const set = new Set<string>();
    for (const row of historico) {
      if (row.origem === "reversao_grant" && row.descricao) {
        const match = row.descricao.match(/\[REVOKE:([^\]]+)\]/);
        if (match && match[1]) {
          set.add(match[1]);
        }
      }
    }
    return set;
  }, [historico]);

  const handleConfirmRevoke = async () => {
    if (!revokingItem) return;

    try {
      await revokeMutation.mutateAsync({
        ledgerId: revokingItem.id,
        clienteId,
        motivo: motivoReversao.trim() || undefined,
      });
      toast.success("Crédito revertido com sucesso!");
      setRevokingItem(null);
      setMotivoReversao("");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao reverter crédito.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-500" />
              <DialogTitle className="text-base font-semibold">
                Extrato da Carteira de Crédito
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
              <span className="text-xs text-muted-foreground">Saldo atual:</span>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {formatCurrency(saldo)}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando histórico...
            </div>
          ) : historico.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma movimentação de crédito.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Os créditos adicionados ou consumidos aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {historico.map((item) => {
                const isPositivo = item.valor > 0;
                const badge = getOrigemBadge(item.origem, item.valor);
                const isReverted = revokedLedgerIds.has(item.id);
                const cleanDescricao = item.descricao
                  ? item.descricao.replace(/\s*\[REVOKE:[^\]]+\]/, "")
                  : "";

                const canRevoke =
                  isPositivo &&
                  !isReverted &&
                  saldo >= item.valor &&
                  item.origem !== "consumo_desconto";

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors",
                      isReverted ? "opacity-60 bg-muted/20" : "bg-card hover:bg-muted/10"
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold tabular-nums text-foreground">
                          {format(parseISO(item.data), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                        {isReverted && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-muted bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                            Revertido
                          </span>
                        )}
                      </div>

                      {cleanDescricao && (
                        <p className="text-xs text-muted-foreground truncate">
                          {cleanDescricao}
                        </p>
                      )}

                      {item.session_id_origem && (
                        <span className="text-[11px] text-muted-foreground/80 block">
                          Sessão: {item.session_id_origem}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            isPositivo
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {isPositivo ? "+ " : ""}
                          {formatCurrency(item.valor)}
                        </span>
                      </div>

                      {isPositivo && !isReverted && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(
                            "h-7 px-2 text-xs",
                            canRevoke
                              ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                              : "opacity-40 cursor-not-allowed text-muted-foreground"
                          )}
                          title={
                            canRevoke
                              ? "Reverter este crédito"
                              : saldo < item.valor
                              ? "Saldo insuficiente para estorno total (parte do crédito já foi consumida)"
                              : "Não pode ser revertido"
                          }
                          disabled={!canRevoke || revokeMutation.isPending}
                          onClick={() => setRevokingItem(item)}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Reverter
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal interno de confirmação da reversão */}
        {revokingItem && (
          <Dialog open={Boolean(revokingItem)} onOpenChange={(open) => !open && setRevokingItem(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Reverter Lançamento de Crédito
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <p className="text-muted-foreground">
                  Você está prestes a anular este crédito de{" "}
                  <strong className="text-foreground font-semibold">
                    {formatCurrency(revokingItem.valor)}
                  </strong>
                  . O saldo da carteira do cliente será reduzido.
                </p>

                <div className="p-3 bg-muted/40 rounded-lg border space-y-1 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Data original:</span>{" "}
                    <span className="font-medium text-foreground">
                      {format(parseISO(revokingItem.data), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lançamento:</span>{" "}
                    <span className="font-medium text-foreground">
                      {revokingItem.descricao || revokingItem.origem}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="motivo-reversao">Motivo da reversão (opcional)</Label>
                  <Input
                    id="motivo-reversao"
                    value={motivoReversao}
                    onChange={(e) => setMotivoReversao(e.target.value)}
                    placeholder="Ex.: Devolução via Pix ao cliente"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRevokingItem(null)}
                  disabled={revokeMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleConfirmRevoke}
                  disabled={revokeMutation.isPending}
                >
                  {revokeMutation.isPending ? "Revertendo..." : "Confirmar Reversão"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
