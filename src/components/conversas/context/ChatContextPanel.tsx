/**
 * Painel Contextual Direito do Lunari Conversas.
 * Conecta a conversa com o contexto comercial (Lead/Oportunidade), operacional (Sessões/Workflow),
 * tarefas pendentes, notas internas e atalhos rápidos do sistema.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  StickyNote,
  User,
  Trash2,
  Loader2,
  Sparkles,
  ArrowRight,
  ChevronRight,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Chat, EnrichedChat, Nota } from '@/modules/conversas/types';
import { useConversasContactContext } from '@/hooks/useConversasContactContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

import { TemplatesListTab } from '../templates/TemplatesListTab';
import { Zap } from 'lucide-react';
import { useCategorias } from '@/hooks/useCategorias';
import { FastLeadModal } from './FastLeadModal';

import { useChatStateResolver } from '@/hooks/useChatStateResolver';
import { InterestCard } from './cards/InterestCard';
import { LeadContextCard } from './cards/LeadContextCard';
import { WorkflowContextCard } from './cards/WorkflowContextCard';
import { HistoryCard } from './cards/HistoryCard';
import { QuickActionsCard } from './cards/QuickActionsCard';
import { FinancialSummaryCard } from './cards/FinancialSummaryCard';
import { ContactHeaderCard } from './cards/ContactHeaderCard';
import { useLeadIntentAnalyzer } from '@/hooks/useLeadIntentAnalyzer';
import { useFollowUpEngine } from '@/hooks/useFollowUpEngine';
import { FollowUpAlertCard } from './cards/FollowUpAlertCard';
export interface ChatContextPanelProps {
  chat: Chat | EnrichedChat;
  notas: Nota[];
  messages?: any[];
  onAddNota: (content: string) => Promise<void> | void;
  onDeleteNota: (id: string) => Promise<void> | void;
  onClose: () => void;
  isDrawer?: boolean;
  onInsertToComposer?: (text: string) => void;
  onSendDirectly?: (text: string) => Promise<void> | void;
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
  onSendDirectly,
  messages = [],
}: ChatContextPanelProps) {
  const navigate = useNavigate();
  const [notaDraft, setNotaDraft] = useState('');
  const [submittingNota, setSubmittingNota] = useState(false);

  const {
    cliente,
    lead,
    sessoes,
    cobrancas,
    vincularAmbos,
  } = useConversasContactContext(chat);

  const chatState = useChatStateResolver({ cliente, lead, sessoes });

  const { categorias } = useCategorias();
  const [isFastLeadModalOpen, setIsFastLeadModalOpen] = useState(false);
  const [manualSuggestedCategory, setManualSuggestedCategory] = useState<string | undefined>();
  const isUnknownContact = chatState === 'UNKNOWN';

  const { suggestedCategory: aiSuggestedCategory, analyzing } = useLeadIntentAnalyzer({
    isUnknownContact,
    messages,
    availableCategories: categorias?.map(c => c.nome) || [],
  });

  const { needsFollowUp, daysIgnored, suggestedCategory: followUpSuggestedCategory } = useFollowUpEngine(chat as Chat, lead);

  const resolvedCategoryForTemplates = (() => {
    if (chatState === 'UNKNOWN') return aiSuggestedCategory;
    if (chatState === 'LEAD' && needsFollowUp) return followUpSuggestedCategory;
    if (chatState === 'SESSION') return sessoes?.[0]?.categoria; // ContextSessao tem categoria (string)
    return undefined;
  })();

  const handleAddNota = async () => {
    if (!notaDraft.trim() || submittingNota) return;
    try {
      setSubmittingNota(true);
      await onAddNota(notaDraft.trim());
      setNotaDraft('');
    } finally {
      setSubmittingNota(false);
    }
  };

  const renderStateCards = () => {
    switch (chatState) {
      case 'UNKNOWN':
        return (
          <>
            <InterestCard 
              suggestedCategory={aiSuggestedCategory} 
              onCreateLead={(cat) => {
                setManualSuggestedCategory(cat);
                setIsFastLeadModalOpen(true);
              }}
            />
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <TemplatesListTab
                chat={chat}
                suggestedCategory={resolvedCategoryForTemplates}
                onInsertToComposer={onInsertToComposer ?? (() => {})}
                onSendDirectly={onSendDirectly ?? (() => {})}
              />
            </div>
            <QuickActionsCard state={chatState} hasCliente={false} onNavigate={navigate} />
          </>
        );
      
      case 'LEAD':
        return (
          <>
            <LeadContextCard lead={lead} onOpenCRM={() => navigate('/leads')} />
            {needsFollowUp && <FollowUpAlertCard daysIgnored={daysIgnored} />}
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <TemplatesListTab
                chat={chat}
                suggestedCategory={resolvedCategoryForTemplates}
                onInsertToComposer={onInsertToComposer ?? (() => {})}
                onSendDirectly={onSendDirectly ?? (() => {})}
              />
            </div>
            <QuickActionsCard state={chatState} hasCliente={!!cliente?.id} onNavigate={navigate} />
          </>
        );

      case 'SESSION':
        return (
          <>
            <WorkflowContextCard sessao={sessoes?.[0]} onOpenWorkflow={() => navigate('/workflow')} />
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <TemplatesListTab
                chat={chat}
                suggestedCategory={resolvedCategoryForTemplates}
                onInsertToComposer={onInsertToComposer ?? (() => {})}
                onSendDirectly={onSendDirectly ?? (() => {})}
              />
            </div>
            <FinancialSummaryCard cobrancas={cobrancas} onNavigate={navigate} />
            <QuickActionsCard state={chatState} hasCliente={!!cliente?.id} onNavigate={navigate} />
          </>
        );

      case 'POST_SALE':
        return (
          <>
            <HistoryCard cliente={cliente} onNavigate={navigate} />
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <TemplatesListTab
                chat={chat}
                suggestedCategory={resolvedCategoryForTemplates}
                onInsertToComposer={onInsertToComposer ?? (() => {})}
                onSendDirectly={onSendDirectly ?? (() => {})}
              />
            </div>
            <QuickActionsCard state={chatState} hasCliente={true} onNavigate={navigate} />
          </>
        );
    }
  };

  const Container = isDrawer ? 'div' : 'aside';

  return (
    <Container
      className={cn(
        "flex flex-col h-full bg-[#FBFBF9] dark:bg-[#161616] select-none",
        isDrawer
          ? "w-full"
          : "w-80 lg:w-[400px] xl:w-[440px] 2xl:w-[460px] shrink-0 border-l border-black/[0.06] dark:border-white/[0.08] z-20"
      )}
    >
      {/* ─── Header do Painel ───────────────────────────────────────────── */}
      <div className="px-3 py-3 flex items-center justify-between shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pl-1">
          Painel do Contato
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          title="Fechar painel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ─── Corpo do Painel ────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-3.5 pb-4 space-y-3"
        style={isDrawer ? { paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' } : undefined}
      >
        <ContactHeaderCard chat={chat} state={chatState} />
        {renderStateCards()}

        {/* ─── Notas Internas e Rodapé Fixo ───────────────────────────────── */}
      {/* ─── Notas Internas ────────────────────────────────────────────── */}
        <div className="mt-4 px-1">
          <div className="flex items-center gap-1.5 mb-2.5">
            <StickyNote className="h-3.5 w-3.5 text-[#B8925F]" />
            <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">Notas internas</span>
          </div>
          
          <div className="space-y-2.5">
            {notas.length === 0 ? (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic mb-2">
                Nenhuma nota registrada.
              </p>
            ) : (
              notas.map((n) => (
                <div key={n.id} className="group flex justify-between gap-3 text-xs">
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-300 leading-relaxed text-[11px]">
                      {n.content}
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
                      Você <span className="w-0.5 h-0.5 rounded-full bg-zinc-400"></span> 
                      {n.created_at ? new Date(n.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteNota(n.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity p-0.5 h-fit shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* ─── Input Fixo de Notas (Compacto em 1 linha) ────────────────── */}
      <div
        className="p-3 border-t border-black/[0.05] dark:border-white/[0.06] bg-white dark:bg-[#181818] shrink-0"
        style={isDrawer ? { paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' } : undefined}
      >
        <div className="flex items-center gap-2">
          <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1.5 rounded transition-colors">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.49991 14.5C8.98687 14.5 10.4128 13.909 11.4643 12.8573C12.5157 11.8057 13.1065 10.3795 13.1065 8.89241V3.28479C13.1065 2.16913 12.6633 1.09923 11.8744 0.31034C11.0855 -0.478548 10.0156 -0.921768 8.89991 -0.921768C7.78426 -0.921768 6.71435 -0.478548 5.92547 0.31034C5.13658 1.09923 4.69336 2.16913 4.69336 3.28479V8.89241C4.69336 9.63604 4.98877 10.3492 5.51457 10.875C6.04037 11.4008 6.75359 11.6962 7.49722 11.6962C8.24086 11.6962 8.95408 11.4008 9.47988 10.875C10.0057 10.3492 10.3011 9.63604 10.3011 8.89241V3.28479H8.89831V8.89241C8.89831 9.26392 8.75073 9.62022 8.48799 9.88295C8.22525 10.1457 7.86895 10.2933 7.49744 10.2933C7.12592 10.2933 6.76963 10.1457 6.50689 9.88295C6.24415 9.62022 6.09657 9.26392 6.09657 8.89241V3.28479C6.09657 2.54117 6.39198 1.82795 6.91778 1.30215C7.44358 0.776348 8.1568 0.480938 8.90043 0.480938C9.64407 0.480938 10.3573 0.776348 10.8831 1.30215C11.4089 1.82795 11.7043 2.54117 11.7043 3.28479V8.89241C11.7043 10.0081 11.2611 11.078 10.4722 11.8668C9.6833 12.6557 8.6134 13.0989 7.49774 13.0989C6.38209 13.0989 5.31218 12.6557 4.5233 11.8668C3.73441 11.078 3.2912 10.0081 3.2912 8.89241V3.28479H1.8884V8.89241C1.8884 10.3795 2.47924 11.8057 3.53068 12.8573C4.58212 13.909 6.00826 14.5 7.49522 14.5H7.49991Z" fill="currentColor"/>
            </svg>
          </button>
          
          <Input
            value={notaDraft}
            onChange={e => setNotaDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddNota();
              }
            }}
            placeholder="Adicionar uma nova nota..."
            className="h-8 text-[11px] bg-zinc-50 dark:bg-zinc-900 border-none shadow-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]/50"
          />
          
          <Button
            onClick={handleAddNota}
            disabled={!notaDraft.trim() || submittingNota}
            size="sm"
            className="h-8 px-3 text-[11px] font-semibold bg-[#C9A87C] hover:bg-[#b89567] text-white shrink-0 shadow-sm"
          >
            {submittingNota ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      </div>
        
      <FastLeadModal 
        isOpen={isFastLeadModalOpen}
        onClose={() => {
          setIsFastLeadModalOpen(false);
          setManualSuggestedCategory(undefined);
        }}
        defaultCategory={manualSuggestedCategory}
        chat={chat}
        onLeadCreated={async (leadId, clienteId) => {
          await vincularAmbos({ leadId, clienteId });
        }}
      />
    </Container>
  );
}
