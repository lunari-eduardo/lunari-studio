import { useMemo } from "react";
import { useCobranca } from "@/hooks/useCobranca";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { buildPaymentShareUrl } from "@/utils/domainUtils";
import { useUserProfile } from "@/hooks/useUserProfile";

interface UseSessionPanelChargesParams {
  isEdit: boolean;
  sessionId?: string;
}

export function useSessionPanelCharges({
  isEdit,
  sessionId,
}: UseSessionPanelChargesParams) {
  const { profile } = useUserProfile();
  const { cobrancas, cancelCharge } = useCobranca({
    sessionId: isEdit ? sessionId : undefined,
  });

  const {
    dialogState: confirmDialogState,
    confirm: confirmDialog,
    handleConfirm: handleConfirmDialog,
    handleCancel: handleCancelDialog,
    handleClose: handleCloseDialog,
  } = useConfirmDialog();

  const handleCancelCharge = async (chargeId: string) => {
    const ok = await confirmDialog({
      title: "Cancelar cobrança pendente",
      description:
        "Deseja realmente cancelar esta cobrança pendente? O link de pagamento deixará de ser válido.",
      confirmText: "Cancelar cobrança",
      cancelText: "Voltar",
      variant: "destructive",
    });
    if (ok) {
      await cancelCharge(chargeId);
    }
  };

  const pagoCobrancas = useMemo(
    () => cobrancas.filter((c) => ["pago", "pago_manual"].includes(c.status)),
    [cobrancas],
  );
  const pendenteCobrancas = useMemo(
    () => cobrancas.filter((c) => c.status === "pendente"),
    [cobrancas],
  );
  const totalPagoCobrancas = useMemo(
    () =>
      pagoCobrancas.reduce(
        (acc, c) =>
          acc +
          (c.valor_principal != null
            ? Number(c.valor_principal)
            : Number(c.valor) || 0),
        0,
      ),
    [pagoCobrancas],
  );

  const cobrancaPendente = pendenteCobrancas[0] || null;
  const cobrancaPendenteLink = cobrancaPendente
    ? cobrancaPendente.id
      ? buildPaymentShareUrl(cobrancaPendente.id, profile)
      : cobrancaPendente.mpPaymentLink || cobrancaPendente.ipCheckoutUrl || ""
    : "";

  const cobranca =
    pagoCobrancas[0] || pendenteCobrancas[0] || cobrancas[0] || null;
  const cobrancaLink = cobranca
    ? cobranca.id
      ? buildPaymentShareUrl(cobranca.id, profile)
      : cobranca.mpPaymentLink || cobranca.ipCheckoutUrl || ""
    : "";

  return {
    cobrancas,
    pagoCobrancas,
    pendenteCobrancas,
    totalPagoCobrancas,
    cobrancaPendente,
    cobrancaPendenteLink,
    cobranca,
    cobrancaLink,
    handleCancelCharge,
    confirmDialogState,
    handleConfirmDialog,
    handleCancelDialog,
    handleCloseDialog,
  };
}
