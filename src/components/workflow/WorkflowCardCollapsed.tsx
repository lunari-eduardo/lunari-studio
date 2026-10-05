import { SessionDateBlock } from './row/SessionDateBlock';
import { SessionClientCell } from './row/SessionClientCell';
import { SessionMetricCell } from './row/SessionMetricCell';
import { SessionStatusSelect } from './SessionStatusSelect';
import { SessionRowMenu } from './shared/SessionRowMenu';
import React, { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkflowPackageCombobox } from "./WorkflowPackageCombobox";
import { ColoredStatusBadge } from "./ColoredStatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, ChevronDown, ChevronUp, Package, Ban } from "lucide-react";
import { Link } from "react-router-dom";
import { formatToDayMonth } from "@/utils/dateUtils";
import { buildGalleryNewUrl, buildGalleryDeliverUrl } from "@/utils/galleryRedirect";
import { useAppContext } from "@/contexts/AppContext";
import { useSessionFinancialsWithExtras } from "@/features/workflow/hooks/useSessionFinancialsWithExtras";
import {
  useMonthAccessControl,
  useMonthGalleriasForSession,
} from "@/features/workflow/presentation/WorkflowMonthDataContext";
import { toast } from "sonner";
import type { SessionData } from "@/types/workflow";
import type { DeleteAction } from "./WorkflowDeleteConfirmModal";
import { CardGalleryButtons } from "./details/CardGalleryButtons";
import { CardCollapsedModals } from "./details/CardCollapsedModals";
import { ProductStatusChip } from "./details/ProductStatusChip";
import { SessionCreditBadge } from "@/components/finance/SessionCreditBadge";
import { useSessionCreditContext } from "@/hooks/useSessionCreditContext";
import { useQuickPaymentScope } from "./details/useQuickPaymentScope";
import { QuickPaymentScopeDialog } from "./details/QuickPaymentScopeDialog";

interface WorkflowCardCollapsedProps {
  session: SessionData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  statusOptions: string[];
  packageOptions: any[];
  productOptions: any[];
  onStatusChange: (id: string, newStatus: string) => void;
  onFieldUpdate: (id: string, field: string, value: any, silent?: boolean) => void;
  onDeleteSession?: (id: string, sessionTitle: string, paymentCount: number, action: DeleteAction) => void;
  /** Estado de "Gerenciar Produtos" hoisted em WorkflowCard, compartilhado com o expandido. */
  modalAberto: boolean;
  setModalAberto: (v: boolean) => void;
  deleteModalOpen: boolean;
  setDeleteModalOpen: (v: boolean) => void;
}

export function WorkflowCardCollapsed({
  session,
  isExpanded,
  onToggleExpand,
  statusOptions,
  packageOptions,
  productOptions,
  onStatusChange,
  onFieldUpdate,
  onDeleteSession,
  modalAberto,
  setModalAberto,
  deleteModalOpen,
  setDeleteModalOpen,
}: WorkflowCardCollapsedProps) {
  const { addPayment, pacotes } = useAppContext();
  const { hasGaleryAccess, accessState } = useMonthAccessControl();
  const { galerias, hasGalerias } = useMonthGalleriasForSession(session.sessionId || session.id);

  
  const [workflowPaymentsOpen, setWorkflowPaymentsOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(session.descricao || "");

  useEffect(() => {
    setDescriptionValue(session.descricao || "");
  }, [session.descricao]);

  const formatCurrency = useCallback((value: any) => {
    return `R$ ${(Number(value) || 0).toFixed(2).replace(".", ",")}`;
  }, []);

  // F5.2: pendente com sinal preservado (valores negativos = crédito/overpay).
  const parseSignedMoney = (val: unknown): number => {
    if (typeof val === "number") return val;
    const str = String(val ?? "0");
    const isNeg = /-/.test(str);
    const cleaned = str.replace(/[^\d,]/g, "").replace(",", ".");
    const n = parseFloat(cleaned) || 0;
    return isNeg ? -n : n;
  };

  // Fonte única (RPC workflow_session_financials): mesma usada pelo card
  // expandido e pelo modal de pagamento. Evita divergência entre "topo"
  // e "expandido" ao reabrir a galeria e adicionar nova seleção.
  const fin = useSessionFinancialsWithExtras(
    session.id || null,
    session.galeriaId || null,
    session.sessionId || null,
  );
  const hasGaleria = fin.hasGaleria;

  const calculateRestante = useCallback(() => {
    if (fin.totalVisual > 0 || fin.pagoTotal > 0) {
      return fin.pendenteTot;
    }
    const total = parseSignedMoney(session.total);
    const pago = parseSignedMoney(session.valorPago);
    if (total || pago) return total - pago;
    return parseSignedMoney(session.restante);
  }, [
    session.restante,
    session.total,
    session.valorPago,
    fin.totalVisual,
    fin.pagoTotal,
    fin.pendenteTot,
  ]);

  const quickPay = useQuickPaymentScope({
    sessionId: session.id,
    pendente: Math.max(0, calculateRestante()),
    hasGaleria,
    valorFotoExtra: parseSignedMoney(session.valorFotoExtra),
    qtdFotosExtraAtual: Number(session.qtdFotosExtra) || 0,
    addPayment,
    onFieldUpdate,
  });
  const paymentInput = quickPay.paymentInput;
  const setPaymentInput = quickPay.setPaymentInput;
  const handlePaymentAdd = quickPay.handlePaymentAdd;
  const handlePaymentKeyDown = quickPay.handlePaymentKeyDown;



  const handleDescriptionBlur = useCallback(() => {
    if (descriptionValue !== session.descricao) {
      onFieldUpdate(session.id, "descricao", descriptionValue);
    }
  }, [descriptionValue, session.descricao, session.id, onFieldUpdate]);

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      const statusValue = newStatus === "__CLEAR__" ? "" : newStatus;
      onStatusChange(session.id, statusValue);
    },
    [session.id, onStatusChange],
  );

  const pendente = calculateRestante();
  const hasProdutos = !!(session.produtosList && session.produtosList.length > 0);

  // pacote vazio (limpo) ignora regras_congeladas.
  // Resolução: regras congeladas > lookup local em `pacotes` (caso o otimista
  // ainda não tenha o snapshot completo) > valor cru salvo na sessão.
  const pacoteAtual = (session.pacote ?? "").toString();
  const displayPackageName =
    pacoteAtual === ""
      ? ""
      : session.regras_congeladas?.pacote?.nome ||
        (pacotes || []).find((p: any) => p.id === pacoteAtual || p.nome === pacoteAtual)?.nome ||
        pacoteAtual;

  const handleCreateSelecao = useCallback(() => {
    if (!hasGaleryAccess) {
      setGalleryModalOpen(true);
      return;
    }
    if (galerias.some((g) => g.tipo === "selecao")) {
      toast.error("Esta sessão já possui uma Galeria de Seleção");
      return;
    }

    const parseValor = (str?: string) =>
      Number(String(str || "").replace(/[^\d,]/g, "").replace(",", ".")) || 0;

    // Fallback ao registro real do pacote (via id congelado ou nome), caso
    // regras_congeladas esteja incompleto/NULL (ex.: sessões antigas ou
    // freezing que falhou no createSessionFromAppointment).
    const frozenPkg = session.regras_congeladas?.pacote as any | undefined;
    const pacoteAtualRegistro = (pacotes || []).find((p: any) => {
      if (frozenPkg?.id && p.id === frozenPkg.id) return true;
      if (session.pacote && p.nome === session.pacote) return true;
      return false;
    });

    const valorAtualSessao = parseValor(session.valorFotoExtra);
    const valorCongelado = Number(frozenPkg?.valorFotoExtra) || 0;
    const valorPacoteAtual = Number(pacoteAtualRegistro?.valor_foto_extra) || 0;
    const precoExtraAtual =
      valorAtualSessao > 0
        ? valorAtualSessao
        : valorCongelado > 0
        ? valorCongelado
        : valorPacoteAtual;

    const fotosIncluidas =
      Number(frozenPkg?.fotosIncluidas) ||
      Number(pacoteAtualRegistro?.fotos_incluidas) ||
      undefined;

    const modeloCobranca =
      session.regras_congeladas?.precificacaoFotoExtra?.modelo || "fixo";

    if (!frozenPkg && pacoteAtualRegistro) {
      console.warn(
        "[Workflow→Gallery] regras_congeladas ausente — usando registro atual do pacote como fallback",
        { sessionId: session.id, pacoteId: pacoteAtualRegistro.id },
      );
    }

    const url = buildGalleryNewUrl({
      sessionId: session.sessionId || session.id,
      sessionUuid: session.id,
      clienteId: session.clienteId,
      clienteNome: session.nome,
      clienteEmail: session.email || "",
      clienteTelefone: session.whatsapp || "",
      pacoteNome: frozenPkg?.nome || pacoteAtualRegistro?.nome || session.pacote,
      pacoteCategoria:
        frozenPkg?.categoria ||
        pacoteAtualRegistro?.categorias?.nome ||
        session.categoria,
      fotosIncluidas,
      modeloCobranca,
      precoExtra: precoExtraAtual,
      tipoAssinatura: accessState.planCode,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }, [session, hasGaleryAccess, accessState.planCode, galerias, pacotes]);

  const handleCreateEntrega = useCallback(() => {
    if (!hasGaleryAccess) {
      setGalleryModalOpen(true);
      return;
    }
    if (galerias.some((g) => g.tipo === "entrega" || g.tipo === "transfer")) {
      toast.error("Esta sessão já possui uma Galeria de Entrega");
      return;
    }
    const url = buildGalleryDeliverUrl({
      sessionId: session.sessionId || session.id,
      sessionUuid: session.id,
      clienteId: session.clienteId,
      clienteNome: session.nome,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }, [session, hasGaleryAccess, galerias]);

  const temSelecao = galerias.some((g) => g.tipo === "selecao");
  const temEntrega = galerias.some((g) => g.tipo === "entrega" || g.tipo === "transfer");
  const temTodas = temSelecao && temEntrega;

  return (
    <>
      <div 
        className={cn("group relative flex items-center gap-4 px-4 py-3 transition-colors cursor-pointer min-h-[72px]", isExpanded ? "bg-transparent" : "bg-card hover:bg-muted/10 rounded-xl border border-border/40 shadow-[0_4px_30px_rgba(0,0,0,0.02)]")} 
        onClick={onToggleExpand}
      >
        <SessionDateBlock 
          dataSessao={session.data} 
          horaSessao={session.hora} 
          appointmentId={session.appointmentId} 
          className="hidden md:flex" 
        />
        
        <SessionClientCell 
          clientId={session.clienteId} 
          nome={session.nome} 
          avatarUrl={session.avatarUrl} 
          categoria={session.categoria} 
          whatsapp={session.whatsapp} 
          className="flex-1 min-w-[200px]" 
        />

        <div className="w-48 xl:w-56 shrink-0 hidden md:flex items-center px-1" onClick={e => e.stopPropagation()}>
          <input
            value={descriptionValue}
            onChange={(e) => setDescriptionValue(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Adicionar descrição..."
            className="w-full text-[13px] bg-transparent border border-transparent hover:border-border/60 hover:bg-muted/30 focus:border-border focus:bg-background focus:ring-2 focus:ring-accent-gold/40 rounded-lg px-3 py-1.5 transition-all text-muted-foreground focus:text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
        </div>

        <div className="w-48 shrink-0 hidden md:block" onClick={e => e.stopPropagation()}>
          <WorkflowPackageCombobox
            key={`package-${session.id}`}
            value={pacoteAtual}
            displayName={displayPackageName}
            variant="inline"
            onValueChange={(packageData) => {
              if (!packageData.id && !packageData.nome) {
                onFieldUpdate(session.id, 'pacote', '');
                return;
              }
              onFieldUpdate(session.id, 'pacote', packageData.id || packageData.nome);
            }}
          />
        </div>

        <div className="w-32 shrink-0 hidden md:flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <SessionStatusSelect
            status={session.status}
            statusOptions={statusOptions}
            onChange={handleStatusChange}
          />
        </div>

        <div className="w-24 shrink-0 hidden lg:flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <ProductStatusChip
            produtos={session.produtosList as any}
            onClick={() => setModalAberto(true)}
          />
        </div>

        <SessionMetricCell 
          sessionId={session.sessionId || null}
          clienteId={(session as any).clienteId || null}
          pendente={pendente}
          formatCurrency={formatCurrency}
          className="w-24 shrink-0 hidden md:flex"
        />

        <div className="w-28 shrink-0 hidden md:flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <CardGalleryButtons
            galerias={galerias}
            hasGalerias={hasGalerias}
            temSelecao={temSelecao}
            temEntrega={temEntrega}
            temTodas={temTodas}
            onCreateSelecao={handleCreateSelecao}
            onCreateEntrega={handleCreateEntrega}
          />
        </div>

        <SessionRowMenu 
          clientId={session.clienteId}
          onOpenProdutos={() => setModalAberto(true)}
          onOpenPaymentModal={() => setWorkflowPaymentsOpen(true)}
          onCancelSession={() => setDeleteModalOpen(true)}
          className="hidden md:flex"
        />
      </div>

      {/* Modais renderizados FORA do wrapper com onClick={onToggleExpand}.
          Radix Dialog usa Portal (DOM no body), mas eventos React borbulham
          pela árvore de componentes — colocar aqui como irmão do click-area
          impede que cliques dentro do modal disparem expand/collapse do card. */}
      <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <QuickPaymentScopeDialog
          open={quickPay.scopeOpen}
          excedente={quickPay.excedente}
          valorFotoExtra={parseSignedMoney(session.valorFotoExtra)}
          onCancel={quickPay.cancelScope}
          onScopeSessao={quickPay.chooseSessao}
          onScopeExtras={quickPay.chooseExtras}
        />
      </div>

      <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <CardCollapsedModals
          session={session}
          productOptions={productOptions}
          modalAberto={modalAberto}
          setModalAberto={setModalAberto}
          onFieldUpdate={onFieldUpdate}
          formatCurrency={formatCurrency}
          workflowPaymentsOpen={workflowPaymentsOpen}
          setWorkflowPaymentsOpen={setWorkflowPaymentsOpen}
          pendente={pendente}
          galleryModalOpen={galleryModalOpen}
          setGalleryModalOpen={setGalleryModalOpen}
          deleteModalOpen={deleteModalOpen}
          setDeleteModalOpen={setDeleteModalOpen}
          onDeleteSession={onDeleteSession}
        />
      </div>
    </>
  );
}



/**
 * Célula "Pendente / Crédito" do card colapsado.
 * - Fonte única: `useSessionCreditContext` decide se a sessão gerou crédito.
 * - Se a sessão gerou crédito ainda disponível ou já consumido → renderiza SessionCreditBadge.
 * - Caso contrário → mostra valor pendente (ou "Quitada").
 */



