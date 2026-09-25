import { Button } from '@/components/ui/button';
import { Sparkles, UserPlus, Briefcase, Plus } from 'lucide-react';

export interface SuggestionCardProps {
  isUnknownContact: boolean;
  onCreateLead: () => void;
}

export function SuggestionCard({ 
  isUnknownContact,
  onCreateLead, 
}: SuggestionCardProps) {
  if (!isUnknownContact) return null;

  return (
    <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/10 p-3 shadow-sm mb-4">
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/50 shrink-0">
          <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-200">Contato Desconhecido</h4>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-snug">
              Este número não possui vínculos no seu CRM. Deseja iniciar um atendimento?
            </p>
          </div>
          <Button 
            size="sm" 
            onClick={onCreateLead}
            className="w-full bg-[#C9A87C] hover:bg-[#b89567] text-white text-[11px] h-7 px-2"
          >
            <Plus className="h-3 w-3 mr-1.5" />
            Criar Lead / Oportunidade
          </Button>
        </div>
      </div>
    </div>
  );
}

