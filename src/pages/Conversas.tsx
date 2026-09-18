/**
 * Página principal do módulo Conversas.
 *
 * Troca internamente entre duas views baseado no estado da instância WhatsApp:
 * - `<ConnectLandingScreen />` quando não há instância conectada
 * - `<WhatsAppLayout />` quando há pelo menos uma instância connected
 *
 * A detecção é derivada de `useConversas().instanceViewState` e propaga via
 * Supabase Realtime quando o webhook da Evolution atualiza o status.
 */

import { useState } from 'react';
import { useConversas } from '@/hooks/useConversasRealtime';
import { ConnectLandingScreen } from '@/components/conversas/ConnectLandingScreen';
import { WhatsAppLayout } from '@/components/conversas/chat/WhatsAppLayout';
import { NewChatModal } from '@/components/conversas/chat/NewChatModal';

import { ChatListSkeleton } from '@/components/conversas/chat/skeletons';

export default function ConversasPage() {
  const { instanceViewState, connectedInstance } = useConversas();
  const [newChatOpen, setNewChatOpen] = useState(false);

  if (instanceViewState === 'loading') {
    return (
      <div className="flex h-full w-full bg-white dark:bg-lunari-gray-900 overflow-hidden">
        <div className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 border-r border-lunari-gray-200 dark:border-lunari-gray-800 flex flex-col h-full bg-white dark:bg-lunari-gray-900">
          <div className="p-4 border-b border-lunari-gray-200 dark:border-lunari-gray-800 h-[126px]">
             <div className="animate-pulse bg-lunari-gray-100 dark:bg-lunari-gray-800 h-full w-full rounded" />
          </div>
          <div className="flex-1 overflow-hidden mt-2">
            <ChatListSkeleton />
          </div>
        </div>
        <div className="flex-1 hidden md:flex items-center justify-center bg-lunari-gray-50/50 dark:bg-lunari-gray-900/50">
          <div className="w-8 h-8 rounded-full border-2 border-lunari-gray-300 border-t-lunari-brand/80 animate-spin" />
        </div>
      </div>
    );
  }

  if (instanceViewState !== 'ready') {
    return <ConnectLandingScreen />;
  }

  return (
    <>
      <WhatsAppLayout
        onNewChat={() => setNewChatOpen(true)}
      />
      <NewChatModal 
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        instanceId={connectedInstance}
        onChatCreated={(_chatId) => {
          // A Sidebar list vai atualizar automaticamente via Supabase Realtime
          // e WhatsAppLayout vai auto-selecionar caso seja a única ativa
        }}
      />
    </>
  );
}
