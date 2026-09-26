import { Button } from '@/components/ui/button';
import { Sparkles, Plus } from 'lucide-react';

interface InterestCardProps {
  suggestedCategory?: string;
  onCreateLead: (category?: string) => void;
}

export function InterestCard({ suggestedCategory, onCreateLead }: InterestCardProps) {
  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col items-center justify-center py-4 px-2 text-center space-y-3">
        <div className="h-10 w-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-[#D4AF37]" />
        </div>
        
        <div>
          <h4 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Novo Contato Detectado
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[240px] mx-auto">
            {suggestedCategory 
              ? `A Lu sugere possível interesse em "${suggestedCategory}".` 
              : "Este contato ainda não possui histórico no sistema."}
          </p>
        </div>

        <Button
          onClick={() => onCreateLead(suggestedCategory)}
          className="w-full h-8 text-xs bg-[#171717] hover:bg-[#2A2A2A] dark:bg-[#EFEFEF] dark:hover:bg-[#FFFFFF] dark:text-[#121212] transition-colors"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Criar Lead / Oportunidade
        </Button>
      </div>
    </div>
  );
}
