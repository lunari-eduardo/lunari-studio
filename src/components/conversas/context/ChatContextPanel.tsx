/**
 * Painel Contextual Direito do Lunari Conversas.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  StickyNote,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Chat, EnrichedChat, Nota } from '@/modules/conversas/types';
import { useConversasContactContext } from '@/hooks/useConversasContactContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

import { TemplatesListTab } from '../templates/TemplatesListTab';
import { ClientLinkModal } from './modals/ClientLinkModal';
import LeadFormModal from '@/components/leads/LeadFormModal';
import { useAppContext } from '@/contexts/AppContext';
import { useLeads } from '@/hooks/useLeads';
import { useClientesRealtime } from '@/hooks/useClientesRealtime';
import { useConversasContatos } from '@/hooks/useConversasContatos';
import { SmartSessionCard } from './cards/SmartSessionCard';
import { QuickActionsCard } from './cards/QuickActionsCard';
import { ContactHeaderCard } from './cards/ContactHeaderCard';
import { useCommercialIntent } from '@/hooks/useCommercialIntent';
import { useFollowUpEngine } from '@/hooks/useFollowUpEngine';
import { FollowUpAlertCard } from './cards/FollowUpAlertCard';
import { SessionHistoryList } from './cards/SessionHistoryList';
import { ActiveBudgetsCard } from './cards/ActiveBudgetsCard';
import { SendBudgetDrawer } from './modals/SendBudgetDrawer';

export interface ChatContextPanelProps {
  chat: Chat | EnrichedChat;
  notas: Nota[];
  messages?: any[];
  onAddNota: (content: string) => Promise<void> | void;
  onDeleteNota: (id: string) => Promise<void> | void;
  onClose: () => void;
  isDrawer?: boolean;
  onInsertToComposer?: (text: string) => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function ChatContextPanel({
  chat,
  notas,
  onAddNota,
  onDeleteNota,
  onClose,
  isDrawer = false,
  onInsertToComposer,
  messages = [],
}: ChatContextPanelProps) {
  const navigate = useNavigate();
  const { addLead, convertToClient } = useLeads();
  const { setSelectedClientForScheduling } = useAppContext();
  const { atualizarCliente } = useClientesRealtime();
  const { updateContato } = useConversasContatos();
  const [notaDraft, setNotaDraft] = useState('');
  const [submittingNota, setSubmittingNota] = useState(false);
  const [notasExpanded, setNotasExpanded] = useState(false);
  const [isClientLinkModalOpen, setIsClientLinkModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isBudgetDrawerOpen, setIsBudgetDrawerOpen] = useState(false);

  const contextData = useConversasContactContext(chat);
  const { unifiedContext, sessoes, vincularAmbos, vincularCliente } = contextData;
  const { state, contact, client, lead, nextSession, lastSession, activeWorkflow, gallery, templateContext, isLoading, error } = unifiedContext;

  const isLeadFinished = lead?.status ? ['fechado', 'perdido', 'ganho', 'convertido', 'lost', 'won'].includes(lead.status.toLowerCase()) : false;
  const hasOpenLead = !!lead?.id && !isLeadFinished;

  const handleLinkClient = async (clienteId: string) => {
    if (!chat.contato_id) return;
    try {
      await vincularCliente(clienteId);
      toast.success('Cliente vinculado com sucesso!');
      setIsClientLinkModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenWorkflow = (id?: string) => {
    let targetId = id || nextSession?.session_id || activeWorkflow?.session_id || lastSession?.session_id;
    if (targetId) {
      const sess = sessoes.find(s => s.session_id === targetId || s.id === targetId);
      let dateParams = '';
      if (sess && sess.data_sessao) {
        const parts = sess.data_sessao.split('T')[0].split('-');
          if (parts.length >= 2) {
            dateParams = `&month=${parseInt(parts[1], 10)}&year=${parseInt(parts[0], 10)}`;
          }
      }
      navigate(`/app/workflow?open_session=${targetId}${dateParams}`);
    } else {
      navigate('/app/workflow');
    }
  };

  const handleAddNota = async () => {
    if (!notaDraft.trim()) return;
    try {
      setSubmittingNota(true);
      await onAddNota(notaDraft.trim());
      setNotaDraft('');
    } catch (err) {
      toast.error('Erro ao salvar nota');
    } finally {
      setSubmittingNota(false);
    }
  };

  // UI Prioridade 1: Loading
  if (isLoading) {
    return (
      <div className={cn("flex flex-col h-full bg-[#FAFAFA] dark:bg-[#0D0D0D]", !isDrawer && "w-[340px] xl:w-[380px] border-l border-black/[0.06] dark:border-white/[0.08]")}>
        <div className="flex-1 p-4 flex flex-col gap-4 animate-pulse">
          <div className="h-16 bg-black/[0.04] dark:bg-white/[0.05] rounded-xl w-full"></div>
          <div className="h-40 bg-black/[0.04] dark:bg-white/[0.05] rounded-xl w-full"></div>
          <div className="h-20 bg-black/[0.04] dark:bg-white/[0.05] rounded-xl w-full"></div>
        </div>
      </div>
    );
  }

  // UI Prioridade 2: Error
  if (error) {
    return (
      <div className={cn("flex flex-col h-full bg-[#FAFAFA] dark:bg-[#0D0D0D]", !isDrawer && "w-[340px] xl:w-[380px] border-l border-black/[0.06] dark:border-white/[0.08]")}>
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="h-8 w-8 text-red-500/80" />
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Erro ao carregar contexto</p>
          <p className="text-xs text-zinc-500">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  // UI Prioridade 3: State Machine
  return (
    <div className={cn("flex flex-col h-full bg-[#FAFAFA] dark:bg-[#0D0D0D]", !isDrawer && "w-[340px] xl:w-[380px] border-l border-black/[0.06] dark:border-white/[0.08]")}>
      <div className="h-14 flex items-center justify-between px-4 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0 bg-white/50 dark:bg-[#121212]/50 backdrop-blur-md">
        <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-500 dark:text-zinc-400">
          Painel do Contato
        </span>
        <button onClick={onClose} className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
        <div className="p-4 flex flex-col gap-4">
          <ContactHeaderCard 
            chat={chat} 
            context={unifiedContext} 
            onCreateLead={() => setIsLeadModalOpen(true)}
            onLinkClient={!client?.id ? () => setIsClientLinkModalOpen(true) : undefined}
            onOpenClient={client?.id ? () => navigate(`/app/clientes/${client.id}`) : undefined}
          />

          {(lead?.id || client?.id) && (
            <ActiveBudgetsCard 
              leadId={lead?.id}
              clienteId={client?.id}
              sessoes={sessoes}
              onOpenDrawer={() => setIsBudgetDrawerOpen(true)}
            />
          )}

          {/* FLUXO OPERACIONAL: Próxima Sessão ou Sessão Ativa */}
          {state === 'NEXT_SESSION' && nextSession && (
            <SmartSessionCard 
              sessoes={[nextSession]} 
              onOpenWorkflow={handleOpenWorkflow} 
              onNavigate={navigate} 
              variant="next"
            />
          )}

          {state === 'ACTIVE_SESSION' && activeWorkflow && (
            <SmartSessionCard 
              sessoes={[activeWorkflow]} 
              onOpenWorkflow={handleOpenWorkflow} 
              onNavigate={navigate} 
              variant="post_production"
            />
          )}

          <SessionHistoryList
            sessoes={sessoes.filter(s => s.id !== nextSession?.id && s.id !== activeWorkflow?.id)}
            onOpenWorkflow={handleOpenWorkflow}
          />

          <TemplatesListTab
            chat={chat}
            messages={messages}
            suggestedCategory={templateContext.category}
            suggestedStep={templateContext.stage}
            onInsertToComposer={onInsertToComposer ?? (() => {})}
          />

          <QuickActionsCard 
            state={state} 
            onNavigate={navigate} 
            onCreateLead={() => setIsLeadModalOpen(true)}
            canCreateLead={!hasOpenLead}
            onOpenWorkflow={() => handleOpenWorkflow()}
            onSchedule={() => {
              if (client?.id) {
                setSelectedClientForScheduling(client.id);
              }
              navigate('/app/agenda');
            }}
          />

          {/* Notas Internas */}
          <div className={cn(
            "flex flex-col rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all overflow-hidden",
            notasExpanded && "pb-2"
          )}>
            <div 
              onClick={() => setNotasExpanded(!notasExpanded)}
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <StickyNote className="h-4 w-4 text-zinc-400" />
                <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  Notas internas
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-yellow-500/10 text-[#A87E43] dark:text-[#D4AF37] text-[10px] font-bold">
                    {notas.length}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                {notasExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </div>

            {notasExpanded && (
              <div className="px-3 flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  {notas.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">Nenhuma nota registrada.</p>
                  ) : (
                    notas.map((n) => (
                      <div key={n.id} className="relative group p-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 text-xs text-zinc-700 dark:text-zinc-300">
                        <p className="whitespace-pre-wrap leading-relaxed pr-6">{n.content}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-yellow-200/50 dark:border-yellow-900/30">
                          <span className="text-[10px] text-yellow-600/70 dark:text-yellow-600/50 font-medium">
                            {formatDate(n.created_at)}
                          </span>
                          <button onClick={() => onDeleteNota(n.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-500/70 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="relative rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#151515] shadow-sm focus-within:border-zinc-300 dark:focus-within:border-zinc-700 focus-within:ring-2 focus-within:ring-zinc-100 dark:focus-within:ring-zinc-800/50 transition-all overflow-hidden">
                  <Textarea 
                    value={notaDraft}
                    onChange={(e) => setNotaDraft(e.target.value)}
                    placeholder="Adicionar uma nova nota..."
                    className="min-h-[72px] resize-none border-0 focus-visible:ring-0 text-xs px-3 py-2.5 bg-transparent"
                  />
                  <div className="flex justify-end p-1.5 border-t border-black/[0.04] dark:border-white/[0.05] bg-zinc-50/50 dark:bg-black/20">
                    <Button 
                      size="sm" 
                      onClick={handleAddNota} 
                      disabled={submittingNota || !notaDraft.trim()}
                      className="h-7 text-[10px] px-3 font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white"
                    >
                      {submittingNota ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <SendBudgetDrawer
        isOpen={isBudgetDrawerOpen}
        onClose={() => setIsBudgetDrawerOpen(false)}
        leadId={lead?.id}
        clienteId={client?.id}
        onInsertToComposer={onInsertToComposer ?? (() => {})}
      />
      <ClientLinkModal
        isOpen={isClientLinkModalOpen}
        onClose={() => setIsClientLinkModalOpen(false)}
        onLink={handleLinkClient}
        />
      {isLeadModalOpen && (
        <LeadFormModal
          open={isLeadModalOpen}
          onOpenChange={setIsLeadModalOpen}
          mode="create"
          initial={{
            nome: client?.nome || chat.contato_nome || '',
            telefone: client?.telefone || chat.contato_phone_normalized || chat.id.split('@')[0] || '',
            clienteId: client?.id,
            origem: 'WhatsApp',
            observacoes: '',
          } as any}
          onSubmit={async (data) => {
            try {
              if (client?.id) {
                data.clienteId = client.id;
                await atualizarCliente(client.id, {
                  nome: data.nome,
                  telefone: data.telefone || undefined,
                  email: data.email || undefined
                });
              }
              const newLead = await addLead(data);
              
              let finalClientId = client?.id;
              if (!finalClientId) {
                const newClient = await convertToClient(newLead.id);
                if (newClient) finalClientId = newClient.id;
              }
              
              await vincularAmbos({ leadId: newLead.id, clienteId: finalClientId });
              
              if (chat.contato_id) {
                await updateContato(chat.contato_id, {
                  nome: data.nome,
                  tipo: 'cliente'
                });
              }
              
              toast.success("Lead criado com sucesso!");
              setIsLeadModalOpen(false);
            } catch (error) {
              console.error("Erro ao criar lead:", error);
              toast.error("Erro ao criar lead");
            }
          }}
        />
      )}
    </div>
  );
}










