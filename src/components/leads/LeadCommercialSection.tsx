import React, { useState } from 'react';
import { useLeadShares } from '@/hooks/useLeadShares';
import { Button } from '@/components/ui/button';
import { Loader2, Share2, Send, Eye, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { getPublicShareBaseUrl } from '@/utils/domainUtils';
import { useUserProfile } from '@/hooks/useUserProfile';
import { SendBudgetDrawer } from '@/components/conversas/context/modals/SendBudgetDrawer';

interface LeadCommercialSectionProps {
  leadId: string;
  leadName: string;
  leadPhone?: string | null;
  minimalStyle?: boolean;
}

export default function LeadCommercialSection({ leadId, leadName, leadPhone, minimalStyle = false }: LeadCommercialSectionProps) {
  const { profile } = useUserProfile();
  const { shares, isLoading: isLoadingShares } = useLeadShares(leadId);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  const handleOpenSend = () => {
    setIsSendModalOpen(true);
  };

  return (
    <div className={minimalStyle ? "space-y-2" : "space-y-4"}>
      <div className={minimalStyle ? "flex justify-end mb-2" : "flex items-center justify-between"}>
        {!minimalStyle && <h3 className="font-medium text-lunar-text">Orçamentos e Propostas</h3>}
        <Button onClick={handleOpenSend} size="sm" variant="outline" className={minimalStyle ? "h-8 text-xs font-medium rounded-lg" : "gap-2"}>
          {!minimalStyle && <Send className="h-4 w-4" />}
          {minimalStyle ? "Enviar Orçamento" : "Enviar Orçamento"}
        </Button>
      </div>

      {isLoadingShares ? (
        <div className="py-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : shares.length === 0 ? (
        <div className={minimalStyle ? "text-center text-[13px] text-muted-foreground italic py-3" : "bg-lunar-surface border border-dashed border-lunar-border rounded-lg p-6 text-center text-sm text-lunar-textSecondary"}>
          Nenhum orçamento foi enviado para este lead ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {shares.map(share => (
            <div key={share.id} className={minimalStyle ? "flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl" : "bg-lunar-surface border border-lunar-border rounded-lg p-3 flex flex-col gap-2"}>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-[13px] text-foreground">{share.material?.title || 'Proposta'}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Enviado há {formatDistanceToNow(new Date(share.created_at), { locale: ptBR })}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-[11px] font-medium text-[#D4AF37] hover:text-[#C5A028] hover:bg-[#D4AF37]/10"
                  onClick={() => {
                    const baseUrl = getPublicShareBaseUrl({
                      namespace: profile?.public_namespace,
                      customDomain: profile?.custom_domain
                    });
                    navigator.clipboard.writeText(`${baseUrl}/p/${share.token}`);
                    toast.success('Link copiado!');
                  }}
                >
                  <Share2 className="h-3 w-3 mr-1" /> Copiar
                </Button>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-lunar-textSecondary bg-muted/30 p-2 rounded">
                <div className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{share.sessions?.length || 0} acessos</span>
                </div>
                {share.sessions && share.sessions.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Último acesso: {formatDistanceToNow(new Date(share.sessions[0].created_at), { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SendBudgetDrawer 
        mode="leads"
        isOpen={isSendModalOpen} 
        onClose={() => setIsSendModalOpen(false)}
        leadId={leadId}
        leadName={leadName}
        leadPhone={leadPhone || undefined}
      />
    </div>
  );
}
