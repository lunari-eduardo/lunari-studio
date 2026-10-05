import React, { createContext, useContext } from 'react';
import { useConversas } from '@/hooks/useConversasRealtime';
import type { UseConversasReturn } from '@/hooks/conversas/types';

const ConversasContext = createContext<UseConversasReturn | null>(null);

export function ConversasProvider({ children }: { children: React.ReactNode }) {
  const conversas = useConversas({ realtime: true });
  return (
    <ConversasContext.Provider value={conversas}>
      {children}
    </ConversasContext.Provider>
  );
}

export function useGlobalConversas() {
  const context = useContext(ConversasContext);
  if (!context) {
    throw new Error('useGlobalConversas must be used within a ConversasProvider');
  }
  return context;
}
