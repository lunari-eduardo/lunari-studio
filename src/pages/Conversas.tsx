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

import { toast } from 'sonner';
import { useConversas } from '@/hooks/useConversasRealtime';
import { ConnectLandingScreen } from '@/components/conversas/ConnectLandingScreen';
import { WhatsAppLayout } from '@/components/conversas/chat/WhatsAppLayout';

export default function ConversasPage() {
  const { instanceViewState } = useConversas();

  if (instanceViewState !== 'ready') {
    return <ConnectLandingScreen />;
  }

  return (
    <WhatsAppLayout
      onNewChat={() => {
        // Fase 7: modal para iniciar conversa por número.
        toast.info('Iniciar nova conversa por número em breve.');
      }}
    />
  );
}
