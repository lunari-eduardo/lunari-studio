import { useState, useMemo } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Clock, MessageCircle, TrendingUp, FileText, UserPlus, Plus } from 'lucide-react';
import { useLeadInteractions } from '@/hooks/useLeadInteractions';
import { useLeadShares } from '@/hooks/useLeadShares';
import type { Lead } from '@/types/leads';
import type { LeadInteraction } from '@/types/leadInteractions';
import { cn } from '@/lib/utils';

interface LeadHistoryPanelProps {
  lead: Lead;
}

const InteractionIcon = ({ tipo, className }: { tipo: LeadInteraction['tipo'], className?: string }) => {
  const baseProps = { className: cn("w-3.5 h-3.5", className), strokeWidth: 2 };
  switch (tipo) {
    case 'criacao': return <UserPlus {...baseProps} />;
    case 'mudanca_status': return <TrendingUp {...baseProps} />;
    case 'conversa': return <MessageCircle {...baseProps} />;
    case 'orcamento': return <FileText {...baseProps} />;
    case 'followup': return <Clock {...baseProps} />;
    default: return <MessageCircle {...baseProps} />;
  }
};

const getLabel = (tipo: LeadInteraction['tipo']) => {
  switch (tipo) {
    case 'criacao': return 'Criado';
    case 'mudanca_status': return 'Status Alterado';
    case 'conversa': return 'Conversa';
    case 'orcamento': return 'Orçamento';
    case 'followup': return 'Follow-up';
    case 'manual': return 'Manual';
    default: return 'Interação';
  }
};

export default function LeadHistoryPanel({ lead }: LeadHistoryPanelProps) {
  const { addInteraction, getInteractionsForLead } = useLeadInteractions();
  const { shares } = useLeadShares(lead.id);
  
  const [newInteraction, setNewInteraction] = useState('');
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);

  // Combina as interações do Kanban com os eventos reais de envio de orçamentos
  const interactions = useMemo(() => {
    const baseInteractions = getInteractionsForLead(lead);
    
    const shareInteractions: LeadInteraction[] = shares.flatMap(share => {
      const events: LeadInteraction[] = [];
      
      events.push({
        id: `share-${share.id}`,
        leadId: lead.id,
        tipo: 'orcamento',
        descricao: `Orçamento enviado: ${share.material?.title || 'Proposta'}`,
        detalhes: share.custom_message ? `Mensagem: "${share.custom_message}"` : 'Enviado link rastreável exclusivo',
        timestamp: share.created_at,
        automatica: true
      });
      
      if (share.sessions && share.sessions.length > 0) {
        share.sessions.forEach((session: any) => {
          events.push({
            id: `session-${session.id}`,
            leadId: lead.id,
            tipo: 'conversa',
            descricao: 'O cliente abriu o orçamento',
            detalhes: `Proposta: ${share.material?.title || 'Proposta'}`,
            timestamp: session.created_at,
            automatica: true
          });

          if (session.events && session.events.length > 0) {
            session.events.forEach((evt: any) => {
              if (evt.event_type === 'cta_click') {
                events.push({
                  id: `event-${evt.id}`,
                  leadId: lead.id,
                  tipo: 'conversa',
                  descricao: 'O cliente clicou no WhatsApp',
                  detalhes: `A partir da proposta: ${share.material?.title || 'Proposta'}`,
                  timestamp: evt.created_at,
                  automatica: true
                });
              }
            });
          }
        });
      }
      
      return events;
    });

    const all = [...baseInteractions, ...shareInteractions];
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [lead, getInteractionsForLead, shares]);

  const handleAddManualInteraction = () => {
    if (!newInteraction.trim()) return;

    addInteraction(
      lead.id,
      'manual',
      newInteraction.trim(),
      false
    );

    setNewInteraction('');
    setIsAddingInteraction(false);
  };

  return (
    <div className="w-full flex flex-col pt-2">
      <div className="flex justify-end mb-6">
        {!isAddingInteraction && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingInteraction(true)}
            className="h-8 text-[12px] text-muted-foreground hover:text-foreground font-medium rounded-lg px-3"
          >
            + Adicionar interação
          </Button>
        )}
      </div>

      {isAddingInteraction && (
        <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl mb-6">
          <Textarea
            placeholder="Descreva a interação com o lead..."
            value={newInteraction}
            onChange={(e) => setNewInteraction(e.target.value)}
            className="min-h-[80px] bg-white dark:bg-black resize-none border-border/40 focus-visible:ring-1 focus-visible:ring-[#D4AF37] focus-visible:border-[#D4AF37]"
          />
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setIsAddingInteraction(false);
                setNewInteraction('');
              }}
              className="h-8 text-xs font-medium rounded-lg"
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleAddManualInteraction} className="h-8 text-xs bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium rounded-lg px-4">
              Salvar
            </Button>
          </div>
        </div>
      )}

      {interactions.length === 0 ? (
        <div className="text-left text-muted-foreground italic text-[13px] py-4 px-2">
          Nenhuma interação registrada ainda.
        </div>
      ) : (
        <div className="relative border-l border-border/30 ml-4 space-y-8 pb-4">
          {interactions.map((interaction, index) => {
            const isFollowUp = interaction.tipo === 'followup';
            const isManual = !interaction.automatica && interaction.tipo === 'manual';
            const isOrcamento = interaction.tipo === 'orcamento';
            
            return (
              <div key={interaction.id} className="relative pl-6">
                {/* Timeline Dot */}
                <div className={cn(
                  "absolute -left-[13px] top-1 w-6 h-6 rounded-full flex items-center justify-center border-4 border-white dark:border-[#121212]",
                  isFollowUp ? "bg-[#D4AF37] text-white" : 
                  isOrcamento ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : 
                  isManual ? "bg-emerald-500 text-white" : 
                  "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                )}>
                  <InteractionIcon tipo={interaction.tipo} className="w-2.5 h-2.5 text-current" />
                </div>
                
                {/* Content */}
                <div className="flex flex-col pt-0.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-foreground tracking-tight">
                      {getLabel(interaction.tipo)}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground/60">
                      há {formatDistanceToNowStrict(new Date(interaction.timestamp), { locale: ptBR })}
                    </span>
                  </div>
                  
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {interaction.descricao}
                  </p>
                  
                  {interaction.detalhes && (
                    <p className="text-[12px] text-muted-foreground/80 mt-1.5 italic">
                      {interaction.detalhes}
                    </p>
                  )}
                  
                  {interaction.statusAnterior && interaction.statusNovo && (
                    <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-medium text-muted-foreground">
                      <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{interaction.statusAnterior}</span>
                      <span>→</span>
                      <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{interaction.statusNovo}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}