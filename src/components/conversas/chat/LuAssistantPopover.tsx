import { useState } from 'react';
import { Sparkles, MessageSquare, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useLuaGenerate } from '@/hooks/lua/useLuaGenerate';
import type { Mensagem } from '@/modules/conversas/types';

interface LuAssistantPopoverProps {
  chatId: string;
  messages: Mensagem[];
  onInjectText: (text: string) => void;
}

export function LuAssistantPopover({ chatId, messages, onInjectText }: LuAssistantPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { generate, isGenerating } = useLuaGenerate();

  const handleSuggestReply = async () => {
    // Pega as últimas mensagens do cliente para contexto
    const recentMessages = messages
      .slice(-15)
      .map(m => ({
        direction: m.direction,
        content: m.content,
      }));

    // O prompt é a última mensagem inbound (do cliente)
    const lastInbound = [...messages].reverse().find(m => m.direction === 'inbound');
    const prompt = lastInbound?.content || 'Olá, gostaria de informações.';

    const reply = await generate({
      prompt,
      chatId,
      recentMessages,
    });

    if (reply) {
      onInjectText(reply);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Assistente Lua"
          className="h-8 px-2.5 flex items-center gap-1.5 rounded-full text-[11px] font-semibold text-[#D4AF37] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 transition-colors border border-[#D4AF37]/20 mr-1"
          title="Inteligência Lunari"
        >
          <Sparkles className="h-3 w-3" />
          <span>Lua</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 bg-white dark:bg-[#1A1A1A] border-border/50" align="end" sideOffset={8}>
        <div className="flex flex-col gap-1">
          <div className="px-2 py-1.5 mb-1 border-b border-border/50">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#D4AF37]" /> Ações da Lua
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSuggestReply}
            disabled={isGenerating}
            className="w-full justify-start text-[11px] h-8 px-2 hover:bg-[#D4AF37]/10 hover:text-[#B8925F] dark:hover:text-[#D4AF37]"
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5 mr-2" />}
            {isGenerating ? 'Gerando...' : 'Sugerir resposta'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
