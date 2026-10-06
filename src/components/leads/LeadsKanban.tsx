import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  DndContext,
  rectIntersection,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { useLeadInteractions } from "@/hooks/useLeadInteractions";
import { useAppContext } from "@/contexts/AppContext";
import { useMaterials } from "@/hooks/useMaterials";
import LeadCard from "./LeadCard";
import LeadFormModal from "./LeadFormModal";
import DraggableLeadCard from "./DraggableLeadCard";
import FollowUpConfigModal from "./FollowUpConfigModal";
import LeadSchedulingModal from "./LeadSchedulingModal";
import LeadLossReasonModal from "./LeadLossReasonModal";
import { DynamicShareModal } from "./LeadCommercialSection";
import type { Lead } from "@/types/leads";
import type { PeriodFilter } from "@/hooks/useLeadMetrics";
import { convertPeriodTypeToFilter, filterLeadsByPeriod, shouldLeadBeInHistory } from "@/utils/leadFilters";
import { cn } from "@/lib/utils";

export interface LeadsKanbanProps {
  periodFilter?: PeriodFilter;
  searchTerm?: string;
  originFilter?: string;
  isMobile?: boolean;
  onOpenCreate?: () => void;
}

export default function LeadsKanban({
  periodFilter,
  searchTerm = "",
  originFilter = "all",
  isMobile = false,
  onOpenCreate,
}: LeadsKanbanProps) {
  const navigate = useNavigate();
  const { leads, addLead, updateLead, deleteLead, convertToClient } = useLeads();
  const { materials } = useMaterials();
  const { statuses, getConvertedKey } = useLeadStatuses();
  const { addInteraction } = useLeadInteractions();
  const { origens, setSelectedClientForScheduling } = useAppContext();
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
  const [leadToSchedule, setLeadToSchedule] = useState<Lead | null>(null);
  const [schedulingLead, setSchedulingLead] = useState<Lead | null>(null);
  const [lossReasonModalOpen, setLossReasonModalOpen] = useState(false);
  const [leadForLossReason, setLeadForLossReason] = useState<Lead | null>(null);
  
  // Envio de orçamento
  const [sendProposalModalOpen, setSendProposalModalOpen] = useState(false);
  const [leadForProposal, setLeadForProposal] = useState<Lead | null>(null);
  const activeMaterials = useMemo(() => materials.filter(m => m.status === 'active' && !!m.current_version?.published_at), [materials]);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  // No mobile, exige 250ms de hold antes de ativar drag,
  // evitando conflito com o scroll horizontal do kanban
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 8,
    },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);
  const statusOptions = useMemo(
    () =>
      statuses.map((s) => ({
        value: s.key,
        label: s.name,
      })),
    [statuses],
  );
  const activeStatuses = useMemo(() => statuses.filter((s) => !s.isConverted && !s.isLost), [statuses]);

  const filteredLeads = useMemo(() => {
    let filtered = leads.filter((lead) => {
      const matchesSearch =
        !searchTerm.trim() ||
        lead.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.telefone?.includes(searchTerm);

      const matchesOrigem = originFilter === "all" || lead.origem === originFilter;
      
      return matchesSearch && matchesOrigem;
    });

    if (periodFilter) {
      const filterObj = convertPeriodTypeToFilter(periodFilter.periodType);
      filtered = filterLeadsByPeriod(filtered, filterObj, statuses);
    }
    
    return filtered.filter(lead => { return !shouldLeadBeInHistory(lead, statuses); });

  }, [leads, searchTerm, originFilter, periodFilter, statuses]);
  const groupedLeads = useMemo(() => {
    const groups: Record<string, Lead[]> = {};
    statuses.forEach((s) => {
      groups[s.key] = [];
    });
    filteredLeads.forEach((lead) => {
      (groups[lead.status] ||= []).push(lead);
    });
    return groups;
  }, [filteredLeads, statuses]);
  const handleMoveToHistory = (lead: Lead) => {
    updateLead(lead.id, {
      arquivado: true,
      statusTimestamp: new Date().toISOString(),
    });
  };

  const handleStatusChange = (lead: Lead, newStatus: string) => {
    const statusName = statuses.find((s) => s.key === newStatus)?.name || newStatus;
    const convertedKey = getConvertedKey();

    // Check if moving to lost status - NÃƒO atualizar aqui, apenas abrir modal
    if (newStatus === "perdido") {
      console.log('ðŸ”´ [Kanban] Abrindo modal de motivo de perda para:', lead.nome);
      setLeadForLossReason(lead);
      setLossReasonModalOpen(true);
      return; // A atualização será feita no modal após seleção do motivo
    }

    // Update lead status for non-lost statuses
    updateLead(lead.id, {
      status: newStatus,
    });

    // Add interaction for status change
    addInteraction(
      lead.id,
      "mudanca_status",
      `Status alterado para "${statusName}"`,
      true,
      `Movido via Kanban`,
      lead.status,
      newStatus,
    );

    // Handle follow-up activation for 'orcamento_enviado'
    if (newStatus === "orcamento_enviado") {
      // Reset follow-up timer
      updateLead(lead.id, {
        needsFollowUp: false,
        statusTimestamp: new Date().toISOString(),
      });
      addInteraction(
        lead.id,
        "followup",
        "Timer de follow-up iniciado",
        true,
        "Contagem iniciada para follow-up automático",
      );
    }

    // Note: Direct scheduling button will be shown on card instead of modal
  };
  const handleScheduled = (leadId: string, appointmentId: string) => {
    updateLead(leadId, {
      scheduledAppointmentId: appointmentId,
      needsScheduling: false,
    });
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      addInteraction(leadId, "manual", "Cliente agendado com sucesso", false, `Agendamento criado: ${appointmentId}`);
    }
  };
  const handleNotScheduled = (leadId: string) => {
    updateLead(leadId, {
      needsScheduling: true,
      scheduledAppointmentId: undefined,
    });
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      addInteraction(leadId, "manual", "Agendamento adiado", false, "Cliente convertido mas agendamento foi adiado");
    }
  };
  const handleConvertToClient = async (leadId: string) => {
    const cliente = await convertToClient(leadId);
    if (cliente) {
      updateLead(leadId, {
        status: "fechado",
      });
    }
  };
  const handleScheduleClient = (lead: Lead) => {
    setSchedulingLead(lead);
    setSchedulingModalOpen(true);
  };

  const handleDirectScheduling = (lead: Lead) => {
    // Set client for pre-selection in Agenda
    setSelectedClientForScheduling(lead.clienteId);
    // Navigate to Agenda page
    navigate("/app/agenda");
  };

  const handleLossReasonConfirm = (leadId: string, reason: string) => {
    const lead = leadForLossReason || leads.find((l) => l.id === leadId);
    const previousStatus = lead?.status || 'desconhecido';
    const now = new Date().toISOString();
    
    console.log('ðŸ”´ [Kanban] Confirmando perda com motivo:', { leadId, reason, previousStatus });

    // UMA ÃšNICA chamada com todos os campos
    updateLead(leadId, {
      status: "perdido",
      perdidoEm: now,
      motivoPerda: reason,
      needsFollowUp: false,
      statusTimestamp: now,
    });

    addInteraction(
      leadId,
      "mudanca_status",
      `Status alterado para "Perdido"`,
      true,
      `Motivo: ${reason}`,
      previousStatus,
      "perdido",
    );
  };

  const handleLossReasonSkip = (leadId: string) => {
    const lead = leadForLossReason || leads.find((l) => l.id === leadId);
    const previousStatus = lead?.status || 'desconhecido';
    const now = new Date().toISOString();

    console.log('ðŸ”´ [Kanban] Perda sem motivo:', { leadId, previousStatus });

    // Mover para perdido mesmo sem motivo
    updateLead(leadId, {
      status: "perdido",
      perdidoEm: now,
      needsFollowUp: false,
      statusTimestamp: now,
    });

    addInteraction(
      leadId,
      "mudanca_status",
      `Status alterado para "Perdido"`,
      true,
      `Motivo a definir posteriormente`,
      previousStatus,
      "perdido",
    );
  };
  const handleMarkAsScheduled = (leadId: string) => {
    updateLead(leadId, {
      needsScheduling: false,
      scheduledAppointmentId: `manual_${Date.now()}`,
    });
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      addInteraction(
        leadId,
        "manual",
        "Marcado como agendado manualmente",
        false,
        "Cliente foi marcado como agendado sem criar agendamento específico",
      );
    }
  };
  const handleViewAppointment = (lead: Lead) => {
    if (lead.scheduledAppointmentId) {
      // Future: Navigate to agenda with appointment highlighted
      window.location.href = "/app/agenda";
    }
  };
  const StatusColumn = ({ title, statusKey }: { title: string; statusKey: string }) => {
    const { isOver, setNodeRef } = useDroppable({
      id: statusKey,
    });
    const leadsInColumn = groupedLeads[statusKey] || [];

    // Buscar cor do status
    const statusColor = statuses.find((s) => s.key === statusKey)?.color || "#6b7280";
    return (
      <section className={cn("h-full flex flex-col", isMobile ? "flex-1 min-w-[240px]" : "flex-1 min-w-[280px]")}>
        <header className={cn("flex items-center justify-between px-1", isMobile ? "mb-1.5" : "mb-3")}>
          <div className="flex items-center gap-2">
            <div
              className={cn("rounded-full", isMobile ? "w-2 h-2" : "w-3 h-3")}
              style={{
                backgroundColor: statusColor,
              }}
            />
            <h2 className={cn("font-semibold text-lunar-text", isMobile ? "text-xs" : "text-sm")}>{title}</h2>
          </div>
          <Badge variant="outline" className={cn(isMobile ? "text-[10px] px-1 py-0" : "text-2xs")}>
            {leadsInColumn.length}
          </Badge>
        </header>

        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 overflow-hidden flex flex-col rounded-2xl transition-all duration-300 ease-out",
            "bg-transparent", // Coluna completamente limpa, sem fundo cinza encaixotado
            isMobile ? "p-1" : "p-2",
            isOver && "bg-muted/10 ring-1 ring-border/50" // Apenas um leve respiro no hover da coluna
          )}
        >
          <div className="flex-1 overflow-y-auto scrollbar-kanban">
            <ul className={cn("pb-2", isMobile ? "space-y-1" : "space-y-2")}>
              {leadsInColumn.map((lead) => (
                <DraggableLeadCard
                  key={lead.id}
                  lead={lead}
                  onDelete={() => {
                    deleteLead(lead.id);
                  }}
                  onConvertToClient={() => handleConvertToClient(lead.id)}
                  onRequestMove={(status) => {
                    handleStatusChange(lead, status);
                  }}
                  statusOptions={statusOptions}
                  activeId={activeId}
                  onScheduleClient={() => handleScheduleClient(lead)}
                  onMarkAsScheduled={() => handleMarkAsScheduled(lead.id)}
                  onViewAppointment={() => handleViewAppointment(lead)}
                  onDirectScheduling={() => handleDirectScheduling(lead)}
                  onSendProposal={() => {
                    setLeadForProposal(lead);
                    setSendProposalModalOpen(true);
                  }}
                />
              ))}

              {leadsInColumn.length === 0 && (
                <li className={cn("text-center text-lunar-textSecondary", isMobile ? "text-xs py-4" : "text-sm py-8")}>
                  Nenhum lead neste status
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>
    );
  };
  return (
    <div className="flex flex-col h-full">
      {/* Header do Kanban — config discreta + novo lead dourado */}
      <div className={cn("flex items-center justify-end gap-2", isMobile ? "px-2 py-1.5" : "px-2 py-2")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfigModalOpen(true)}
          title="Configurar Follow-up"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => onOpenCreate ? onOpenCreate() : setCreateModalOpen(true)}
          size={isMobile ? "sm" : "sm"}
          className={cn(
            "gap-1.5 font-semibold bg-lunar-accent hover:bg-lunar-accent/90 text-black",
            isMobile ? "h-8 text-xs" : "h-8 text-xs"
          )}
        >
          + {isMobile ? "Novo" : "Novo Lead"}
        </Button>
      </div>

      {/* Kanban Board Container - Optimized for mobile scroll */}
      <div className="flex-1 relative overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={(e) => {
            setActiveId(String(e.active.id));
            // Haptic leve ao iniciar drag (mobile)
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
              navigator.vibrate(40);
            }
          }}
          onDragEnd={(e) => {
            const overId = e.over?.id as string | undefined;
            if (activeId && overId) {
              const current = leads.find((lead) => lead.id === activeId);
              if (current && current.status !== overId) {
                handleStatusChange(current, overId);
                // Haptic de confirmação ao mover para nova coluna
                if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                  navigator.vibrate([20, 10, 20]);
                }
              }
            }
            // Delay clearing activeId to let the optimistic cache update
            // from onMutate settle first, preventing the card from flashing
            // back to its original column
            requestAnimationFrame(() => setActiveId(null));
          }}
          onDragCancel={() => setActiveId(null)}
        >
          {/* Kanban Columns - Enhanced mobile scrolling */}
          <div className="absolute inset-0 overflow-x-auto overflow-y-hidden scrollbar-kanban">
            <div className={cn("flex h-full min-w-max", isMobile ? "gap-1 px-1" : "gap-2 px-2")}>
              {statuses.map((status) => (
                <StatusColumn key={status.id} title={status.name} statusKey={status.key} />
              ))}
            </div>
          </div>

          <DragOverlay
            dropAnimation={{
              duration: 300,
              easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
            }}
          >
            {/* Sombra ampla e rotacionado, sem bordas chocantes */}
            <div className="pointer-events-none rotate-2 scale-105 bg-card/60 dark:bg-[#1a1a1a]/60 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)]">
              {activeId
                ? (() => {
                    const lead = leads.find((l) => l.id === activeId);
                    return lead ? (
                      <LeadCard
                        lead={lead}
                        onDelete={() => {}}
                        onConvertToClient={() => {}}
                        statusOptions={statusOptions}
                        isDragging={true}
                      />
                    ) : null;
                  })()
                : null}
            </div>
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      <LeadFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        mode="create"
        onSubmit={async (data) => {
          try {
            const newLead = await addLead(data);

            // Criar cliente automaticamente no CRM e vincular ao lead
            // convertToClient verifica duplicatas por e-mail antes de criar
            await convertToClient(newLead.id);

            // Add creation interaction
            addInteraction(
              newLead.id,
              "criacao",
              `Lead criado com status "${statuses.find((s) => s.key === data.status)?.name || data.status}"`,
              true,
              `Lead registrado no funil`,
            );
          } catch (error) {
            toast({
              title: "Erro",
              description: "Não foi possível criar o lead",
            });
          }
        }}
      />

      {/* Follow-up Config Modal */}
      <FollowUpConfigModal open={configModalOpen} onOpenChange={setConfigModalOpen} />

      {/* Lead Scheduling Modal */}
      {(leadToSchedule || schedulingLead) && (
        <LeadSchedulingModal
          open={schedulingModalOpen}
          onOpenChange={(open) => {
            setSchedulingModalOpen(open);
            if (!open) {
              setLeadToSchedule(null);
              setSchedulingLead(null);
            }
          }}
          lead={leadToSchedule || schedulingLead!}
          onScheduled={(appointmentId) => {
            const targetLead = leadToSchedule || schedulingLead;
            if (targetLead) {
              handleScheduled(targetLead.id, appointmentId);
              setLeadToSchedule(null);
              setSchedulingLead(null);
            }
          }}
          onSkip={() => {
            const targetLead = leadToSchedule || schedulingLead;
            if (targetLead) {
              handleNotScheduled(targetLead.id);
              setLeadToSchedule(null);
              setSchedulingLead(null);
            }
          }}
        />
      )}

      {/* Lead Loss Reason Modal */}
      <LeadLossReasonModal
        open={lossReasonModalOpen}
        onOpenChange={(open) => {
          setLossReasonModalOpen(open);
          if (!open) {
            setLeadForLossReason(null);
          }
        }}
        lead={leadForLossReason}
        onConfirm={handleLossReasonConfirm}
        onSkip={handleLossReasonSkip}
      />

      {/* Share Proposal Modal */}
      {leadForProposal && (
        <DynamicShareModal
          isOpen={sendProposalModalOpen}
          onClose={() => {
            setSendProposalModalOpen(false);
            setLeadForProposal(null);
          }}
          leadId={leadForProposal.id}
          leadName={leadForProposal.nome}
          leadPhone={leadForProposal.telefone}
          materials={activeMaterials}
        />
      )}
    </div>
  );
}

