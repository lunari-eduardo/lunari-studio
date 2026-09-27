/**
 * Hook principal do módulo Conversas.
 * Gerencia estado global com Supabase + Realtime subscriptions.
 */

import { useEffect, useMemo } from 'react';
import type { UseConversasOptions, UseConversasReturn } from './conversas/types';

import { useConversasState } from './conversas/useConversasState';
import { useConversasMutations } from './conversas/useConversasMutations';
import { useConversasInstances } from './conversas/useConversasInstances';

/** Chat enriquecido com tipo do contato (cliente | lead | unknown) */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-assertions
export type { EnrichedChat } from '@/modules/conversas/types';

export function useConversas(options: UseConversasOptions = {}): UseConversasReturn {
  const { realtime = true } = options;

  const {
    chats,
    setChats,
    instancias,
    setInstancias,
    isLoading,
    error
  } = useConversasState(realtime);

  const {
    openChat,
    archiveChat,
    unarchiveChat,
    blockChat,
    unblockChat,
    pinChat,
    unpinChat,
    markAsRead,
    markAsUnread,
    deleteChat
  } = useConversasMutations(chats, setChats);

  const {
    refreshQrCode,
    createInstance,
    checkInstanceStatus,
    disconnectInstance,
    deleteInstance,
    syncHistoricalChats
  } = useConversasInstances(setInstancias);

  // ============= Derived =============

  const totalUnread = useMemo(
    () => chats.reduce((sum, c) => sum + (c.unread_count ?? 0), 0),
    [chats],
  );

  const activeChatsCount = useMemo(
    () => chats.filter(c => c.status === 'active').length,
    [chats],
  );

  const chatCounts = useMemo(
    () => ({
      all: chats.filter(c => c.status === 'active').length,
      unread: chats.filter(c => c.status === 'active' && (c.unread_count ?? 0) > 0).length,
      cliente: chats.filter(c => c.status === 'active' && c.contato_tipo === 'cliente').length,
      lead: chats.filter(c => c.status === 'active' && c.contato_tipo === 'lead').length,
    }),
    [chats],
  );

  const connectedInstance = useMemo(
    () => instancias.find(i => i.status === 'connected')?.id ?? null,
    [instancias],
  );

  const instanceViewState = useMemo<'loading' | 'initial' | 'reconnect' | 'connecting' | 'ready'>(() => {
    if (isLoading && instancias.length === 0) return 'loading';
    if (instancias.length === 0) return 'initial';
    const hasConnected = instancias.some(i => i.status === 'connected');
    if (hasConnected) return 'ready';
    if (instancias.some(i => i.status === 'connecting')) return 'connecting';
    return 'reconnect';
  }, [instancias, isLoading]);

  const isPinLimitReached = useMemo(
    () => chats.filter(c => c.pin === 'pinned').length >= 5,
    [chats]
  );

  useEffect(() => {
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) LUNARI`;
    } else {
      document.title = 'LUNARI';
    }
  }, [totalUnread]);

  return {
    chats,
    instancias,
    isLoading,
    error,

    openChat,
    archiveChat,
    unarchiveChat,
    blockChat,
    unblockChat,
    pinChat,
    unpinChat,
    markAsRead,
    markAsUnread,
    deleteChat,
    refreshQrCode,
    createInstance,
    checkInstanceStatus,
    disconnectInstance,
    deleteInstance,
    syncHistoricalChats,

    totalUnread,
    activeChatsCount,
    connectedInstance,
    instanceViewState,
    isPinLimitReached,
    chatCounts,
  };
}
