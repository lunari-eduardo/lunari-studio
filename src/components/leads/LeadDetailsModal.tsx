import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Mail, Phone, Clock, Check, MessageCircle, FileText, 
  MoreVertical, X, Copy, CalendarDays, Lock, User, Calendar, Tag, ChevronDown, ChevronRight 
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
      button: "Enviar Orçamento",
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
      {/* 
        Painel extremamente amplo e elegante. 
        Usamos max-w-[800px] ou mais em telas grandes. Fundo branco puro. 
      */}
      <SheetContent 
        className="w-[90vw] sm:max-w-2xl md:max-w-3xl lg:max-w-[850px] p-0 flex flex-col h-full border-l border-border/10 bg-white dark:bg-[#121212] overflow-hidden [&>button:last-child]:hidden shadow-[0_0_50px_rgba(0,0,0,0.1)]"
      >
        
        {/* Cabeçalho minimalista */}
        <div className="flex-shrink-0 bg-white dark:bg-[#121212] px-10 pt-10 pb-6 flex items-start justify-between z-10">
          <div className="flex items-center gap-6">
            {/* Avatar bem maior e de cores pálidas */}
            <div className="w-20 h-20 rounded-full bg-[#F5F2EB] dark:bg-[#1A1A1A] flex items-center justify-center shrink-0">
              <span className="text-2xl font-light text-[#333333] dark:text-[#E0E0E0] tracking-wide">{getInitials(lead.nome)}</span>
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-[28px] font-semibold tracking-tight text-[#111111] dark:text-white leading-none mb-3">{lead.nome}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[11px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-50 border-transparent px-2.5 py-0.5 rounded-full shadow-none">Lead</Badge>
                {lead.origem && (
                  <Badge variant="outline" className="text-[11px] font-medium text-muted-foreground border-border/40 px-2.5 py-0.5 rounded-full shadow-none bg-zinc-50 dark:bg-zinc-900/50">{lead.origem}</Badge>
                )}
                <span className="text-[12px] text-muted-foreground ml-2 font-medium">Criado há {timeAgo}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={handleStartConversation} className="h-10 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-none text-[13px] font-medium px-5 rounded-xl hidden sm:flex transition-all">
              <MessageCircle className="w-4 h-4 mr-2" />
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
              <Button variant="outline" size="icon" className="h-10 w-10 bg-transparent shadow-none border-border/40 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all">
                <MoreVertical className="h-4 w-4 text-foreground" />
              </Button>
            </LeadActionsPopover>

            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all">
                <X className="h-5 w-5" />
              </Button>
            </SheetClose>
          </div>
        </div>

        {/* Scrollable body: sem caixas ou bordas fortes, muito respiro */}
        <div className="flex-1 overflow-y-auto px-10 py-6 space-y-12" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
          
          {/* Status do Lead */}
          <div className="space-y-6">
            <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Status do Lead</h3>
            
            <div className="relative px-4">
              {/* Linha fina invisível ao longo de tudo */}
              <div className="absolute left-8 right-8 top-[14px] h-[1px] bg-border/40 -z-10"></div>
              
              <div className="flex items-center justify-between">
                {allDisplayStatuses.map((s, i) => {
                  const isCurrent = lead.status === s.key;
                  const isPast = !isCurrent && !isLost && (s.order || 0) < currentStatusOrder;
                  const isLostStep = isLost && s.isLost;
                  const isConvertedStep = isConverted && s.isConverted;
                  
                  return (
                    <div key={s.key} className="flex flex-col items-center gap-3 relative z-10 bg-white dark:bg-[#121212] px-2 w-[120px]">
                      <div className={cn(
                        "w-[28px] h-[28px] rounded-full flex items-center justify-center transition-all duration-300",
                        isCurrent && !isLost && !isConverted 
                          ? "border-[1.5px] border-[#D4AF37] text-[#D4AF37] bg-white dark:bg-black" 
                          : (isPast || isConvertedStep) 
                            ? "border-[1.5px] border-emerald-400 text-emerald-500 bg-white dark:bg-black" 
                            : isLostStep 
                              ? "border-[1.5px] border-red-400 text-red-500 bg-white dark:bg-black" 
                              : "border-[1.5px] border-border/40 text-muted-foreground bg-white dark:bg-black"
                      )}>
                        {isCurrent && !isLost && !isConverted ? <Lock className="w-3 h-3" /> :
                         isPast || isConvertedStep ? <Check className="w-3.5 h-3.5" /> : 
                         isLostStep ? <X className="w-3 h-3" /> : 
                         <X className="w-3 h-3 opacity-30" />}
                      </div>
                      <span className={cn(
                        "text-[12px] font-medium text-center leading-tight whitespace-nowrap",
                        (isCurrent || isPast || isConvertedStep || isLostStep) ? "text-foreground" : "text-muted-foreground/60"
                      )}>{s.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Coluna Esquerda: Próxima Ação e Info de Contato */}
            <div className="space-y-12">
              
              {/* Próxima Ação */}
              {!isConverted && !isLost && (
                <div className="bg-[#FDF9EE] dark:bg-[#D4AF37]/5 border border-[#F2E8CE] dark:border-[#D4AF37]/20 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1A1A1A] flex items-center justify-center shrink-0 border border-[#F2E8CE] dark:border-[#D4AF37]/20 shadow-sm">
                      <nextAction.icon className="w-5 h-5 text-[#D4AF37]" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 mt-0.5">
                      <p className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-widest mb-1.5">Próxima ação</p>
                      <h4 className="text-[17px] font-semibold text-foreground mb-1 leading-tight">{nextAction.title}</h4>
                      <p className="text-[13px] text-muted-foreground leading-snug">{nextAction.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={nextAction.action} className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-[13px] h-10 rounded-xl shadow-none font-medium">
                      {nextAction.icon !== Clock && <nextAction.icon className="w-4 h-4 mr-2" />}
                      {nextAction.button}
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10 border-[#F2E8CE] bg-white text-zinc-900 hover:bg-zinc-50 rounded-xl">
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Informações de Contato */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Informações de Contato</h3>
                  {lead.telefone && (
                    <Button variant="outline" size="sm" onClick={handleStartConversation} className="h-8 text-[12px] text-green-600 border-green-200/50 hover:bg-green-50 dark:hover:bg-green-900/10 dark:text-green-500 rounded-full px-4 font-medium shadow-none">
                      <MessageCircle className="w-3.5 h-3.5 mr-2" /> Ver no WhatsApp
                    </Button>
                  )}
                </div>
                
                <div className="space-y-4 px-1">
                  <div className="flex items-center group">
                    <User className="w-4 h-4 text-muted-foreground/60 shrink-0 mr-4" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <p className="text-[14px] text-foreground">{lead.nome}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center group">
                    <Phone className="w-4 h-4 text-muted-foreground/60 shrink-0 mr-4" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <p className="text-[14px] text-foreground">{lead.telefone ? normalizeBrPhone(lead.telefone) : <span className="text-muted-foreground italic">Não informado</span>}</p>
                      {lead.telefone && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopy(lead.telefone!)}>
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center group">
                    <Mail className="w-4 h-4 text-muted-foreground/60 shrink-0 mr-4" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <p className="text-[14px] text-foreground truncate">{lead.email || <span className="text-muted-foreground italic">Não informado</span>}</p>
                      {lead.email && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopy(lead.email!)}>
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center group">
                    <Calendar className="w-4 h-4 text-muted-foreground/60 shrink-0 mr-4" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-foreground">Criado há {timeAgo}</p>
                    </div>
                  </div>

                  {lead.origem && (
                    <div className="flex items-center group">
                      <Tag className="w-4 h-4 text-muted-foreground/60 shrink-0 mr-4" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-foreground">Origem: <span className="font-medium">{lead.origem}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-foreground tracking-tight flex items-center gap-2">
                    <FileText className="w-4 h-4 text-foreground" strokeWidth={2} />
                    Observações
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 text-[12px] text-muted-foreground hover:text-foreground font-medium rounded-lg">
                    {lead.observacoes ? "Editar" : "+ Adicionar"}
                  </Button>
                </div>
                
                <div className="bg-transparent border border-border/40 rounded-xl p-5 min-h-[100px] hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors cursor-text" onClick={() => !lead.observacoes && setIsEditing(true)}>
                  {lead.observacoes ? (
                    <p className="text-[14px] text-foreground whitespace-pre-wrap leading-relaxed">{lead.observacoes}</p>
                  ) : (
                    <p className="text-[14px] text-muted-foreground italic">Nenhuma observação adicionada.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Orçamentos e Atividades */}
            <div className="space-y-12">
              
              {/* Orçamentos e Propostas */}
              <div className="space-y-5">
                <h3 className="text-[15px] font-semibold text-foreground tracking-tight flex items-center gap-2">
                  <FileText className="w-4 h-4 text-foreground" strokeWidth={2} />
                  Orçamentos e Propostas
                </h3>
                <div className="bg-transparent border border-border/40 rounded-xl p-1 overflow-hidden">
                  <LeadCommercialSection 
                    leadId={lead.id} 
                    leadName={lead.nome} 
                    leadPhone={lead.telefone} 
                    minimalStyle={true}
                  />
                </div>
              </div>

              {/* Atividades (Histórico minimalista) */}
              <div className="pt-2 border-t border-border/20">
                <Accordion type="single" collapsible defaultValue="atividades" className="w-full">
                  <AccordionItem value="atividades" className="border-none">
                    <AccordionTrigger className="py-2 hover:no-underline px-0 text-left">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-foreground" strokeWidth={2} />
                        <h3 className="text-[15px] font-semibold text-foreground tracking-tight">Atividades</h3>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-6 pb-2 px-1">
                      <LeadHistoryPanel lead={lead} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

            </div>
          </div>
          
        </div>
      </SheetContent>
    </Sheet>
  );
}
