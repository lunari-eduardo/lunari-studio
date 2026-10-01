import React from 'react';
import { isBefore, subDays } from 'date-fns';
import { FileText, Clock, ExternalLink } from 'lucide-react';
import { useContactMaterialShares } from '@/hooks/useMaterialShares';
import { Button } from '@/components/ui/button';

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

  if (isLoading) return null;

  // Split into active and inactive
  const now = new Date();
  
  const processedShares = shares.map(share => {
    // Find sessions created AFTER this share was sent
    const sentAt = new Date(share.created_at);
    const sessionsAfterShare = sessoes.filter(s => {
      const sCreated = new Date(s.created_at || s.data_sessao);
      return sCreated > sentAt;
    });

    let isActive = true;
    for (const s of sessionsAfterShare) {
      if (s.data_sessao) {
        const sessDate = new Date(s.data_sessao);
        // If data_sessao is older than 25 days ago, it's inactive
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
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <FileText className="h-5 w-5" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Nenhum orçamento ativo</p>
          <p className="text-xs text-muted-foreground mt-0.5">Envie uma proposta para iniciar a negociação.</p>
        </div>
        <Button size="sm" onClick={onOpenDrawer} className="mt-1">
          Enviar Orçamento
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Orçamentos Enviados
        </h3>
        <Button variant="ghost" size="sm" onClick={onOpenDrawer} className="h-6 text-[10px] px-2 text-primary hover:text-primary">
          + Novo
        </Button>
      </div>

      <div className="space-y-2">
        {activeShares.map(share => (
          <div key={share.id} className="p-2.5 rounded-lg border border-border bg-card flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground line-clamp-1">{share.material?.title || 'Proposta'}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {new Date(share.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                <a href={`/proposal/${share.token}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
