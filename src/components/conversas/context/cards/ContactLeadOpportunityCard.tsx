import { Target, Link, Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContactLeadOpportunityCardProps {
  onCreateLead: () => void;
  onLinkClient: () => void;
  detectedCategory?: string;
}

export function ContactLeadOpportunityCard({ 
  onCreateLead, 
  onLinkClient, 
  detectedCategory 
}: ContactLeadOpportunityCardProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Top Card: Actions */}
      <div className="rounded-xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/10 to-transparent p-3 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#D4AF37]" />
            <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">
              Possível oportunidade
            </span>
          </div>
          {detectedCategory && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#B8925F] border border-[#D4AF37]/30">
              {detectedCategory}
            </span>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            onClick={onCreateLead}
            className="w-full h-9 text-[11px] font-semibold bg-[#C9A87C] hover:bg-[#b89567] text-white rounded-lg shadow-sm transition-all"
          >
            <Target className="h-3.5 w-3.5 mr-1.5" />
            Criar Lead / Oportunidade
          </Button>
          <Button
            onClick={onLinkClient}
            variant="ghost"
            className="w-full h-8 text-[11px] font-medium text-muted-foreground hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-black/5 dark:hover:border-white/5"
          >
            <Link className="h-3.5 w-3.5 mr-1.5 opacity-70" />
            Vincular Cliente Existente
          </Button>
        </div>
      </div>

      {/* Bottom Card: Context */}
      <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-zinc-400" />
            Contexto do contato
          </span>
        </div>

        <div className="flex flex-col gap-2.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-zinc-500">Status</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
              Em prospecção
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Origem</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
              WhatsApp
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Primeiro contato</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Hoje</span>
          </div>
        </div>
      </div>
    </div>
  );
}
