import { Sparkles, Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InterestCardProps {
  suggestedCategory?: string;
  onCreateLead: (category?: string) => void;
}

export function InterestCard({ suggestedCategory, onCreateLead }: InterestCardProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Top Card: Interest */}
      <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] p-3 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2.5 px-1">
          <Sparkles className="h-4 w-4 text-[#D4AF37]" />
          <span className="text-[13px] font-bold text-[#A87E43] dark:text-[#D4AF37]">
            {suggestedCategory ? `Possível interesse: ${suggestedCategory}` : 'Contato desconhecido'}
          </span>
        </div>
        
        <Button
          onClick={() => onCreateLead(suggestedCategory)}
          className="w-full h-9 text-[11px] font-semibold bg-[#C9A87C] hover:bg-[#b89567] text-white rounded-lg shadow-sm"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Criar Lead / Oportunidade
        </Button>
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
              Contato desconhecido
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
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Hoje, {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Mensagens</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
