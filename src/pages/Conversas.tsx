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

export default function ConversasPage() {
  const { instanceViewState, connectedInstance } = useConversas();
  const [newChatOpen, setNewChatOpen] = useState(false);

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
