import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, MessageCircle, Calendar, Send, Clock, RotateCcw } from "lucide-react";
import type { Lead } from "@/types/leads";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import LeadActionsPopover from "./LeadActionsPopover";
import LeadDetailsModal from "./LeadDetailsModal";
import LeadActionButtons from "./LeadActionButtons";
import FollowUpCounter from "./FollowUpCounter";
import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { useLeadInteractions } from "@/hooks/useLeadInteractions";
import { useFollowUpSystem } from "@/hooks/useFollowUpSystem";
import { useAppContext } from "@/contexts/AppContext";
import { checkLeadClientDivergence } from "@/utils/leadClientSync";
import { toast } from "sonner";

interface LeadCardProps {
  lead: Lead;
  onDelete: () => void;
  onConvertToClient: () => void;
  onRequestMove?: (status: string) => void;
  statusOptions: {
    value: string;
    label: string;
  }[];
  onScheduleClient?: () => void;
  onMarkAsScheduled?: () => void;
  onViewAppointment?: () => void;
  onDirectScheduling?: () => void;
  onSendProposal?: () => void;
  onMoveToHistory?: () => void;
  dndRef?: (node: HTMLElement | null) => void;
  dndListeners?: any;
  dndAttributes?: any;
  dndStyle?: any;
  isDragging?: boolean;
}

// Gera cor de avatar de forma determinística pelo nome
function getAvatarColor(name: string): string {
  const colors = [
    "bg-violet-600",
    "bg-blue-600",
    "bg-emerald-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-cyan-600",
    "bg-fuchsia-600",
    "bg-indigo-600",
    "bg-teal-600",
    "bg-orange-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Retorna as 2 primeiras iniciais do nome
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Retorna cor de badge por canal de origem
function getOriginBadgeStyle(origin: string): { bg: string; text: string } {
  const lower = origin.toLowerCase();
  if (lower.includes("whatsapp")) return { bg: "bg-green-500/15", text: "text-green-500" };
  if (lower.includes("instagram")) return { bg: "bg-orange-500/15", text: "text-orange-400" };
  if (lower.includes("indicação") || lower.includes("indicacao")) return { bg: "bg-blue-500/15", text: "text-blue-400" };
  if (lower.includes("facebook")) return { bg: "bg-blue-600/15", text: "text-blue-500" };
  if (lower.includes("google")) return { bg: "bg-yellow-500/15", text: "text-yellow-500" };
  if (lower.includes("site") || lower.includes("web")) return { bg: "bg-purple-500/15", text: "text-purple-400" };
  return { bg: "bg-muted/50", text: "text-muted-foreground" };
}

export default function LeadCard({
  lead,
  onDelete,
  onConvertToClient,
  onRequestMove,
  statusOptions,
  onScheduleClient,
  onMarkAsScheduled,
  onViewAppointment,
  onDirectScheduling,
  onSendProposal,
  onMoveToHistory,
  dndRef,
  dndListeners,
  dndAttributes,
  dndStyle,
  isDragging = false,
}: LeadCardProps) {
  const [isPressing, setIsPressing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { statuses } = useLeadStatuses();
  const { addInteraction } = useLeadInteractions();
  const { config } = useFollowUpSystem();
  const { clientes } = useAppContext();

  // Check CRM client status and calculate dot color
  const crmDot = useMemo(() => {
    if (!lead.clienteId) return { show: false };

    const client = clientes.find((c) => c.id === lead.clienteId);
    if (!client) return { show: true, color: "bg-red-500", title: "Cliente não encontrado" };

    const divergence = checkLeadClientDivergence(lead);
    if (divergence.hasDivergence) {
      return { show: true, color: "bg-red-500", title: "Dados desatualizados" };
    }

    return { show: true, color: "bg-green-500", title: "Vinculado ao CRM" };
  }, [lead, clientes]);

  // Timestamp da última alteração real
  const lastUpdateIso = useMemo(() => {
    if (lead.statusTimestamp) return lead.statusTimestamp;
    if (lead.ultimaInteracao) return lead.ultimaInteracao;
    return lead.dataCriacao;
  }, [lead.statusTimestamp, lead.ultimaInteracao, lead.dataCriacao]);

  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNowStrict(new Date(lastUpdateIso), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "Data inválida";
    }
  }, [lastUpdateIso]);

  const isConverted = lead.status === "fechado";
  const isLost = lead.status === "perdido";

  const statusColor = useMemo(() => {
    const status = statuses.find((s) => s.key === lead.status);
    return status?.color || "#6b7280";
  }, [lead.status, statuses]);

  // Badge de follow-up
  const showFollowUpBadge = useMemo(() => {
    if (!config.ativo || lead.status !== config.statusMonitorado) return false;
    const statusChangeDate = lead.statusTimestamp || lead.dataCriacao;
    const daysSinceChange = Math.floor(
      (new Date().getTime() - new Date(statusChangeDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysSinceChange >= config.diasParaFollowUp;
  }, [lead, config]);

  // Badge de agendamento
  const schedulingBadge = useMemo(() => {
    if (lead.scheduledAppointmentId) return { text: "Agendado", color: "bg-green-100 text-green-800 border-green-200" };
    if (lead.needsScheduling) return { text: "Agendar", color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    return null;
  }, [lead.scheduledAppointmentId, lead.needsScheduling]);

  // Iniciar conversa WhatsApp
  const handleStartConversation = () => {
    try {
      const telefone = lead.telefone?.replace(/\D/g, "") || "";
      const mensagem = `Olá ${lead.nome}! 😊\n\nVi que você demonstrou interesse em nossos serviços. Como posso ajudá-lo(a)?`;
      const mensagemCodificada = encodeURIComponent(mensagem);
      const link = `https://wa.me/55${telefone}?text=${mensagemCodificada}`;
      window.open(link, "_blank");

      addInteraction(lead.id, "conversa", "Conversa iniciada via WhatsApp", false);

      if (lead.status === "novo_interessado") {
        onRequestMove?.("aguardando");
      }
    } catch (error) {
      toast.error("Erro ao abrir WhatsApp");
    }
  };

  // Ação primária contextual por status
  const primaryAction = useMemo(() => {
    if (isConverted) {
      if (!lead.scheduledAppointmentId && onDirectScheduling) {
        return {
          label: "Agendar sessão",
          icon: Calendar,
          onClick: onDirectScheduling,
          className: "text-lunar-accent border-lunar-accent/30 hover:bg-lunar-accent/10",
        };
      }
      return null;
    }

    if (isLost) {
      return {
        label: "Reabrir lead",
        icon: RotateCcw,
        onClick: () => onRequestMove?.("novo_interessado"),
        className: "text-muted-foreground border-border/60 hover:bg-muted/40",
      };
    }

    switch (lead.status) {
      case "novo_interessado":
        return {
          label: "Conversar",
          icon: MessageCircle,
          onClick: handleStartConversation,
          className: "text-green-500 border-green-500/30 hover:bg-green-500/10",
        };
      case "aguardando":
        if (onSendProposal) {
          return {
            label: "Enviar orçamento",
            icon: Send,
            onClick: onSendProposal,
            className: "text-blue-400 border-blue-400/30 hover:bg-blue-400/10",
          };
        }
        return null;
      case "orcamento_enviado":
        return {
          label: "Fazer follow-up",
          icon: Clock,
          onClick: handleStartConversation,
          className: "text-amber-400 border-amber-400/30 hover:bg-amber-400/10",
        };
      case "follow_up":
        return {
          label: "Conversar agora",
          icon: MessageCircle,
          onClick: handleStartConversation,
          className: "text-green-500 border-green-500/30 hover:bg-green-500/10",
        };
      default:
        return {
          label: "Conversar",
          icon: MessageCircle,
          onClick: handleStartConversation,
          className: "text-green-500 border-green-500/30 hover:bg-green-500/10",
        };
    }
  }, [lead.status, isConverted, isLost, onDirectScheduling, onSendProposal, onRequestMove, handleStartConversation]);

  // Origem para exibição de badge de canal
  const originBadgeStyle = lead.origem ? getOriginBadgeStyle(lead.origem) : null;

  const avatarColor = getAvatarColor(lead.nome);
  const initials = getInitials(lead.nome);

  return (
    <li
      className={`relative overflow-hidden rounded-xl p-3 transition-all cursor-grab active:cursor-grabbing select-none touch-none transform-gpu border ${isDragging ? "opacity-50 scale-95" : ""} ${isPressing ? "scale-[0.98]" : ""}
      bg-card/50 backdrop-blur-md border-white/50 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:bg-card/70 hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.1)]
      dark:bg-card/[0.06] dark:backdrop-blur-md dark:border-white/[0.08] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.25)] dark:hover:bg-white/[0.10] dark:hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)]
      `}
      style={dndStyle}
      ref={dndRef as any}
      {...(dndAttributes || {})}
      {...(dndListeners || {})}
      onPointerDownCapture={(e) => {
        const target = e.target as HTMLElement;
        if (target?.closest('[data-no-drag="true"]')) {
          e.stopPropagation();
        }
      }}
      onMouseDown={() => setIsPressing(true)}
      onMouseUp={() => setIsPressing(false)}
      onMouseLeave={() => setIsPressing(false)}
    >
      {/* Barra lateral colorida */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: statusColor }}
      />

      {/* Cabeçalho: Avatar + Nome + Menu */}
      <div className="flex items-start gap-2.5 mb-2.5">
        {/* Avatar com iniciais */}
        <div
          className={`relative flex-shrink-0 w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center`}
        >
          <span className="text-[10px] font-bold text-white leading-none">{initials}</span>
          {/* Ponto CRM sobreposto no avatar */}
          {crmDot.show && (
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${crmDot.color}`}
              title={crmDot.title}
            />
          )}
        </div>

        {/* Nome + timestamp */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold text-lunar-text leading-tight truncate">{lead.nome}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo}</p>
        </div>

        {/* Menu de ações */}
        <LeadActionsPopover
          lead={lead}
          onStartConversation={handleStartConversation}
          onShowDetails={() => setShowDetails(true)}
          onConvert={onConvertToClient}
          onDelete={onDelete}
          onScheduleClient={onScheduleClient}
          onMarkAsScheduled={onMarkAsScheduled}
          onViewAppointment={onViewAppointment}
          onSendProposal={onSendProposal}
          onMoveToHistory={onMoveToHistory}
        >
          <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 -mt-0.5 -mr-1" title="Mais opções" data-no-drag="true">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </LeadActionsPopover>
      </div>

      {/* Badges: Origem + canal + follow-up + agendamento */}
      <div className="flex flex-wrap gap-1 mb-2.5">
        {/* Badge de canal de origem */}
        {lead.origem && originBadgeStyle && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium ${originBadgeStyle.bg} ${originBadgeStyle.text}`}
          >
            {lead.origem}
          </span>
        )}

        {/* Follow-up counter para orcamento_enviado */}
        {lead.status === "orcamento_enviado" && (
          <FollowUpCounter statusTimestamp={lead.statusTimestamp} />
        )}

        {/* Badge follow-up */}
        {showFollowUpBadge && (
          <Badge className="text-[10px] px-1.5 py-0 h-auto bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/50">
            Follow-up
          </Badge>
        )}

        {/* Badge de agendamento */}
        {schedulingBadge && (
          <Badge className={`text-[10px] px-1.5 py-0 h-auto ${schedulingBadge.color}`}>
            {schedulingBadge.text}
          </Badge>
        )}

        {/* Badge motivo perda pendente */}
        {lead.status === "perdido" && !lead.motivoPerda && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-auto border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
          >
            Motivo pendente
          </Badge>
        )}

        {/* Badge motivo perda (quando existe) */}
        {lead.status === "perdido" && lead.motivoPerda && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted/50 text-muted-foreground">
            Motivo: {lead.motivoPerda}
          </span>
        )}
      </div>

      {/* Botão de ação primária contextual */}
      {primaryAction && (
        <div className="mt-1">
          <Button
            variant="outline"
            size="sm"
            className={`w-full h-7 text-[11px] font-medium gap-1.5 border ${primaryAction.className} transition-colors`}
            onClick={primaryAction.onClick}
            data-no-drag="true"
          >
            <primaryAction.icon className="h-3 w-3" />
            {primaryAction.label}
          </Button>
        </div>
      )}

      {/* Botões de ação legados (aguardando — orçamentos) */}
      <LeadActionButtons lead={lead} />

      {/* Details Modal */}
      <LeadDetailsModal
        lead={lead}
        open={showDetails}
        onOpenChange={setShowDetails}
        onConvert={onConvertToClient}
        onDelete={onDelete}
      />
    </li>
  );
}
