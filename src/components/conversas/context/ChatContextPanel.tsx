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
import { FastLeadModal } from './FastLeadModal';
import { SuggestionCard } from './SuggestionCard';

export interface ChatContextPanelProps {
  chat: Chat | EnrichedChat;
  notas: Nota[];
  onAddNota: (content: string) => Promise<void> | void;
  onDeleteNota: (id: string) => Promise<void> | void;
  onClose: () => void;
  initialTab?: 'templates' | 'context' | 'notes';
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
  initialTab = 'templates',
  isDrawer = false,
  onInsertToComposer,
  onSendDirectly,
}: ChatContextPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'templates' | 'context' | 'notes'>(initialTab);
  const [notaDraft, setNotaDraft] = useState('');
  const [submittingNota, setSubmittingNota] = useState(false);
  const [taskDraft, setTaskDraft] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  // Sincronizar aba ativa quando o pai trocar (ex: usuário clicou no botão de Notas, Modelos ou Contexto)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const {
    cliente,
    lead,
    sessoes,
    tarefas,
    orcamentos,
    cobrancas,
    leadsPerdidos,
    isLoading,
    isLinkedToCliente,
    isLinkedToLead,
    vincularCliente,
    vincularLead,
    criarTarefaRapida,
    concluirTarefa,
  } = useConversasContactContext(chat);

  const [isFastLeadModalOpen, setIsFastLeadModalOpen] = useState(false);
  const isUnknownContact = !isLinkedToCliente && !isLinkedToLead;

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

  const handleCreateTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!taskDraft.trim() || submittingTask) return;
    try {
      setSubmittingTask(true);
      await criarTarefaRapida(taskDraft.trim());
      setTaskDraft('');
      toast.success('Tarefa adicionada!');
    } catch {
      // toast já tratado
    } finally {
      setSubmittingTask(false);
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
      <div className="px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
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

      {/* ─── Alternador de Abas (Modelos vs Contexto vs Notas) ───────────── */}
      <div className="flex border-b border-black/[0.05] dark:border-white/[0.06] bg-[#F7F6F3] dark:bg-[#141414] p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all',
            activeTab === 'templates'
              ? 'bg-white dark:bg-[#202020] text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          )}
        >
          <Zap className="h-3.5 w-3.5 text-[#C9A87C]" />
          <span>Modelos</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('context')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all',
            activeTab === 'context'
              ? 'bg-white dark:bg-[#202020] text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-[#C9A87C]" />
          <span>Contexto</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all',
            activeTab === 'notes'
              ? 'bg-white dark:bg-[#202020] text-zinc-900 dark:text-zinc-100 shadow-sm font-semibold'
              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          )}
        >
          <StickyNote className="h-3.5 w-3.5 text-zinc-500" />
          <span>Notas ({notas.length})</span>
        </button>
      </div>

      {/* ─── Corpo do Painel ────────────────────────────────────────────── */}
      {activeTab === 'templates' ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <TemplatesListTab
            chat={chat}
            onInsertToComposer={onInsertToComposer ?? (() => {})}
            onSendDirectly={onSendDirectly ?? (() => {})}
          />
        </div>
      ) : activeTab === 'context' ? (
        <div
          className="flex-1 overflow-y-auto p-3.5 space-y-4"
          style={isDrawer ? { paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' } : undefined}
        >
            <SuggestionCard 
              isUnknownContact={isUnknownContact} 
              onCreateLead={() => setIsFastLeadModalOpen(true)}
            />

            {/* 1. Contexto Comercial / Oportunidade */}
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-[#C9A87C]" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Oportunidade Comercial
                  </span>
                </div>
                {isLinkedToLead && (
                  <button
                    type="button"
                    onClick={() => navigate('/leads')}
                    className="text-[11px] text-[#B8925F] dark:text-[#D4AF37] hover:underline flex items-center gap-0.5"
                  >
                    Ver CRM <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>

              {isLinkedToLead && lead ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <span className="text-zinc-500 dark:text-zinc-400">Estágio:</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 capitalize">
                      {lead.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {lead.valor_estimado != null && (
                    <div className="flex items-center justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                      <span className="text-zinc-500 dark:text-zinc-400">Valor Estimado:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(lead.valor_estimado)}
                      </span>
                    </div>
                  )}
                  {lead.origem && (
                    <div className="flex items-center justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                      <span className="text-zinc-500 dark:text-zinc-400">Origem:</span>
                      <span className="text-zinc-700 dark:text-zinc-300">{lead.origem}</span>
                    </div>
                  )}
                  {lead.needs_follow_up && (
                    <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Follow-up pendente para este contato!</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2.5">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    Nenhum lead ou proposta em aberto para este contato.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/leads')}
                    className="w-full text-xs h-8 border-dashed hover:border-solid hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <Plus className="h-3 w-3 mr-1 text-[#C9A87C]" /> Criar Lead no CRM
                  </Button>
                </div>
              )}
            </div>

            {/* 2. Sessões & Workflow */}
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#C9A87C]" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Sessões & Workflow
                  </span>
                </div>
                {isLinkedToCliente && (
                  <button
                    type="button"
                    onClick={() => navigate('/workflow')}
                    className="text-[11px] text-[#B8925F] dark:text-[#D4AF37] hover:underline flex items-center gap-0.5"
                  >
                    Workflow <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>

              {sessoes.length > 0 ? (
                <div className="space-y-2">
                  {sessoes.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => navigate('/workflow')}
                      className="p-2.5 rounded-lg border border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {s.categoria ? `${s.categoria}${s.pacote ? ` • ${s.pacote}` : ''}` : 'Sessão Fotográfica'}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {formatDate(s.data_sessao)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span className="capitalize">
                          {s.status_workflow?.replace(/_/g, ' ') || 'Em andamento'}
                        </span>
                        {s.valor_total != null && (
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {formatCurrency(s.valor_total)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/agenda')}
                    className="w-full text-xs h-7 text-[#B8925F] dark:text-[#D4AF37] hover:bg-amber-50 dark:hover:bg-amber-950/20"
                  >
                    + Agendar Nova Sessão
                  </Button>
                </div>
              ) : isLinkedToCliente ? (
                <div className="text-center py-2.5">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    Nenhuma sessão agendada para este cliente.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/agenda')}
                    className="w-full text-xs h-8 border-dashed hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <Plus className="h-3 w-3 mr-1 text-[#C9A87C]" /> Agendar Sessão
                  </Button>
                </div>
              ) : (
                <div className="text-center py-2.5">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    Vincule a um cliente para acompanhar histórico de sessões.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/clientes')}
                    className="w-full text-xs h-8 border-dashed hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <User className="h-3 w-3 mr-1 text-[#C9A87C]" /> Acessar Clientes
                  </Button>
                </div>
              )}
            </div>

            {/* 3. Tarefas Rápidas */}
            {isLinkedToCliente && (
              <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#C9A87C]" />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Tarefas Pendentes
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">{tarefas.length}</span>
                </div>

                <div className="space-y-1.5 mb-2.5">
                  {tarefas.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-1 text-center">Nenhuma tarefa pendente.</p>
                  ) : (
                    tarefas.map(t => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-1.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/50 group text-xs"
                      >
                        <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[190px]">
                          {t.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => concluirTarefa(t.id)}
                          className="text-zinc-400 hover:text-emerald-600 transition-colors p-0.5"
                          title="Concluir tarefa"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleCreateTask} className="flex gap-1.5">
                  <Input
                    value={taskDraft}
                    onChange={e => setTaskDraft(e.target.value)}
                    placeholder="Adicionar tarefa rápida..."
                    className="h-7 text-xs bg-zinc-50 dark:bg-zinc-800/50 border-black/[0.06] dark:border-white/[0.06]"
                  />
                  <Button
                    type="submit"
                    disabled={!taskDraft.trim() || submittingTask}
                    size="sm"
                    className="h-7 px-2.5 bg-[#C9A87C] hover:bg-[#b89567] text-white text-xs shrink-0"
                  >
                    {submittingTask ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  </Button>
                </form>
              </div>
            )}

            {/* 4. Ações Rápidas Lunari */}
            <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-2">
                Ações Rápidas
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/propostas')}
                  className="w-full justify-between text-xs h-8 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-[#C9A87C]" />
                    Enviar Orçamento / Proposta
                  </span>
                  <ExternalLink className="h-3 w-3 text-zinc-400" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/agenda')}
                  className="w-full justify-between text-xs h-8 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-[#C9A87C]" />
                    Abrir Agenda
                  </span>
                  <ExternalLink className="h-3 w-3 text-zinc-400" />
                </Button>
                {cliente?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                    className="w-full justify-between text-xs h-8 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <span className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-[#C9A87C]" />
                      Ver Ficha Completa do Cliente
                    </span>
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ─── Aba: Notas Internas ───────────────────────────────────────── */
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notas.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <StickyNote className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Nenhuma nota interna registrada nesta conversa.
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                    Anote detalhes importantes sobre preferências do cliente ou acordos fechados.
                  </p>
                </div>
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

            <div
              className="p-3 border-t border-black/[0.05] dark:border-white/[0.06] bg-white dark:bg-[#181818] space-y-2"
              style={isDrawer ? { paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' } : undefined}
            >
              <Textarea
                value={notaDraft}
                onChange={e => setNotaDraft(e.target.value)}
                placeholder="Escreva uma anotação interna..."
                rows={3}
                className="resize-none text-xs bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-black/[0.06] dark:border-white/[0.08]"
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
          </div>
        )}
        
      <FastLeadModal 
        isOpen={isFastLeadModalOpen}
        onClose={() => setIsFastLeadModalOpen(false)}
        chat={chat}
        onLeadCreated={async (leadId, clienteId) => {
          if (clienteId) await vincularCliente(clienteId);
          await vincularLead(leadId);
        }}
      />
    </Container>
  );
}
