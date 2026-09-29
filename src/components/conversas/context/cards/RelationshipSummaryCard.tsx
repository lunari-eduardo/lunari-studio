import { User, Target, Link, Info, Sparkles, TrendingUp, CalendarDays, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UnifiedContactContext } from '@/hooks/useConversasContactContext';

interface RelationshipSummaryCardProps {
  context: UnifiedContactContext;
  onCreateLead: () => void;
  onLinkClient: () => void;
}

export function RelationshipSummaryCard({ context, onCreateLead, onLinkClient }: RelationshipSummaryCardProps) {
  const { state, contact, lead, metrics } = context;

  const formatDate = (date: Date | null) => {
    if (!date) return 'Desconhecido';
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (state === 'NEW_CONTACT') {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-xl border border-[#10B981]/30 bg-gradient-to-br from-[#10B981]/10 to-transparent p-3 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#10B981]" />
              <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">Novo Contato</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#059669] border border-[#10B981]/30">
              Oportunidade
            </span>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={onCreateLead} className="w-full h-9 text-[11px] font-semibold bg-[#10B981] hover:bg-[#059669] text-white rounded-lg shadow-sm transition-all">
              <Target className="h-3.5 w-3.5 mr-1.5" />
              Criar Lead / Oportunidade
            </Button>
            <Button onClick={onLinkClient} variant="ghost" className="w-full h-8 text-[11px] font-medium text-muted-foreground hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-black/5 dark:hover:border-white/5">
              <Link className="h-3.5 w-3.5 mr-1.5 opacity-70" />
              Vincular Cliente Existente
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col gap-2.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">Primeiro contato</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatDate(contact.firstContactAt) || 'Hoje'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Origem real</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">{contact.source}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'LEAD') {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-xl border border-[#3B82F6]/30 bg-gradient-to-br from-[#3B82F6]/10 to-transparent p-3 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[#3B82F6]" />
              <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">Lead Comercial</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col gap-2.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">Etapa comercial</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">{lead?.status || 'Em andamento'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Interesse</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{lead?.origem || 'Diversos'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'CLIENT') {
    return (
      <div className="flex flex-col gap-2">
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-zinc-400" />
              Resumo do Relacionamento
            </span>
          </div>
          <div className="flex flex-col gap-2.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-500 flex items-center gap-1.5"><CalendarDays className="w-3 h-3"/> Cliente desde</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatDate(metrics.clientSince)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 flex items-center gap-1.5"><TrendingUp className="w-3 h-3"/> Ensaios realizados</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{metrics.totalSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 flex items-center gap-1.5"><BarChart3 className="w-3 h-3"/> Ticket Total</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(metrics.lifetimeValue)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE_SESSION e POST_PRODUCTION não exibem sumário no topo, o SmartSessionCard assume protagonismo.
  return null;
}
