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
import { useLeadIntentAnalyzer } from '@/hooks/useLeadIntentAnalyzer';
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

  const resolvedCategoryForTemplates = (() => {
    if (chatState === 'UNKNOWN') return aiSuggestedCategory;
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
      <div className="px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Painel do Contato
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          title="Fechar painel"
          aria-label="Fechar painel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ─── Corpo do Painel ────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto p-3.5 space-y-4"
        style={isDrawer ? { paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' } : undefined}
      >
        {renderStateCards()}

        {/* ─── Notas Internas e Rodapé Fixo ───────────────────────────────── */}
        <div className="mt-6 border-t border-black/[0.05] dark:border-white/[0.06] pt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <StickyNote className="h-4 w-4 text-zinc-500" />
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Notas Internas</span>
          </div>
          
          <div className="space-y-2 mb-3">
            {notas.length === 0 ? (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                Nenhuma nota registrada.
              </p>
            ) : (
              notas.map((n) => (
                <div
                  key={n.id}
                  className="group rounded-lg bg-white dark:bg-[#1E1E1E] border border-black/[0.05] dark:border-white/[0.06] p-2.5 text-xs shadow-sm"
                >
                  <p className="whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    {n.content}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/[0.03] dark:border-white/[0.03]">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                      {n.created_at ? new Date(n.created_at).toLocaleDateString('pt-BR') : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteNota(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-0.5"
                      title="Excluir nota"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* ─── Input Fixo de Notas ────────────────────────────────────────── */}
      <div
        className="p-3 border-t border-black/[0.05] dark:border-white/[0.06] bg-[#FBFBF9] dark:bg-[#181818] space-y-2 shrink-0"
        style={isDrawer ? { paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' } : undefined}
      >
        <Textarea
          value={notaDraft}
          onChange={e => setNotaDraft(e.target.value)}
          placeholder="Escreva uma anotação interna..."
          rows={2}
          className="resize-none text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-black/[0.06] dark:border-white/[0.08]"
        />
        <Button
          onClick={handleAddNota}
          disabled={!notaDraft.trim() || submittingNota}
          size="sm"
          className="w-full bg-[#C9A87C] hover:bg-[#b89567] text-white text-xs h-8"
        >
          {submittingNota ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5 mr-1" /> Salvar Nota</>}
        </Button>
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
