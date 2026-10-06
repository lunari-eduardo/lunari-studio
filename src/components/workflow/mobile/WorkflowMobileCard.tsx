import { ClienteAvatar } from '../shared/ClienteAvatar';
import { formatToDayMonth } from '@/utils/dateUtils';
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  MessageCircle,
  ExternalLink,
  Camera,
  Package,
  Calendar,
  Tag,
  Percent,
  Image as ImageIcon,
  Images,
  FileText,
  DollarSign,
  Send,
  Eye,
  Trash2,
  Ban,
  Plus,
  Lock,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { SessionData } from "@/types/workflow";
import type { DeleteAction } from "../WorkflowDeleteConfirmModal";
import { WorkflowDeleteConfirmModal } from "../WorkflowDeleteConfirmModal";
import { WorkflowPaymentsModal } from "../WorkflowPaymentsModal";
import { GerenciarProdutosModal } from "../GerenciarProdutosModal";
import { GalleryUpgradeModal } from "../GalleryUpgradeModal";
import { ManualPaymentModal } from "../ManualPaymentModal";
import { ChargeModal } from "@/components/cobranca/ChargeModal";
import { CombinedChargeModal } from "@/components/cobranca/CombinedChargeModal";
import { OverrideExtrasDialog } from "../details/OverrideExtrasDialog";
import { WorkflowPackageCombobox } from "../WorkflowPackageCombobox";
import { SessionStatusSelect } from "../SessionStatusSelect";
import { SessionRowMenu } from "../shared/SessionRowMenu";
import { SessionCreditBadge } from "@/components/finance/SessionCreditBadge";
import { FotosExtrasPaymentBadge } from "../FotosExtrasPaymentBadge";
import { useAppContext } from "@/contexts/AppContext";
import { useWorkflowStatus } from "@/hooks/useWorkflowStatus";
import { useGalleryExtraCalc } from "@/hooks/useGalleryExtraCalc";
import { useSessionFinancialsWithExtras } from "@/features/workflow/hooks/useSessionFinancialsWithExtras";
import {
  useMonthAccessControl,
  useMonthGalleriasForSession,
} from "@/features/workflow/presentation/WorkflowMonthDataContext";
import { buildGalleryNewUrl, buildGalleryDeliverUrl } from "@/utils/galleryRedirect";
import { computeProductNextAction } from "@/features/workflow/domain/productNextAction";
import {
  formatCurrencyBRL,
  formatFullDateLong,
  parseMoneyValue,
} from "./workflowMobileUtils";
import { getContrastColor } from "@/lib/colorUtils";

interface WorkflowMobileCardProps {
  session: SessionData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  statusOptions: string[];
  packageOptions: any[];
  productOptions: any[];
  onStatusChange: (id: string, newStatus: string) => void;
  onFieldUpdate: (id: string, field: string, value: any, silent?: boolean) => void;
  onDeleteSession?: (
    id: string,
    sessionTitle: string,
    paymentCount: number,
    action: DeleteAction,
  ) => void;
}

type MobileTab = "resumo" | "produtos" | "galeria" | "financeiro";

export function WorkflowMobileCard({
  session,
  isExpanded,
  onToggleExpand,
  statusOptions,
  packageOptions,
  productOptions,
  onStatusChange,
  onFieldUpdate,
  onDeleteSession,
}: WorkflowMobileCardProps) {
  const navigate = useNavigate();
  const { addPayment, pacotes } = useAppContext();
  const { getStatusColor } = useWorkflowStatus();
  const { hasGaleryAccess, accessState } = useMonthAccessControl();
  const { galerias, hasGalerias } = useMonthGalleriasForSession(
    session.sessionId || session.id,
  );

  // Tab state do card expandido
  const [activeTab, setActiveTab] = useState<MobileTab>("resumo");

  // Modais
  const [modalProdutosOpen, setModalProdutosOpen] = useState(false);
  const [workflowPaymentsOpen, setWorkflowPaymentsOpen] = useState(false);
  const [galleryUpgradeOpen, setGalleryUpgradeOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showExtraChargeModal, setShowExtraChargeModal] = useState(false);
  const [showCombinedChargeModal, setShowCombinedChargeModal] = useState(false);

  // Estados de controle dos menus dropdown
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // Rastreamento de toque para prevenir abertura acidental durante a rolagem no mobile/iOS
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    isScrollingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchStartPos.current.x);
    const dy = Math.abs(t.clientY - touchStartPos.current.y);
    // Se o dedo se moveu mais de 6px, trata-se de um gesto de rolagem
    if (dx > 6 || dy > 6) {
      isScrollingRef.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Janela de 150ms para neutralizar eventos click sintéticos disparados após o término do scroll
    setTimeout(() => {
      isScrollingRef.current = false;
      touchStartPos.current = null;
    }, 150);
  }, []);

  const handleActionsMenuOpenChange = useCallback((open: boolean) => {
    if (open && isScrollingRef.current) return;
    setActionsMenuOpen(open);
  }, []);

  const handleStatusMenuOpenChange = useCallback((open: boolean) => {
    if (open && isScrollingRef.current) return;
    setStatusMenuOpen(open);
  }, []);

  // Campos editáveis
  const [descontoValue, setDescontoValue] = useState(session.desconto || "");
  const [adicionalValue, setAdicionalValue] = useState(session.valorAdicional || "");
  const [valorFotoExtraValue, setValorFotoExtraValue] = useState(
    session.valorFotoExtra || "",
  );
  const [obsValue, setObsValue] = useState(session.observacoes || "");
  const [pendingExtraEdit, setPendingExtraEdit] = useState<{
    field: "valorFotoExtra" | "qtdFotosExtra";
    nextValue: string;
    previousValue: string;
    source: "gallery" | "frozen_rules";
  } | null>(null);

  useEffect(() => {
    setDescontoValue(session.desconto || "");
    setAdicionalValue(session.valorAdicional || "");
    setValorFotoExtraValue(session.valorFotoExtra || "");
    setObsValue(session.observacoes || "");
  }, [session.desconto, session.valorAdicional, session.valorFotoExtra, session.observacoes]);

  // Cálculos financeiros (RPC canonica)
  const { calc: extraCalc, resolvedGalleryId } = useGalleryExtraCalc(
    session.galeriaId || null,
    { sessionId: session.sessionId || null },
  );

  const fin = useSessionFinancialsWithExtras(
    session.id || null,
    session.galeriaId || resolvedGalleryId || null,
    session.sessionId || null,
  );
  const hasGaleria = fin.hasGaleria || Boolean(resolvedGalleryId);

  const pendente = useMemo(() => {
    if (fin.totalVisual > 0 || fin.pagoTotal > 0) {
      return fin.pendenteTot;
    }
    const total = parseMoneyValue(session.total);
    const pago = parseMoneyValue(session.valorPago);
    if (total || pago) return total - pago;
    return parseMoneyValue(session.restante);
  }, [fin.totalVisual, fin.pagoTotal, fin.pendenteTot, session.total, session.valorPago, session.restante]);

  const totalCalculado = useMemo(() => {
    if (fin.totalVisual > 0) return fin.totalVisual;
    return parseMoneyValue(session.total);
  }, [fin.totalVisual, session.total]);

  const valorPagoDisplay = useMemo(() => {
    if (fin.pagoTotal > 0) return fin.pagoTotal;
    return parseMoneyValue(session.valorPago);
  }, [fin.pagoTotal, session.valorPago]);

  const isPago = pendente <= 0.01 && totalCalculado > 0;

  // Cor de status da sessão
  const statusColor = useMemo(() => {
    if (!session.status) return "#9CA3AF";
    return getStatusColor(session.status);
  }, [session.status, getStatusColor]);

  // Pacote display
  const pacoteAtual = (session.pacote ?? "").toString();
  const displayPackageName = useMemo(() => {
    if (!pacoteAtual) return "Sem pacote";
    return (
      session.regras_congeladas?.pacote?.nome ||
      (pacotes || []).find(
        (p: any) => p.id === pacoteAtual || p.nome === pacoteAtual,
      )?.nome ||
      pacoteAtual
    );
  }, [pacoteAtual, session.regras_congeladas, pacotes]);

  // Quantidade de fotos extras
  const qtdFotosExtras = useMemo(() => {
    return fin.qtdExtras > 0
      ? fin.qtdExtras
      : Number(session.qtdFotosExtra) || 0;
  }, [fin.qtdExtras, session.qtdFotosExtra]);

  // Galerias
  const temSelecao = galerias.some((g) => g.tipo === "selecao");
  const temEntrega = galerias.some(
    (g) => g.tipo === "entrega" || g.tipo === "transfer",
  );

  const handleCreateSelecao = useCallback(() => {
    if (!hasGaleryAccess) {
      setGalleryUpgradeOpen(true);
      return;
    }
    if (temSelecao) {
      toast.error("Esta sessão já possui uma Galeria de Seleção");
      return;
    }
    const frozenPkg = session.regras_congeladas?.pacote as any | undefined;
    const pacoteAtualRegistro = (pacotes || []).find((p: any) => {
      if (frozenPkg?.id && p.id === frozenPkg.id) return true;
      if (session.pacote && p.nome === session.pacote) return true;
      return false;
    });

    const valorAtualSessao = parseMoneyValue(session.valorFotoExtra);
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
  }, [hasGaleryAccess, temSelecao, session, pacotes, accessState.planCode]);

  const handleCreateEntrega = useCallback(() => {
    if (!hasGaleryAccess) {
      setGalleryUpgradeOpen(true);
      return;
    }
    if (temEntrega) {
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
  }, [hasGaleryAccess, temEntrega, session]);

  // Edição de campos
  const handleDescontoBlur = useCallback(() => {
    const num = parseMoneyValue(descontoValue);
    const formatted = formatCurrencyBRL(num);
    setDescontoValue(formatted);
    onFieldUpdate(session.id, "desconto", formatted);
  }, [descontoValue, session.id, onFieldUpdate]);

  const handleValorFotoExtraBlur = useCallback(() => {
    const num = parseMoneyValue(valorFotoExtraValue);
    const formatted = formatCurrencyBRL(num);
    setValorFotoExtraValue(formatted);
    onFieldUpdate(session.id, "valorFotoExtra", formatted);
  }, [valorFotoExtraValue, session.id, onFieldUpdate]);

  const handleAdicionalBlur = useCallback(() => {
    const num = parseMoneyValue(adicionalValue);
    const formatted = formatCurrencyBRL(num);
    setAdicionalValue(formatted);
    onFieldUpdate(session.id, "valorAdicional", formatted);
  }, [adicionalValue, session.id, onFieldUpdate]);

  const handleObsBlur = useCallback(() => {
    if (obsValue !== session.observacoes) {
      onFieldUpdate(session.id, "observacoes", obsValue);
    }
  }, [obsValue, session.observacoes, session.id, onFieldUpdate]);

  // Produtos vendidos resumo
  const produtosVendidos = (session.produtosList as any[]) || [];
  const totalProdutosVendidos = produtosVendidos.length;
  const valorProdutosTotal = produtosVendidos.reduce(
    (acc, p) => acc + (Number(p.valorTotal) || Number(p.preco) * Number(p.quantidade) || 0),
    0,
  );
  const productActionInfo = computeProductNextAction(produtosVendidos);

  // Extras da galeria (fonte canônica alinhada com WorkflowCardExpanded)
  const fallbackExtrasTotal =
    (Number(session.qtdFotosExtra) || 0) * parseMoneyValue(session.valorFotoExtra);
  const extrasTotalCanonico =
    (fin.extrasLiquido ?? 0) > 0 ? fin.extrasLiquido : fallbackExtrasTotal;
  const extrasPagoCanonico = fin.extrasPago ?? 0;
  const extrasPendente = fin.extrasPend ?? 0;
  const extrasFullyPaid = extrasPendente <= 0.001;

  // Pendente da sessão (fonte canônica alinhada com WorkflowCardExpanded)
  const valorTotalFallback = parseMoneyValue(session.total);
  const pendenteVisual =
    fin.totalVisual > 0 || fin.pagoTotal > 0
      ? fin.pendenteTot
      : Math.max(0, valorTotalFallback - parseMoneyValue(session.valorPago));
  const pendenteSessaoSugerido =
    fin.totalVisual > 0 ? (fin.pendenteSess ?? 0) : pendenteVisual;

  const canCobrarSessao = pendenteSessaoSugerido > 0.001;
  const canCobrarExtras = extrasPendente > 0.001 && !extrasFullyPaid;
  const canCobrarTudo = canCobrarSessao && canCobrarExtras;
  const showChargeDropdown = canCobrarExtras || extrasPendente > 0.001;

  // Gatilho do botão Cobrar quando não houver dropdown
  const handleCobrarClick = useCallback(() => {
    if (canCobrarExtras && !canCobrarSessao) {
      setShowExtraChargeModal(true);
    } else if (canCobrarSessao) {
      setShowChargeModal(true);
    }
  }, [canCobrarExtras, canCobrarSessao]);

  return (
    <>
      <div
        data-card-id={session.id}
        className={cn(
          "w-full rounded-2xl transition-all duration-200 overflow-hidden",
          "bg-card/70 dark:bg-card/40 backdrop-blur-xl",
          "border border-border/40 dark:border-white/10",
          "shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]",
          isExpanded && "ring-1 ring-primary/30 shadow-[0_4px_20px_rgba(0,0,0,0.08)]",
        )}
      >
                {/* PARTE COLAPSADA DO CARD */}
        <div
          onClick={() => {
            if (isScrollingRef.current) return;
            onToggleExpand();
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="p-3.5 sm:p-4 cursor-pointer active:bg-accent/30 transition-colors select-none touch-manipulation flex items-start gap-3"
        >
          {/* Esquerda: Avatar */}
          <ClienteAvatar src={session.avatarUrl} nome={session.nome} size="md" className="shrink-0 mt-0.5" />

          {/* Direita: Empilhamento vertical */}
          <div className="flex flex-col min-w-0 flex-1">
            
            {/* CABEÇALHO: Nome + Badges + Menu */}
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-[14px] text-foreground leading-snug truncate">
                {session.nome || 'Cliente'}
              </span>
              
              {/* Ações Topo Direita */}
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Badge Pago/Faltando */}
                {pendente <= 0.01 && totalCalculado > 0 ? (
                  <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Pago
                  </span>
                ) : pendente > 0 ? (
                  <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
                    <AlertCircle className="h-3 w-3" />
                    {formatCurrencyBRL(pendente)}
                  </span>
                ) : null}

                {/* Menu de Ações */}
                <div className="ml-1 -mr-2">
                  <SessionRowMenu 
                    clientId={session.clienteId}
                    onOpenProdutos={() => setModalProdutosOpen(true)}
                    onOpenPaymentModal={() => setWorkflowPaymentsOpen(true)}
                    onCancelSession={() => setDeleteModalOpen(true)}
                  />
                </div>
              </div>
            </div>

            {/* DESCRIÇÃO */}
            <div className="mt-0.5 min-w-0" onClick={(e) => e.stopPropagation()}>
              <input
                value={obsValue}
                onChange={(e) => setObsValue(e.target.value)}
                onBlur={handleObsBlur}
                placeholder="Adicionar descrição..."
                className="w-full text-[12px] bg-transparent border-transparent px-0 py-0 text-muted-foreground focus:text-foreground placeholder:text-muted-foreground/50 outline-none truncate"
              />
            </div>

            {/* SELETORES (Pacote e Status) */}
            <div className="flex items-center gap-2 mt-2.5" onClick={(e) => e.stopPropagation()}>
              <div className="flex-1 max-w-[140px] min-w-0">
                <WorkflowPackageCombobox
                  key={`mobile-pkg-btn-${session.id}`}
                  value={pacoteAtual}
                  displayName={displayPackageName}
                  variant="mobile-pill"
                  onValueChange={(pkg) => {
                    if (!pkg.id && !pkg.nome) {
                      onFieldUpdate(session.id, "pacote", "");
                      return;
                    }
                    onFieldUpdate(session.id, "pacote", pkg.id || pkg.nome);
                  }}
                />
              </div>
              <div className="flex-1 max-w-[140px] min-w-0">
                <SessionStatusSelect
                  status={session.status}
                  statusOptions={statusOptions}
                  variant="mobile-pill"
                  onChange={(newStatus) => onStatusChange(session.id, newStatus)}
                />
              </div>
            </div>
          </div>
        </div>
{/* PARTE EXPANDIDA DO CARD */}
        {isExpanded && (
          <div className="border-t border-border/30 bg-muted/10">
            {/* ABAS */}
            <div className="flex items-center border-b border-border/30 px-3 bg-muted/20">
              {(
                [
                  { key: "resumo", label: "Resumo" },
                  { key: "produtos", label: "Produtos" },
                  { key: "galeria", label: "Galeria" },
                  { key: "financeiro", label: "Financeiro" },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab(tab.key);
                    }}
                    className={cn(
                      "flex-1 py-2.5 text-xs font-medium text-center transition-colors relative",
                      isActive
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* CONTEÚDO DAS ABAS */}
            <div className="p-4 space-y-4 text-xs">
              {/* ABA RESUMO */}
              {activeTab === "resumo" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Data da sessão
                    </span>
                    <span className="font-medium text-foreground">
                      {formatFullDateLong(session.data)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5" />
                      Pacote
                    </span>
                    <div className="max-w-[180px]">
                      <WorkflowPackageCombobox
                        key={`mobile-pkg-${session.id}`}
                        value={pacoteAtual}
                        displayName={displayPackageName}
                        onValueChange={(pkg) => {
                          if (!pkg.id && !pkg.nome) {
                            onFieldUpdate(session.id, "pacote", "");
                            return;
                          }
                          onFieldUpdate(
                            session.id,
                            "pacote",
                            pkg.id || pkg.nome,
                          );
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      Valor base
                    </span>
                    <span className="font-semibold text-primary">
                      {formatCurrencyBRL(session.valorPacote || (session.regras_congeladas?.pacote as any)?.valorBase || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5" />
                      Desconto
                    </span>
                    <Input
                      value={descontoValue}
                      onChange={(e) => setDescontoValue(e.target.value)}
                      onBlur={handleDescontoBlur}
                      placeholder="R$ 0,00"
                      className="h-7 w-24 text-right text-xs bg-background/50"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Valor adicional
                    </span>
                    <Input
                      value={adicionalValue}
                      onChange={(e) => setAdicionalValue(e.target.value)}
                      onBlur={handleAdicionalBlur}
                      placeholder="R$ 0,00"
                      className="h-7 w-24 text-right text-xs bg-background/50"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Valor foto extra
                    </span>
                    <Input
                      value={valorFotoExtraValue}
                      onChange={(e) => setValorFotoExtraValue(e.target.value)}
                      onBlur={handleValorFotoExtraBlur}
                      placeholder="R$ 0,00"
                      className="h-7 w-24 text-right text-xs bg-background/50"
                    />
                  </div>

                  <div className="pt-2">
                    <span className="text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Observações
                    </span>
                    <Textarea
                      value={obsValue}
                      onChange={(e) => setObsValue(e.target.value)}
                      onBlur={handleObsBlur}
                      placeholder="Observações da sessão..."
                      className="text-xs bg-background/50 resize-none min-h-[60px]"
                    />
                  </div>
                </div>
              )}

              {/* ABA PRODUTOS */}
              {activeTab === "produtos" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground">
                        {totalProdutosVendidos} {totalProdutosVendidos === 1 ? "produto" : "produtos"}
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Total: {formatCurrencyBRL(valorProdutosTotal)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModalProdutosOpen(true)}
                      className="h-7 text-xs gap-1"
                    >
                      <Package className="h-3 w-3" />
                      Gerenciar
                    </Button>
                  </div>

                  {productActionInfo.label && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-xs">
                      <span
                        className={cn("w-2 h-2 rounded-full", productActionInfo.dotClass)}
                      />
                      <span className="text-muted-foreground">Etapa de produção:</span>
                      <span className="font-medium text-foreground">
                        {productActionInfo.label}
                      </span>
                    </div>
                  )}

                  {totalProdutosVendidos === 0 ? (
                    <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                      Nenhum produto adicionado nesta sessão.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {produtosVendidos.map((prod: any, idx: number) => (
                        <div
                          key={prod.id || idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border/30"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">
                              {prod.nome || prod.titulo || "Produto"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Qtd: {prod.quantidade || 1}
                            </p>
                          </div>
                          <span className="font-semibold text-foreground shrink-0 ml-2">
                            {formatCurrencyBRL(
                              Number(prod.valorTotal) ||
                                Number(prod.preco) * (Number(prod.quantidade) || 1) ||
                                0,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ABA GALERIA */}
              {activeTab === "galeria" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {/* Galeria de Seleção */}
                    <div className="p-3 rounded-lg bg-background/60 border border-border/30 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">Galeria de Seleção</p>
                        <p className="text-[11px] text-muted-foreground">
                          {temSelecao
                            ? "Galeria criada e ativa"
                            : "Nenhuma seleção criada"}
                        </p>
                      </div>
                      {temSelecao ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const g = galerias.find((item) => item.tipo === "selecao");
                            if (g) window.open(`/app/gallery/select/${g.id}`, "_blank", "noopener,noreferrer");
                          }}
                          className="h-7 text-xs gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Abrir
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCreateSelecao}
                          className="h-7 text-xs gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Criar
                        </Button>
                      )}
                    </div>

                    {/* Galeria de Entrega */}
                    <div className="p-3 rounded-lg bg-background/60 border border-border/30 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">Galeria de Entrega</p>
                        <p className="text-[11px] text-muted-foreground">
                          {temEntrega
                            ? "Galeria criada e ativa"
                            : "Nenhuma entrega criada"}
                        </p>
                      </div>
                      {temEntrega ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const g = galerias.find(
                              (item) => item.tipo === "entrega" || item.tipo === "transfer",
                            );
                            if (g) window.open(`/app/gallery/transfer/${g.id}`, "_blank", "noopener,noreferrer");
                          }}
                          className="h-7 text-xs gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Abrir
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCreateEntrega}
                          className="h-7 text-xs gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Criar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Resumo de Extras da Galeria */}
                  <div className="pt-2 border-t border-border/20 space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Fotos extras selecionadas:</span>
                      <span className="font-semibold text-foreground">
                        {qtdFotosExtras}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total de fotos extras:</span>
                      <span className="font-semibold text-foreground">
                        {(() => {
                          const pagoDiretoExtras = Array.isArray(session.pagamentos) 
                            ? session.pagamentos
                                .filter((p: any) => p.cobranca?.finalidade === 'fotos_extras' || p.cobranca?.finalidade === 'sessao_e_extras')
                                .reduce((sum, p) => sum + (Number(p.valor) || 0), 0)
                            : 0;
                          return formatCurrencyBRL(
                            extrasFullyPaid && pagoDiretoExtras > 0
                              ? pagoDiretoExtras
                              : extrasTotalCanonico
                          );
                        })()}
                      </span>
                    </div>
                    {extrasPendente > 0 && (
                      <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                        <span>Pendente extras:</span>
                        <span>{formatCurrencyBRL(extrasPendente)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA FINANCEIRO */}
              {activeTab === "financeiro" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Valor do pacote:</span>
                      <span className="text-foreground">
                        {formatCurrencyBRL(session.valorPacote || 0)}
                      </span>
                    </div>
                    {parseMoneyValue(session.desconto) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Desconto aplicado:</span>
                        <span className="text-emerald-600">
                          - {formatCurrencyBRL(session.desconto)}
                        </span>
                      </div>
                    )}
                    {parseMoneyValue(session.valorAdicional) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Valor adicional:</span>
                        <span className="text-foreground">
                          + {formatCurrencyBRL(session.valorAdicional)}
                        </span>
                      </div>
                    )}
                    {extrasTotalCanonico > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Fotos extras:</span>
                        <span className="text-foreground">
                          + {(() => {
                            const pagoDiretoExtras = Array.isArray(session.pagamentos) 
                              ? session.pagamentos
                                  .filter((p: any) => p.cobranca?.finalidade === 'fotos_extras' || p.cobranca?.finalidade === 'sessao_e_extras')
                                  .reduce((sum, p) => sum + (Number(p.valor) || 0), 0)
                              : 0;
                            return formatCurrencyBRL(
                              extrasFullyPaid && pagoDiretoExtras > 0
                                ? pagoDiretoExtras
                                : extrasTotalCanonico
                            );
                          })()}
                        </span>
                      </div>
                    )}
                    {valorProdutosTotal > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Produtos:</span>
                        <span className="text-foreground">
                          + {formatCurrencyBRL(valorProdutosTotal)}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-border/30 flex justify-between font-bold text-sm">
                      <span className="text-foreground">Total da sessão:</span>
                      <span className="text-foreground">
                        {formatCurrencyBRL(totalCalculado)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium text-emerald-600 dark:text-emerald-400">
                      <span>Valor já pago:</span>
                      <span>{formatCurrencyBRL(valorPagoDisplay)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-600 dark:text-amber-400">
                      <span>Restante / Pendente:</span>
                      <span>{formatCurrencyBRL(pendente)}</span>
                    </div>
                  </div>

                  {/* Crédito da sessão se houver */}
                  {session.clienteId && (
                    <div className="pt-2">
                      <SessionCreditBadge
                        clienteId={session.clienteId}
                        sessionId={session.sessionId || session.id}
                        sessionPendente={pendente}
                      />
                    </div>
                  )}

                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setWorkflowPaymentsOpen(true)}
                      className="w-full h-8 text-xs gap-1.5"
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      Histórico financeiro
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* BOTÕES DE AÇÃO FIXOS NO RODAPÉ DO EXPANDIDO */}
            <div className="p-3 bg-card/90 border-t border-border/30 flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1 h-10 text-xs font-medium gap-1.5 shrink-0 min-w-0"
                onClick={() => setShowManualPaymentModal(true)}
              >
                <DollarSign className="h-4 w-4 shrink-0" />
                <span className="truncate">Adicionar pagamento</span>
              </Button>

              {showChargeDropdown ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={!canCobrarSessao && !canCobrarExtras}
                      className="flex-1 h-10 text-xs font-medium gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 min-w-0"
                    >
                      <Send className="h-4 w-4 shrink-0" />
                      <span className="truncate">Cobrar via link</span>
                      <ChevronDown className="h-3.5 w-3.5 ml-auto opacity-70 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top" sideOffset={6} className="w-60 p-1">
                    <DropdownMenuItem
                      disabled={!canCobrarSessao}
                      onClick={() => canCobrarSessao && setShowChargeModal(true)}
                      className="gap-2.5 cursor-pointer py-2"
                    >
                      <Send className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">Cobrar sessão</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatCurrencyBRL(pendenteSessaoSugerido)}
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!canCobrarExtras}
                      onClick={() => canCobrarExtras && setShowExtraChargeModal(true)}
                      className="gap-2.5 cursor-pointer py-2"
                    >
                      <Images className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">Cobrar extras</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatCurrencyBRL(extrasPendente)}
                        </div>
                      </div>
                    </DropdownMenuItem>
                    {canCobrarTudo && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setShowCombinedChargeModal(true)}
                          className="gap-2.5 cursor-pointer py-2"
                        >
                          <Send className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium">Cobrar tudo</div>
                            <div className="text-[10px] text-muted-foreground">
                              {formatCurrencyBRL(pendenteSessaoSugerido + extrasPendente)} • 1 link único
                            </div>
                          </div>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  disabled={!canCobrarSessao}
                  className="flex-1 h-10 text-xs font-medium gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 min-w-0"
                  onClick={() => setShowChargeModal(true)}
                >
                  <Send className="h-4 w-4 shrink-0" />
                  <span className="truncate">Cobrar via link</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAIS CONTROLADOS PELO CARD */}
      {modalProdutosOpen && (
        <GerenciarProdutosModal
          open={modalProdutosOpen}
          onOpenChange={setModalProdutosOpen}
          sessionId={session.id}
          clienteName={session.nome}
          produtos={(session.produtosList as any) || []}
          productOptions={productOptions}
          onSave={async (novosProdutos) => {
            const produtosCorrigidos = novosProdutos.map((p) => ({
              ...p,
              valorUnitario: p.tipo === "incluso" ? 0 : p.valorUnitario,
            }));
            await onFieldUpdate(session.id, "produtosList", produtosCorrigidos);
          }}
        />
      )}

      {workflowPaymentsOpen && (
        <WorkflowPaymentsModal
          isOpen={workflowPaymentsOpen}
          onClose={() => {
            setWorkflowPaymentsOpen(false);
            window.dispatchEvent(
              new CustomEvent("payment-created", {
                detail: {
                  sessionId: session.sessionId ?? null,
                  sessionUuid: session.id,
                  source: "workflow-mobile-card",
                },
              }),
            );
          }}
          sessionData={session}
          valorTotalCalculado={totalCalculado}
          onPaymentUpdate={() => {}}
        />
      )}

      {deleteModalOpen && onDeleteSession && (
        <WorkflowDeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={(action) => {
            onDeleteSession(
              session.id,
              session.nome || 'Sess?o',
              Array.isArray(session.pagamentos) ? session.pagamentos.length : 0,
              action,
            );
            setDeleteModalOpen(false);
          }}
          sessionData={{
            id: session.id,
            clientName: session.nome || 'Sess?o',
            date: session.data || '',
            hasPayments: Array.isArray(session.pagamentos) && session.pagamentos.length > 0
          }}
        />
      )}

      {galleryUpgradeOpen && (
        <GalleryUpgradeModal
          isOpen={galleryUpgradeOpen}
          onClose={() => setGalleryUpgradeOpen(false)}
        />
      )}

      {showManualPaymentModal && (
        <ManualPaymentModal
          isOpen={showManualPaymentModal}
          onClose={() => setShowManualPaymentModal(false)}
          session={session}
          sessaoPendente={Math.max(0, Number(pendenteSessaoSugerido) || 0)}
          extrasPendente={Math.max(0, Number(extrasPendente) || 0)}
          hasGaleria={hasGaleria}
        />
      )}

      {showChargeModal && (
        <ChargeModal
          isOpen={showChargeModal}
          onClose={() => setShowChargeModal(false)}
          clienteId={session.clienteId || ""}
          clienteNome={session.nome || "Cliente"}
          clienteWhatsapp={session.whatsapp}
          sessionId={session.sessionId || session.id}
          valorSugerido={Math.max(0, Number(pendenteSessaoSugerido) || 0)}
        />
      )}

      {showExtraChargeModal && (
        <ChargeModal
          isOpen={showExtraChargeModal}
          onClose={() => setShowExtraChargeModal(false)}
          clienteId={session.clienteId || ""}
          clienteNome={session.nome || "Cliente"}
          clienteWhatsapp={session.whatsapp}
          sessionId={session.sessionId || session.id}
          galeriaId={resolvedGalleryId || null}
          valorSugerido={Math.max(0, Number(extrasPendente) || 0)}
          finalidade="fotos_extras"
          qtdFotos={qtdFotosExtras}
          nomeSessao={session.pacote || session.nome}
        />
      )}

      {showCombinedChargeModal && (
        <CombinedChargeModal
          isOpen={showCombinedChargeModal}
          onClose={() => setShowCombinedChargeModal(false)}
          clienteId={session.clienteId || ""}
          clienteNome={session.nome || "Cliente"}
          clienteWhatsapp={session.whatsapp}
          sessionId={session.sessionId || session.id}
          galeriaId={resolvedGalleryId ?? null}
          valorSessaoComponente={Math.max(0, Number(pendenteSessaoSugerido) || 0)}
          valorExtrasComponente={Math.max(0, Number(extrasPendente) || 0)}
          qtdFotosExtras={qtdFotosExtras}
          snapshotFotosIncluidas={extraCalc?.included_count ?? null}
          nomeSessao={session.pacote || session.nome}
        />
      )}

      <OverrideExtrasDialog
        pendingExtraEdit={pendingExtraEdit}
        onConfirm={() => {
          if (pendingExtraEdit) {
            onFieldUpdate(
              session.id,
              pendingExtraEdit.field,
              pendingExtraEdit.nextValue,
            );
            setPendingExtraEdit(null);
          }
        }}
        onCancel={() => setPendingExtraEdit(null)}
      />
    </>
  );
}



