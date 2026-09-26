import { useState } from 'react';
import { Sparkles, FileText, MessageSquare, DollarSign, Calendar, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface LuAssistantPopoverProps {
  chatId: string;
}

export function LuAssistantPopover({ chatId }: LuAssistantPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setIsLoading(action);
    try {
      // Simulate API call for now (Cloudflare worker connection would go here)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      switch (action) {
        case 'resumir':
          toast.success('Resumo gerado', { description: 'A conversa foi resumida com sucesso.' });
          break;
        case 'sugerir':
          toast.success('Sugestão gerada', { description: 'Sugestão copiada para o campo de texto.' });
          break;
        case 'pagamento':
          toast.info('Redirecionando...', { description: 'Abrindo o módulo financeiro.' });
          break;
        case 'agendar':
          toast.info('Redirecionando...', { description: 'Abrindo a agenda.' });
          break;
      }
    } catch (error) {
      toast.error('Erro', { description: 'Não foi possível completar a ação com a Lu.' });
    } finally {
      setIsLoading(null);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Assistente Lu"
          className="h-8 px-2.5 flex items-center gap-1.5 rounded-full text-[11px] font-semibold text-[#D4AF37] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 transition-colors border border-[#D4AF37]/20 mr-1"
          title="Inteligência Lunari"
        >
          <Sparkles className="h-3 w-3" />
          <span>Lu</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 bg-white dark:bg-[#1A1A1A] border-border/50" align="end" sideOffset={8}>
        <div className="flex flex-col gap-1">
          <div className="px-2 py-1.5 mb-1 border-b border-border/50">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#D4AF37]" /> Ações da Lu
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction('resumir')}
            disabled={isLoading !== null}
            className="w-full justify-start text-[11px] h-8 px-2 hover:bg-[#D4AF37]/10 hover:text-[#B8925F] dark:hover:text-[#D4AF37]"
          >
            {isLoading === 'resumir' ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-2" />}
            Resumir conversa
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction('sugerir')}
            disabled={isLoading !== null}
            className="w-full justify-start text-[11px] h-8 px-2 hover:bg-[#D4AF37]/10 hover:text-[#B8925F] dark:hover:text-[#D4AF37]"
          >
            {isLoading === 'sugerir' ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5 mr-2" />}
            Sugerir resposta
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction('pagamento')}
            disabled={isLoading !== null}
            className="w-full justify-start text-[11px] h-8 px-2 hover:bg-[#D4AF37]/10 hover:text-[#B8925F] dark:hover:text-[#D4AF37]"
          >
            {isLoading === 'pagamento' ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <DollarSign className="h-3.5 w-3.5 mr-2" />}
            Registrar pagamento
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction('agendar')}
            disabled={isLoading !== null}
            className="w-full justify-start text-[11px] h-8 px-2 hover:bg-[#D4AF37]/10 hover:text-[#B8925F] dark:hover:text-[#D4AF37]"
          >
            {isLoading === 'agendar' ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Calendar className="h-3.5 w-3.5 mr-2" />}
            Agendar sessão
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
