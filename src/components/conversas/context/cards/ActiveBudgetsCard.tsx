import React, { useState } from 'react';
import { isBefore, subDays } from 'date-fns';
import { FileText, Clock, ExternalLink, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { useContactMaterialShares } from '@/hooks/useMaterialShares';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ActiveBudgetsCard({ 
  leadId, 
  clienteId, 
  sessoes,
  onOpenDrawer
}: { 
  leadId?: string; 
  clienteId?: string; 
  sessoes: any[];
  onOpenDrawer: () => void;
}) {
  const { shares, isLoading } = useContactMaterialShares(leadId, clienteId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return null;

  const now = new Date();
  
  const processedShares = shares.map(share => {
    const sentAt = new Date(share.created_at);
    const sessionsAfterShare = sessoes.filter(s => {
      const sCreated = new Date(s.created_at || s.data_sessao);
      return sCreated > sentAt;
    });

    let isActive = true;
    for (const s of sessionsAfterShare) {
      if (s.data_sessao) {
        const sessDate = new Date(s.data_sessao);
        if (isBefore(sessDate, subDays(now, 25))) {
          isActive = false;
          break;
        }
      }
    }
    
    return { ...share, isActive };
  });

  const activeShares = processedShares.filter(s => s.isActive);

  if (activeShares.length === 0) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-4 w-4 text-zinc-400" />
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">Orçamento</span>
            <span className="text-[11px] text-zinc-500">Nenhum orçamento ativo</span>
          </div>
        </div>
        <button 
          onClick={onOpenDrawer}
          className="text-[11px] font-medium text-[#B8925F] hover:text-[#C9A87C] flex items-center gap-1 transition-colors px-1"
        >
          <Plus className="h-3 w-3" /> Enviar
        </button>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all overflow-hidden",
      expanded && "pb-1"
    )}>
      <div 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-4 w-4 text-zinc-400" />
          <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
            Orçamentos enviados · {activeShares.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-2 flex flex-col gap-2">
          {activeShares.map(share => (
            <div key={share.id} className="p-2.5 rounded-lg border border-black/[0.04] dark:border-white/[0.05] bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col gap-1.5">
              <div className="flex items-start justify-between">
                <span className="text-[12px] font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1">
                  {share.material?.title || 'Proposta'}
                </span>
                <a href={`/p/${share.token}`} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-[#B8925F] transition-colors p-0.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                <Clock className="h-3 w-3 opacity-70" />
                {new Date(share.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={onOpenDrawer} className="mt-1 h-7 text-[11px] text-[#B8925F] hover:text-[#C9A87C] w-full border border-dashed border-black/10 dark:border-white/10">
            <Plus className="h-3 w-3 mr-1.5" /> Novo orçamento
          </Button>
        </div>
      )}
    </div>
  );
}
