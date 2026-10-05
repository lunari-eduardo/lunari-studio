import { useState, useCallback } from "react";

export type PendingExtraEdit = {
  field: "valorFotoExtra" | "qtdFotosExtra";
  nextValue: string;
  previousValue: string;
  source: "gallery" | "frozen_rules";
};

interface UseExtraEditGuardProps {
  sessionId: string;
  galeriaHasSales: boolean;
  hasDescontoProgressivo: boolean;
  extrasOverridden: boolean;
  onFieldUpdate: (id: string, field: string, value: any, silent?: boolean) => void;
  setValorFotoExtraValue?: (value: string) => void;
  setQtdFotosExtraValue?: (value: string) => void;
}

export function useExtraEditGuard({
  sessionId,
  galeriaHasSales,
  hasDescontoProgressivo,
  extrasOverridden,
  onFieldUpdate,
  setValorFotoExtraValue,
  setQtdFotosExtraValue
}: UseExtraEditGuardProps) {
  const [pendingExtraEdit, setPendingExtraEdit] = useState<PendingExtraEdit | null>(null);

  const requestExtraEdit = useCallback(
    (field: "valorFotoExtra" | "qtdFotosExtra", nextValue: string, previousValue: string) => {
      if (nextValue === previousValue) return;
      if (galeriaHasSales) {
        setPendingExtraEdit({ field, nextValue, previousValue, source: "gallery" });
        return;
      }
      if (hasDescontoProgressivo && !extrasOverridden) {
        setPendingExtraEdit({ field, nextValue, previousValue, source: "frozen_rules" });
        return;
      }
      onFieldUpdate(sessionId, field, nextValue, true);
    },
    [galeriaHasSales, hasDescontoProgressivo, extrasOverridden, sessionId, onFieldUpdate],
  );

  const confirmExtraEdit = useCallback(() => {
    if (!pendingExtraEdit) return;
    onFieldUpdate(sessionId, pendingExtraEdit.field, pendingExtraEdit.nextValue, true);
    setPendingExtraEdit(null);
  }, [pendingExtraEdit, sessionId, onFieldUpdate]);

  const cancelExtraEdit = useCallback(() => {
    if (pendingExtraEdit?.field === "valorFotoExtra" && setValorFotoExtraValue) {
      setValorFotoExtraValue(pendingExtraEdit.previousValue);
    } else if (pendingExtraEdit?.field === "qtdFotosExtra" && setQtdFotosExtraValue) {
      setQtdFotosExtraValue(pendingExtraEdit.previousValue);
    }
    setPendingExtraEdit(null);
  }, [pendingExtraEdit, setValorFotoExtraValue, setQtdFotosExtraValue]);

  return {
    pendingExtraEdit,
    requestExtraEdit,
    confirmExtraEdit,
    cancelExtraEdit
  };
}
