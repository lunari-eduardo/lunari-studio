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
import { cn } from "@/lib/utils";

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

// Retorna as 2 primeiras iniciais do nome
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Cor do dot de origem em vez do fundo todo colorido
function getOriginDotColor(origin: string): string {
  const lower = origin.toLowerCase();
  if (lower.includes("whatsapp")) return "bg-green-500";
  if (lower.includes("instagram")) return "bg-pink-500";
  if (lower.includes("indicação") || lower.includes("indicacao")) return "bg-blue-500";
  if (lower.includes("facebook")) return "bg-blue-600";
  if (lower.includes("google")) return "bg-yellow-500";
  if (lower.includes("site") || lower.includes("web")) return "bg-purple-500";
  return "bg-muted-foreground";
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
      return { show: true, color: "bg-amber-500", title: "Dados desatualizados" };
    }
    return { show: true, color: "bg-emerald-500", title: "Vinculado ao CRM" };
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

  // Ação primária contextual por status (Botões Stealth - Neutros)
  const primaryAction = useMemo(() => {
    const baseClass = "text-muted-foreground border-border/40 hover:bg-muted/50 hover:text-foreground shadow-none";
    
    if (isConverted) {
      if (!lead.scheduledAppointmentId && onDirectScheduling) {
        return {
          label: "Agendar sessão",
          icon: Calendar,
          onClick: onDirectScheduling,
          className: baseClass,
        };
      }
      return null;
    }

    if (isLost) {
      return {
        label: "Reabrir lead",
        icon: RotateCcw,
        onClick: () => onRequestMove?.("novo_interessado"),
        className: baseClass,
      };
    }

    switch (lead.status) {
      case "novo_interessado":
        return { label: "Conversar", icon: MessageCircle, onClick: handleStartConversation, className: baseClass };
      case "aguardando":
        if (onSendProposal) {
          return { label: "Enviar orçamento", icon: Send, onClick: onSendProposal, className: baseClass };
        }
        return null;
      case "orcamento_enviado":
        return { label: "Fazer follow-up", icon: Clock, onClick: handleStartConversation, className: baseClass };
      case "follow_up":
        return { label: "Conversar agora", icon: MessageCircle, onClick: handleStartConversation, className: baseClass };
      default:
        return { label: "Conversar", icon: MessageCircle, onClick: handleStartConversation, className: baseClass };
    }
  }, [lead.status, isConverted, isLost, onDirectScheduling, onSendProposal, onRequestMove]);

  const initials = getInitials(lead.nome);
  const originDotColor = lead.origem ? getOriginDotColor(lead.origem) : null;

  return (
    <li
      className={cn(
        "relative overflow-hidden rounded-xl p-3 select-none touch-none transform-gpu group transition-all duration-300 ease-out border",
        isDragging ? "opacity-40 scale-[0.98] z-50 shadow-2xl ring-1 ring-lunar-accent/20 cursor-grabbing" : "cursor-grab",
        isPressing ? "scale-[0.99]" : "",
        "bg-card/40 backdrop-blur-md border-border/40 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]",
        "hover:bg-card/60 hover:border-border/80 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)]",
        "dark:bg-[#1a1a1a]/40 dark:border-white/[0.04] dark:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.2)]",
        "dark:hover:bg-[#1a1a1a]/70 dark:hover:border-white/[0.08] dark:hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.4)]"
      )}
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
      {/* Linha de Status Ultra Fina */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[1.5px] opacity-70 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: statusColor }}
      />

      {/* Cabeçalho: Avatar Neutro + Nome + Menu */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar Neutro Elegante */}
        <div
          className={cn(
            "relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            "bg-gradient-to-br from-muted to-muted/30 border border-white/10 dark:border-white/5",
            "text-foreground/70 shadow-sm"
          )}
        >
          <span className="text-[10px] font-medium tracking-wider">{initials}</span>
          {/* Ponto CRM sobreposto */}
          {crmDot.show && (
            <div
              className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card", crmDot.color)}
              title={crmDot.title}
            />
          )}
        </div>

        {/* Nome + timestamp */}
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="text-xs font-medium text-foreground leading-tight truncate tracking-tight">{lead.nome}</h3>
          <p className="text-[10px] text-muted-foreground mt-1 font-light tracking-wide">{timeAgo}</p>
        </div>

        {/* Menu de ações discreto */}
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
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 flex-shrink-0 -mt-1 -mr-1 text-muted-foreground/50 hover:text-foreground transition-colors" 
            title="Mais opções" 
            data-no-drag="true"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </LeadActionsPopover>
      </div>

      {/* Badges Neutros: Origem + follow-up + agendamento */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {/* Badge de canal de origem (Borda neutra + dot de cor) */}
        {lead.origem && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border/40 bg-transparent text-[10px] font-medium text-muted-foreground">
            {originDotColor && <div className={cn("w-1.5 h-1.5 rounded-full", originDotColor)} />}
            <span>{lead.origem}</span>
          </div>
        )}

        {/* Follow-up counter (adaptado para neutro internamente se possível) */}
        {lead.status === "orcamento_enviado" && (
          <FollowUpCounter statusTimestamp={lead.statusTimestamp} />
        )}

        {/* Badge follow-up stealth */}
        {showFollowUpBadge && (
          <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-red-500/20 bg-red-500/5 text-[10px] font-medium text-red-600/80 dark:text-red-400/80">
            Follow-up
          </div>
        )}

        {/* Badge de agendamento stealth */}
        {lead.scheduledAppointmentId && (
          <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 text-[10px] font-medium text-emerald-600/80 dark:text-emerald-400/80">
            Agendado
          </div>
        )}
        {!lead.scheduledAppointmentId && lead.needsScheduling && (
           <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/5 text-[10px] font-medium text-amber-600/80 dark:text-amber-400/80">
           Agendar
         </div>
        )}

        {/* Badge motivo perda (stealth) */}
        {lead.status === "perdido" && lead.motivoPerda && (
          <div className="inline-flex items-center px-2 py-0.5 rounded-md border border-border/40 bg-muted/20 text-[10px] font-medium text-muted-foreground">
            Motivo: {lead.motivoPerda}
          </div>
        )}
      </div>

      {/* Botão de ação primária (Stealth Design) */}
      {primaryAction && (
        <div className="mt-1">
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full h-7 text-[11px] font-medium gap-1.5 transition-all duration-300 ease-out", primaryAction.className)}
            onClick={primaryAction.onClick}
            data-no-drag="true"
          >
            <primaryAction.icon className="h-3 w-3" />
            {primaryAction.label}
          </Button>
        </div>
      )}

      <LeadActionButtons lead={lead} />

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
