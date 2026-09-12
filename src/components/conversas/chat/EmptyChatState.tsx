/**
 * Ilustração exibida quando nenhum chat está selecionado.
 */

import { MessageCircle } from 'lucide-react';

export function NoChatSelectedIllustration() {
  return (
    <div className="relative flex items-center justify-center mb-4">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-32 w-32 rounded-3xl border-2 border-dashed border-zinc-300 rotate-12" />
      </div>
      <MessageCircle className="h-20 w-20 text-zinc-300 relative z-10" strokeWidth={1.2} />
    </div>
  );
}

export function EmptyChatState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 bg-[#f0f2f5]">
      <NoChatSelectedIllustration />
      <h2 className="font-serif text-2xl text-zinc-700 mb-2">Lunari Conversas</h2>
      <p className="text-sm text-zinc-500 max-w-sm">
        Selecione uma conversa na lista ao lado para começar a trocar mensagens.
      </p>
      <p className="text-xs text-zinc-400 mt-3 max-w-sm">
        Dica: use a busca para encontrar clientes por nome ou telefone.
      </p>
    </div>
  );
}
