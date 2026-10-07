import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Mail, Phone, Clock, Check, MessageCircle, FileText, 
  MoreVertical, X, Copy, CalendarDays 
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import type { Lead } from "@/types/leads";
import LeadHistoryPanel from "./LeadHistoryPanel";
import LeadCommercialSection from "./LeadCommercialSection";
import LeadFormModal from "./LeadFormModal";
import LeadActionsPopover from "./LeadActionsPopover";
import { useLeads } from "@/hooks/useLeads";
import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { normalizeBrPhone } from "@/lib/phone";

interface LeadDetailsModalProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvert?: () => void;
  onDelete?: () => void;
  onStartConversation?: () => void;
  onScheduleClient?: () => void;
  onMarkAsScheduled?: () => void;
  onViewAppointment?: () => void;
  onSendProposal?: () => void;
  onMoveToHistory?: () => void;
}

// Helper to get initials
function getInitials(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function LeadDetailsModal({ 
  lead, open, onOpenChange, onConvert, onDelete,
  onStartConversation = () => {},
  onScheduleClient, onMarkAsScheduled, onViewAppointment, onSendProposal, onMoveToHistory
}: LeadDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { updateLead } = useLeads();
  const { statuses } = useLeadStatuses();
  
  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNowStrict(new Date(lead.dataCriacao), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "Data inválida";
    }
  }, [lead.dataCriacao]);

  const isConverted = lead.status === "fechado" || lead.status === "convertido";
  const isLost = lead.status === "perdido";

  // Actions
  const handleStartConversation = () => {
    onStartConversation();
    onOpenChange(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isEditing) {
    return (
      <LeadFormModal
        open={true}
        onOpenChange={(v) => {
          if (!v) setIsEditing(false);
        }}
        mode="edit"
        initial={lead}
        onSubmit={async (data) => {
          await updateLead(lead.id, data);
          setIsEditing(false);
        }}
      />
    );
  }

  // Find current status order
  const currentStatusObj = statuses.find(s => s.key === lead.status);
  const currentStatusOrder = currentStatusObj?.order || 0;
  
  // Status pipeline to show in UI
  const pipelineStatuses = statuses.filter(s => !s.isConverted && !s.isLost).sort((a, b) => (a.order || 0) - (b.order || 0));
  const convertedStatus = statuses.find(s => s.isConverted);
  const lostStatus = statuses.find(s => s.isLost);
  
  // If lead is converted, show converted at end, otherwise if lost, show lost, else show a faded closed step
  const finalSteps = [];
  if (isConverted && convertedStatus) finalSteps.push(convertedStatus);
  else if (isLost && lostStatus) finalSteps.push(lostStatus);
  else if (convertedStatus) finalSteps.push(convertedStatus);
  else finalSteps.push({ id: 'fechado', key: 'fechado', name: 'Fechado', order: 999, color: '#10b981' });

  const allDisplayStatuses = [...pipelineStatuses, ...finalSteps];

  // Determinar a próxima ação sugerida
  let nextAction = {
    title: "Conversar com Lead",
    subtitle: "Inicie o contato inicial",
    icon: MessageCircle,
    button: "Conversar",
    action: handleStartConversation
  };

  if (lead.status === 'novo_interessado') {
    nextAction = {
      title: "Enviar Orçamento",
      subtitle: "Apresente seus valores",
      icon: FileText,
      button: "Enviar",
      action: onSendProposal || handleStartConversation
    };
  } else if (lead.status === 'orcamento_enviado') {
    nextAction = {
      title: "Fazer follow-up",
      subtitle: lead.ultimaInteracao ? `Último contato há ${formatDistanceToNowStrict(new Date(lead.ultimaInteracao), { locale: ptBR })}.` : "Aguardando resposta",
      icon: Clock,
      button: "Conversar",
      action: handleStartConversation
    };
  } else if (isConverted) {
    nextAction = {
      title: "Agendar Sessão",
      subtitle: "Definir data para as fotos",
      icon: CalendarDays,
      button: "Agendar",
      action: onScheduleClient || (() => {})
    };
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[540px] max-w-full p-0 flex flex-col h-full border-l border-border/50 bg-[#F7F6F3] dark:bg-[#121212] overflow-hidden [&>button:last-child]:hidden">
        
        {/* Header fixo no topo */}
        <div className="flex-shrink-0 bg-background border-b border-border/60 px-6 py-5 flex items-start justify-between z-10 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-border/50 shrink-0">
              <span className="text-lg font-medium text-foreground">{getInitials(lead.nome)}</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold tracking-tight leading-none mb-2">{lead.nome}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-50 border-transparent">Lead</Badge>
                {lead.origem && (
                  <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border/60">{lead.origem}</Badge>
                )}
                <span className="text-[11px] text-muted-foreground ml-1">Criado {timeAgo}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={handleStartConversation} size="sm" className="h-8 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-lunar-accent dark:text-zinc-900 dark:hover:bg-[#C5A028] shadow-sm text-xs font-semibold px-3 hidden sm:flex">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              Conversar
            </Button>
            
            <LeadActionsPopover
              lead={lead}
              onStartConversation={handleStartConversation}
              onShowDetails={() => {}}
              onConvert={onConvert}
              onDelete={onDelete || (() => {})}
              onScheduleClient={onScheduleClient}
              onMarkAsScheduled={onMarkAsScheduled}
              onViewAppointment={onViewAppointment}
              onSendProposal={onSendProposal}
              onMoveToHistory={onMoveToHistory}
            >
              <Button variant="outline" size="icon" className="h-8 w-8 bg-background shadow-sm border-border/60">
                <MoreVertical className="h-4 w-4 text-foreground" />
              </Button>
            </LeadActionsPopover>

            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
          
          {/* Status do Lead */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Status do Lead</h3>
            <div className="bg-background rounded-2xl border border-border/60 p-5 shadow-sm">
              <div className="flex items-center justify-between relative">
                {/* Linha de fundo conectando todos os passos */}
                <div className="absolute left-[5%] right-[5%] top-[14px] h-[2px] bg-muted z-0"></div>
                
                {allDisplayStatuses.map((s, i) => {
                  const isCurrent = lead.status === s.key;
                  const isPast = !isCurrent && !isLost && (s.order || 0) < currentStatusOrder;
                  const isLostStep = isLost && s.isLost;
                  const isConvertedStep = isConverted && s.isConverted;
                  
                  const isHighlight = isCurrent || isPast || isLostStep || isConvertedStep;
                  
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-2 relative z-10 w-1/4">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-300",
                        isCurrent && !isLost && !isConverted ? "bg-[#FFF9E6] border-[#D4AF37] text-[#D4AF37] dark:bg-[#D4AF37]/10" : 
                        (isPast || isConvertedStep) ? "bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-500/10" :
                        isLostStep ? "bg-red-50 border-red-500 text-red-600 dark:bg-red-500/10" :
                        "bg-background border-muted text-muted-foreground"
                      )}>
                        {isPast || isConvertedStep ? <Check className="w-3.5 h-3.5" /> : 
                         isLostStep ? <X className="w-3.5 h-3.5" /> : 
                         (i + 1)}
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium text-center leading-tight px-1",
                        isHighlight ? "text-foreground" : "text-muted-foreground"
                      )}>{s.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Próxima Ação */}
            {!isConverted && !isLost && (
              <div className="bg-[#FFF9E6] dark:bg-[#D4AF37]/5 border border-[#D4AF37]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-[#1A1A1A] flex items-center justify-center shrink-0 shadow-sm border border-[#D4AF37]/20">
                    <nextAction.icon className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[#D4AF37] uppercase tracking-wider mb-0.5">Próxima Ação</p>
                    <h4 className="text-sm font-semibold text-foreground">{nextAction.title}</h4>
                    <p className="text-xs text-muted-foreground">{nextAction.subtitle}</p>
                  </div>
                </div>
                <Button onClick={nextAction.action} className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-lunar-accent dark:text-zinc-900 dark:hover:bg-[#C5A028] text-xs h-9 px-4 rounded-xl shadow-sm shrink-0">
                  {nextAction.icon !== Clock && <nextAction.icon className="w-3.5 h-3.5 mr-1.5" />}
                  {nextAction.button}
                </Button>
              </div>
            )}
          </div>

          {/* Informações de Contato */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">Informações de Contato</h3>
              {lead.telefone && (
                <Button variant="outline" size="sm" onClick={handleStartConversation} className="h-7 text-[11px] text-green-600 border-green-200 bg-green-50 hover:bg-green-100 dark:bg-green-900/10 dark:border-green-900/30 dark:text-green-500 rounded-full px-3">
                  <MessageCircle className="w-3 h-3 mr-1.5" /> Ver no WhatsApp
                </Button>
              )}
            </div>
            
            <div className="bg-background rounded-2xl border border-border/60 p-2 shadow-sm space-y-0.5">
              <div className="flex items-center p-2.5 rounded-xl hover:bg-muted/50 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center shrink-0 mr-3 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Telefone</p>
                  <p className="text-sm text-foreground font-medium truncate">{lead.telefone ? normalizeBrPhone(lead.telefone) : "Não informado"}</p>
                </div>
                {lead.telefone && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopy(lead.telefone!)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-center p-2.5 rounded-xl hover:bg-muted/50 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center shrink-0 mr-3 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium mb-0.5">E-mail</p>
                  <p className="text-sm text-foreground font-medium truncate">{lead.email || "Não informado"}</p>
                </div>
                {lead.email && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopy(lead.email!)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">Observações</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7 text-[11px] text-muted-foreground hover:text-foreground">
                {lead.observacoes ? "Editar" : "+ Adicionar"}
              </Button>
            </div>
            
            <div className="bg-background rounded-2xl border border-border/60 p-4 shadow-sm min-h-[80px]">
              {lead.observacoes ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.observacoes}</p>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-4">
                  <p className="text-xs text-muted-foreground">Nenhuma observação adicionada.</p>
                </div>
              )}
            </div>
          </div>

          {/* Orçamentos e Propostas (Adicionado conforme solicitação) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Orçamentos e Propostas</h3>
            <div className="bg-background rounded-2xl border border-border/60 shadow-sm overflow-hidden p-2">
              <LeadCommercialSection 
                leadId={lead.id} 
                leadName={lead.nome} 
                leadPhone={lead.telefone} 
              />
            </div>
          </div>

          {/* Atividades */}
          <Accordion type="single" collapsible defaultValue="atividades" className="w-full">
            <AccordionItem value="atividades" className="border-none">
              <AccordionTrigger className="py-2 hover:no-underline rounded-xl px-2 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">Atividades</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 px-1">
                <div className="bg-background rounded-2xl border border-border/60 p-4 shadow-sm">
                  <LeadHistoryPanel lead={lead} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          
        </div>
      </SheetContent>
    </Sheet>
  );
}
