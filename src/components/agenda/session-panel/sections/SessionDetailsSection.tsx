import React from "react";
import { Calendar } from "lucide-react";
import { PanelSection, PanelField } from "../PanelSection";
import PackageSearchCombobox from "../../PackageSearchCombobox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PanelFormState } from "../types";

interface SessionDetailsSectionProps {
  form: PanelFormState;
  setForm?: React.Dispatch<React.SetStateAction<PanelFormState>>;
  categorias?: unknown[];
  handlePackageSelect: (packageId: string, packageData?: any) => void;
  valorPacote?: number;
}

export const SessionDetailsSection: React.FC<SessionDetailsSectionProps> = ({
  form,
  handlePackageSelect,
  valorPacote = 0,
}) => {
  const hasPackage = Boolean(form.packageId);

  return (
    <PanelSection icon={Calendar} title="Sessão">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Coluna Esquerda: Dropdown de seleção de pacote */}
        <PanelField label="Pacote" htmlFor="package-search-input">
          <PackageSearchCombobox
            value={form.packageId}
            onSelect={handlePackageSelect}
            placeholder="Selecionar pacote..."
          />
        </PanelField>

        {/* Coluna Direita: Valor do pacote selecionado */}
        <PanelField label="Valor do pacote" htmlFor="sp-valor-pacote">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none pointer-events-none">
              R$
            </span>
            <Input
              id="sp-valor-pacote"
              readOnly
              tabIndex={-1}
              value={
                hasPackage && valorPacote > 0
                  ? valorPacote.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : hasPackage
                    ? "0,00"
                    : ""
              }
              placeholder="0,00"
              className={cn(
                "h-10 rounded-lg pl-10 text-base sm:text-sm font-medium transition-colors select-none",
                hasPackage
                  ? "bg-muted/30 text-foreground border-input"
                  : "bg-muted/15 text-muted-foreground/50 border-input/60 cursor-not-allowed",
              )}
            />
          </div>
        </PanelField>
      </div>
    </PanelSection>
  );
};
