import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Chat, ChatUpdate } from '@/modules/conversas/types';
import type { EnrichedChat } from '@/modules/conversas/types';

export function useConversasMutations(
  chats: EnrichedChat[],
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>
) {
  const updateChat = useCallback(
    async (chatId: string, updates: ChatUpdate) => {
      let previousChats: Chat[] = [];
      setChats(prev => {
        previousChats = prev;
        return prev.map(c => (c.id === chatId ? { ...c, ...updates } as Chat : c));
      });

      const { error } = await supabase
        .from('conversas_chats')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', chatId);

      if (error) {
        setChats(previousChats);
        toast.error('Erro ao atualizar conversa: ' + (error.message || 'Falha na operação'));
        throw error;
      }
    },
    [setChats],
  );

  const openChat = useCallback(async (chatId: string) => {
    await updateChat(chatId, { status: 'active' });
  }, [updateChat]);

  const archiveChat = useCallback(async (chatId: string) => {
    await updateChat(chatId, { status: 'archived' });
  }, [updateChat]);

  const unarchiveChat = useCallback(async (chatId: string) => {
    await updateChat(chatId, { status: 'active' });
  }, [updateChat]);

  const blockChat = useCallback(async (chatId: string) => {
    await updateChat(chatId, { status: 'blocked' });
  }, [updateChat]);

  const unblockChat = useCallback(async (chatId: string) => {
    await updateChat(chatId, { status: 'active' });
  }, [updateChat]);

  const pinChat = useCallback(async (chatId: string): Promise<boolean> => {
    const targetChat = chats.find(c => c.id === chatId);
    const instanceId = targetChat?.instance_id;
    const pinnedCount = chats.filter(
      c => c.pin === 'pinned' && (!instanceId || c.instance_id === instanceId)
    ).length;

    if (pinnedCount >= 5) {
      toast.warning('Limite de 5 conversas fixadas atingido nesta versão.');
      return false;
    }

    try {
      await updateChat(chatId, { pin: 'pinned', pin_origin: 'lunari' });
      return true;
    } catch {
      return false;
    }
  }, [updateChat, chats]);

  const unpinChat = useCallback(async (chatId: string): Promise<boolean> => {
    try {
      await updateChat(chatId, { pin: 'unpinned', pin_origin: null });
      return true;
    } catch {
      return false;
    }
  }, [updateChat]);

  const markAsRead = useCallback(async (chatId: string) => {
    try {
      await updateChat(chatId, { unread_count: 0 });
    } catch (error) {
      console.error('[Conversas] markAsRead error:', error);
    }
  }, [updateChat]);

  const markAsUnread = useCallback(async (chatId: string) => {
    try {
      await updateChat(chatId, { unread_count: 1 });
    } catch (error) {
      console.error('[Conversas] markAsUnread error:', error);
    }
  }, [updateChat]);

  const deleteChat = useCallback(async (chatId: string) => {
    let snapshot = chats;
    setChats(prev => prev.filter(c => c.id !== chatId));

    const { error } = await supabase
      .from('conversas_chats')
      .delete()
      .eq('id', chatId);

    if (error) {
      setChats(snapshot);
      toast.error('Erro ao excluir conversa');
      throw error;
    }
  }, [chats, setChats]);

  return {
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
  };
}
