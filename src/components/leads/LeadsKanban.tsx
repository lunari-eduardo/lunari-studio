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
import LeadCard from "./LeadCard";
import LeadFormModal from "./LeadFormModal";
import DraggableLeadCard from "./DraggableLeadCard";
import FollowUpConfigModal from "./FollowUpConfigModal";
import LeadSchedulingModal from "./LeadSchedulingModal";
import LeadLossReasonModal from "./LeadLossReasonModal";
import { SendBudgetDrawer } from "@/components/conversas/context/modals/SendBudgetDrawer";
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
  createModalOpen?: boolean;
  setCreateModalOpen?: (open: boolean) => void;
  configModalOpen?: boolean;
  setConfigModalOpen?: (open: boolean) => void;
  hideHeader?: boolean;
}

export default function LeadsKanban({
  periodFilter,
  searchTerm = "",
  originFilter = "all",
  isMobile = false,
  onOpenCreate,
  createModalOpen: externalCreateModalOpen,
  setCreateModalOpen: externalSetCreateModalOpen,
  configModalOpen: externalConfigModalOpen,
  setConfigModalOpen: externalSetConfigModalOpen,
  hideHeader = false,
}: LeadsKanbanProps) {
  const navigate = useNavigate();
  const { leads, addLead, updateLead, deleteLead, convertToClient } = useLeads();
  const { statuses, getConvertedKey } = useLeadStatuses();
  const { addInteraction } = useLeadInteractions();
  const { origens, setSelectedClientForScheduling } = useAppContext();
  const { toast } = useToast();
  
  const [internalCreateModalOpen, setInternalCreateModalOpen] = useState(false);
  const createModalOpen = externalCreateModalOpen !== undefined ? externalCreateModalOpen : internalCreateModalOpen;
  const setCreateModalOpen = externalSetCreateModalOpen || setInternalCreateModalOpen;

  const [activeId, setActiveId] = useState<string | null>(null);

  const [internalConfigModalOpen, setInternalConfigModalOpen] = useState(false);
  const configModalOpen = externalConfigModalOpen !== undefined ? externalConfigModalOpen : internalConfigModalOpen;
  const setConfigModalOpen = externalSetConfigModalOpen || setInternalConfigModalOpen;

  const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
  const [leadToSchedule, setLeadToSchedule] = useState<Lead | null>(null);
  const [schedulingLead, setSchedulingLead] = useState<Lead | null>(null);
  const [lossReasonModalOpen, setLossReasonModalOpen] = useState(false);
  const [leadForLossReason, setLeadForLossReason] = useState<Lead | null>(null);
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, string>>({});
  
  // Envio de orçamento
  const [sendProposalModalOpen, setSendProposalModalOpen] = useState(false);
  const [leadForProposal, setLeadForProposal] = useState<Lead | null>(null);

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
      const status = optimisticStatuses[lead.id] || lead.status;
      (groups[status] ||= []).push(lead);
    });
    return groups;
  }, [filteredLeads, statuses, optimisticStatuses]);
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
        <header className={cn("flex items-center justify-between px-2", isMobile ? "mb-1.5" : "mb-3")}>
          <div className="flex items-center gap-2">
            <div
              className={cn("rounded-full", isMobile ? "w-1.5 h-1.5" : "w-2 h-2")}
              style={{
                backgroundColor: statusColor,
              }}
            />
            <h2 className={cn("font-medium text-foreground", isMobile ? "text-xs" : "text-sm")}>{title}</h2>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-full">
            {leadsInColumn.length}
          </span>
        </header>

        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 min-h-0 overflow-hidden flex flex-col rounded-2xl transition-all duration-300 ease-out",
            "bg-muted/40", 
            isMobile ? "p-1.5" : "p-2",
            isOver ? "bg-muted/60 shadow-inner" : "" 
          )}
        >
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-kanban">
            <ul 
              className={cn(isMobile ? "space-y-1" : "space-y-2")}
              style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
            >
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
                  onMoveToHistory={() => handleMoveToHistory(lead)}
                />
              ))}

              {leadsInColumn.length === 0 && (
                <li className={cn(
                  "text-center text-muted-foreground flex items-center justify-center h-24 border-2 border-dashed border-border/50 rounded-xl bg-transparent", 
                  isMobile ? "text-xs" : "text-sm"
                )}>
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
      {!hideHeader && (
        <div className={cn("flex items-center justify-end gap-2", isMobile ? "px-2 py-1.5" : "px-2 py-2")}>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setConfigModalOpen(true)}
            title="Configurar Follow-up"
            className="h-8 w-8 rounded-md bg-background border border-input shadow-sm text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => onOpenCreate ? onOpenCreate() : setCreateModalOpen(true)}
            size={isMobile ? "sm" : "sm"}
            className={cn(
              "gap-1.5 font-semibold shadow-sm bg-foreground text-background hover:bg-foreground/90 rounded-md",
              isMobile ? "h-8 text-xs" : "h-8 text-xs"
            )}
          >
            + {isMobile ? "Novo" : "Novo Lead"}
          </Button>
        </div>
      )}

      {/* Kanban Board Container - Optimized for mobile scroll */}
      <div className="flex-1 relative overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          autoScroll={{ layoutShiftCompensation: false }}
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
                // Aplica a mudança visualmente antes mesmo da query terminar
                setOptimisticStatuses(prev => ({ ...prev, [activeId]: overId }));
                
                handleStatusChange(current, overId);
                
                // Haptic de confirmação ao mover para nova coluna
                if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                  navigator.vibrate([20, 10, 20]);
                }

                // Limpa o estado otimista depois que o backend deve ter atualizado
                setTimeout(() => {
                  setOptimisticStatuses(prev => {
                    const next = { ...prev };
                    delete next[activeId];
                    return next;
                  });
                }, 3000);
              }
            }
            // Limpa o ID ativo no mesmo frame para que o React renderize o elemento
            // na nova coluna e a animação do DragOverlay termine nela
            setActiveId(null);
          }}
        >
          {/* Kanban Columns - Enhanced mobile scrolling */}
          <div className="absolute inset-0 overflow-x-auto overflow-y-hidden scrollbar-kanban">
            <div className={cn("flex h-full min-w-max", isMobile ? "gap-2 px-2" : "gap-4 px-4")}>
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
        <SendBudgetDrawer
          mode="leads"
          isOpen={sendProposalModalOpen}
          onClose={() => {
            setSendProposalModalOpen(false);
            setLeadForProposal(null);
          }}
          leadId={leadForProposal.id}
          leadName={leadForProposal.nome}
          leadPhone={leadForProposal.telefone || undefined}
        />
      )}
    </div>
  );
}

