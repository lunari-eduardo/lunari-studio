import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, UserPlus, Briefcase, Plus, Loader2 } from 'lucide-react';

export interface SuggestionCardProps {
  isUnknownContact: boolean;
  messages?: any[];
  onCreateLead: (defaultCategory?: string) => void;
}

export function SuggestionCard({ 
  isUnknownContact,
  messages = [],
  onCreateLead, 
}: SuggestionCardProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [intent, setIntent] = useState<{ has_intent: boolean; category: string | null } | null>(null);

  useEffect(() => {
    if (!isUnknownContact || messages.length === 0 || intent) return;

    let mounted = true;
    const analyze = async () => {
      // Analisa apenas se tiver pelo menos 2 mensagens (para ter contexto mínimo)
      if (messages.length < 2) return;
      
      setAnalyzing(true);
      try {
        const response = await fetch('/api/conversas/classify-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.map(m => ({
              role: m.direction === 'inbound' ? 'user' : 'assistant',
              content: m.content || ''
            }))
          })
        });
        
        if (response.ok && mounted) {
          const data = await response.json();
          setIntent(data);
        }
      } catch (err) {
        console.error('[SuggestionCard] Error classifying lead', err);
      } finally {
        if (mounted) setAnalyzing(false);
      }
    };

    // Debounce analysis
    const timer = setTimeout(analyze, 1000);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isUnknownContact, messages, intent]);

  if (!isUnknownContact) return null;

  const title = intent?.has_intent 
    ? "Oportunidade Detectada!" 
    : "Contato Desconhecido";
    
  const desc = intent?.has_intent
    ? intent.category 
      ? `A Lu percebeu interesse em ensaio ${intent.category}. Deseja iniciar o atendimento?`
      : "A Lu percebeu interesse em orçamentos. Deseja iniciar o atendimento?"
    : "Este número não possui vínculos no seu CRM. Deseja iniciar um atendimento?";

  return (
    <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/10 p-3 shadow-sm mb-4 transition-all duration-300">
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/50 shrink-0 relative">
          {analyzing ? (
            <Loader2 className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              {title}
              {intent?.has_intent && (
                <span className="bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full tracking-wider">Lu</span>
              )}
            </h4>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-snug">
              {desc}
            </p>
          </div>
          <Button 
            size="sm" 
            onClick={() => onCreateLead(intent?.category || undefined)}
            className="w-full bg-[#C9A87C] hover:bg-[#b89567] text-white text-[11px] h-7 px-2 transition-all"
          >
            <Plus className="h-3 w-3 mr-1.5" />
            {intent?.has_intent ? "Sim, criar Oportunidade" : "Criar Lead / Oportunidade"}
          </Button>
        </div>
      </div>
    </div>
  );
}
