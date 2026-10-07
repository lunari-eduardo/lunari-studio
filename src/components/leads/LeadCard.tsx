import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, MessageCircle, Calendar, Send, Clock, RotateCcw, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { normalizeBrPhone } from "@/lib/phone";
import { useNavigate } from "react-router-dom";
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
import { useConfigurationContext } from "@/contexts/ConfigurationContext";
import { useGlobalConversas } from "@/contexts/ConversasContext";
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
  const [showDetails, setShowDetails] = useState(false);
  const { statuses } = useLeadStatuses();
  const { addInteraction } = useLeadInteractions();
  const { config } = useFollowUpSystem();
  const { clientes } = useAppContext();
  const { categorias } = useConfigurationContext();
  const navigate = useNavigate();
  const [isStartingChat, setIsStartingChat] = useState(false);
  const conversasContext = useGlobalConversas();
  const chats = conversasContext?.chats || [];

  const client = useMemo(() => {
    return lead.clienteId ? clientes.find((c) => c.id === lead.clienteId) : null;
  }, [lead.clienteId, clientes]);

  const leadCategoria = useMemo(() => {
    const categoryId = lead.categoria_manual_id || lead.categoria_ia_id;
    if (!categoryId) return null;
    return categorias?.find(c => c.id === categoryId) || null;
  }, [lead.categoria_manual_id, lead.categoria_ia_id, categorias]);

  const avatarUrl = useMemo(() => {
    if (client?.avatar_url) return client.avatar_url;
    
    // Fallback para a foto do WhatsApp
    const phoneToFind = (lead.whatsapp || lead.telefone || "").replace(/\D/g, "");
    if (phoneToFind) {
      const chat = chats.find(c => {
        const chatPhone = (c.contato_phone_normalized || "").replace(/\D/g, "");
        return chatPhone && chatPhone.includes(phoneToFind);
      });
      if (chat?.contato_avatar) return chat.contato_avatar;
    }
    return null;
  }, [client, lead.whatsapp, lead.telefone, chats]);

  // Timestamp da última alteração real
  const lastUpdateIso = useMemo(() => {
    if (lead.statusTimestamp) return lead.statusTimestamp;
    if (lead.ultimaInteracao) return lead.ultimaInteracao;
    return lead.dataCriacao;
  }, [lead.statusTimestamp, lead.ultimaInteracao, lead.dataCriacao]);

  const formattedCreationDate = useMemo(() => {
    try {
      return `Criado em ${format(new Date(lead.dataCriacao), "dd 'de' MMM", { locale: ptBR })}`;
    } catch {
      return "Data inválida";
    }
  }, [lead.dataCriacao]);

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
  const handleStartConversation = async () => {
    try {
      const telefone = lead.whatsapp || lead.telefone || "";
      const normalizedPhone = normalizeBrPhone(telefone);
      
      const { instanceViewState, connectedInstance } = conversasContext || {};
      const isConnected = instanceViewState === 'ready' && !!connectedInstance;

      if (!isConnected || !normalizedPhone) {
        // Fallback: abre no WhatsApp Web (comportamento atual)
        const onlyNumbers = telefone.replace(/\D/g, "");
        const mensagem = `Olá ${lead.nome}! 😊\n\nVi que você demonstrou interesse em nossos serviços. Como posso ajudá-lo(a)?`;
        const link = `https://wa.me/55${onlyNumbers}?text=${encodeURIComponent(mensagem)}`;
        window.open(link, "_blank");
        addInteraction(lead.id, "conversa", "Conversa iniciada via WhatsApp Web", false);
        if (lead.status === "novo_interessado") {
          onRequestMove?.("aguardando");
        }
        return;
      }

      // WhatsApp Conectado no Lunari: procura chat existente
      setIsStartingChat(true);
      const chatPhoneToFind = normalizedPhone.replace(/\D/g, "");
      const existingChat = chats.find(c => {
        const cPhone = (c.contato_phone_normalized || "").replace(/\D/g, "");
        return cPhone && cPhone.includes(chatPhoneToFind);
      });

      if (existingChat) {
        navigate(`/app/conversas?chat=${existingChat.id}`);
        addInteraction(lead.id, "conversa", "Conversa aberta na página Conversas", false);
        if (lead.status === "novo_interessado") {
          onRequestMove?.("aguardando");
        }
        setIsStartingChat(false);
        return;
      }

      // Criar nova conversa no módulo
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado");

      let contatoId = '';
      const { data: existingContato } = await supabase
        .from('conversas_contatos')
        .select('id')
        .eq('phone_normalized', normalizedPhone)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingContato) {
        contatoId = existingContato.id;
      } else {
        const { data: newContato, error: contatoError } = await supabase
          .from('conversas_contatos')
          .insert({
            user_id: userId,
            phone_normalized: normalizedPhone,
            phone_raw: telefone,
            nome: lead.nome || null,
            tipo: lead.clienteId ? 'cliente' : 'lead',
          })
          .select('id')
          .single();
        if (contatoError) throw contatoError;
        contatoId = newContato.id;
      }

      const { data: newChat, error: chatError } = await supabase
        .from('conversas_chats')
        .insert({
          user_id: userId,
          contato_id: contatoId,
          instance_id: connectedInstance,
          contato_phone_normalized: normalizedPhone,
          contato_nome: lead.nome || null,
          status: 'active',
          unread_count: 0,
          pin: 'unpinned',
          mute: false,
        })
        .select('id')
        .single();
      
      if (chatError) throw chatError;

      addInteraction(lead.id, "conversa", "Nova conversa criada na página Conversas", false);
      if (lead.status === "novo_interessado") {
        onRequestMove?.("aguardando");
      }
      
      navigate(`/app/conversas?chat=${newChat.id}`);

    } catch (error: any) {
      // Usar a variavel toast já importada do sonner
      toast.error(error.message || "Erro ao iniciar conversa");
    } finally {
      setIsStartingChat(false);
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
        "relative overflow-hidden rounded-[14px] p-3.5 select-none touch-none transform-gpu group transition-all duration-300 ease-out",
        isDragging ? "opacity-50 scale-[0.98] z-50 shadow-2xl ring-1 ring-lunar-accent/30 cursor-grabbing" : "cursor-grab",
        !isDragging && "active:scale-[0.99]",
        "bg-background border border-border/50 shadow-[0_2px_12px_rgba(0,0,0,0.04)]",
        "hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
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
    >
      {/* Cabeçalho: Avatar Neutro + Nome + Menu */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar Neutro Ultra Elegante ou Foto do WhatsApp */}
        <div
          className={cn(
            "relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden",
            "bg-muted/40 text-muted-foreground"
          )}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={lead.nome} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-medium tracking-wider">{initials}</span>
          )}
        </div>

        {/* Nome + timestamp */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-medium text-foreground leading-tight truncate tracking-tight">{lead.nome}</h3>
            {lead.clienteId && (
              <div title="Vinculado ao CRM como Cliente">
                <UserCheck className="w-[12px] h-[12px] text-[#D4AF37] shrink-0" />
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 font-light tracking-wide">{formattedCreationDate}</p>
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
            className="h-6 w-6 flex-shrink-0 -mt-1 -mr-1 text-muted-foreground/40 hover:text-foreground transition-colors" 
            title="Mais opções" 
            data-no-drag="true"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </LeadActionsPopover>
      </div>

      {/* Badges Neutros: Origem + follow-up + agendamento */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* Tag de Categoria */}
        {leadCategoria && (
          <div 
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              backgroundColor: leadCategoria.cor ? `${leadCategoria.cor}15` : 'rgba(156, 163, 175, 0.15)',
              color: leadCategoria.cor || '#9ca3af',
            }}
          >
            <span>{leadCategoria.nome}</span>
          </div>
        )}

        {/* Badge de canal de origem (Borda ultra sutil, text muted) */}
        {lead.origem && lead.origem.toLowerCase() !== "manual" && (
          <div className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/30 bg-transparent text-[10px] text-muted-foreground">
            <span>{lead.origem}</span>
          </div>
        )}

        {/* Follow-up counter */}
        {lead.status === "orcamento_enviado" && (
          <div className="inline-flex items-center rounded border border-border/30 bg-transparent text-[10px] text-muted-foreground">
             <FollowUpCounter statusTimestamp={lead.statusTimestamp} />
          </div>
        )}

        {/* Badge follow-up stealth */}
        {showFollowUpBadge && (
          <div className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/30 bg-transparent text-[10px] text-red-500/80">
            Follow-up
          </div>
        )}

        {/* Badge de agendamento stealth */}
        {lead.scheduledAppointmentId && (
          <div className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/30 bg-transparent text-[10px] text-emerald-500/80">
            Agendado
          </div>
        )}
        {!lead.scheduledAppointmentId && lead.needsScheduling && (
           <div className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/30 bg-transparent text-[10px] text-amber-500/80">
           Agendar
         </div>
        )}

        {/* Badge motivo perda */}
        {lead.status === "perdido" && lead.motivoPerda && (
          <div className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/30 bg-transparent text-[10px] text-muted-foreground">
            Motivo: {lead.motivoPerda}
          </div>
        )}
      </div>

      {/* Botão de ação primária integrado como rodapé do card */}
      {primaryAction && (
        <div className="mt-4 -mx-3.5 -mb-3.5 border-t border-border/20">
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full h-8 rounded-t-none rounded-b-[14px] text-[11px] font-medium gap-1.5 transition-all duration-300", primaryAction.className)}
            onClick={primaryAction.onClick}
            data-no-drag="true"
          >
            <primaryAction.icon className="h-3.5 w-3.5" />
            {isStartingChat && primaryAction.icon === MessageCircle ? "Iniciando..." : primaryAction.label}
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
