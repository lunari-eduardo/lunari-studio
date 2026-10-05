import { Search, Filter, CalendarDays } from 'lucide-react';
import emptyChatIllustration from '@/assets/empty-chat-illustration.png';

export function EmptyChatState() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-6 py-12 bg-[#F7F6F3] dark:bg-[#121212] select-none">
      <div className="max-w-md w-full flex flex-col items-center animate-in fade-in zoom-in duration-500">
        <div className="relative flex items-center justify-center mb-8 h-48 w-full">
          <img
            src={emptyChatIllustration}
            alt="Lunari Conversas"
            className="w-full h-full object-contain"
          />
        </div>
        
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-3">Selecione uma conversa</h2>
        <p className="text-[15px] text-muted-foreground text-center mb-10 max-w-sm leading-relaxed">
          Escolha uma conversa na sua caixa de entrada para visualizar as mensagens.
        </p>

        <div className="w-full flex flex-col gap-3">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#171717] border border-border/40 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all hover:bg-zinc-50 dark:hover:bg-[#1a1a1a]">
            <div className="flex-shrink-0 w-10 h-10 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 flex items-center justify-center">
              <Search className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-foreground">Use a busca</span>
              <span className="text-[13px] text-muted-foreground mt-0.5">Encontre rapidamente por nome, telefone ou mensagem.</span>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#171717] border border-border/40 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all hover:bg-zinc-50 dark:hover:bg-[#1a1a1a]">
            <div className="flex-shrink-0 w-10 h-10 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 flex items-center justify-center">
              <Filter className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-foreground">Filtre suas conversas</span>
              <span className="text-[13px] text-muted-foreground mt-0.5">Visualize apenas leads, clientes ou não lidas.</span>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#171717] border border-border/40 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all hover:bg-zinc-50 dark:hover:bg-[#1a1a1a]">
            <div className="flex-shrink-0 w-10 h-10 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-foreground">Acesse sua agenda</span>
              <span className="text-[13px] text-muted-foreground mt-0.5">Crie um evento direto da conversa.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
