import { supabase } from '@/integrations/supabase/client';
import type { Mensagem, Nota } from '@/modules/conversas/types';

interface ChatCacheEntry {
  mensagens: Mensagem[];
  notas: Nota[];
  lastFetch: number;
}

export const chatDataCache = new Map<string, ChatCacheEntry>();

export async function preloadChatData(chatId: string, userId: string) {
  if (chatDataCache.has(chatId)) {
    const entry = chatDataCache.get(chatId)!;
    if (Date.now() - entry.lastFetch < 1000 * 60 * 5) {
      // Valid for 5 minutes
      return;
    }
  }

  try {
    const [mensagensResult, notasResult] = await Promise.all([
      supabase
        .from('conversas_mensagens')
        .select('*')
        .eq('chat_id', chatId)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(30),
      supabase
        .from('conversas_notas')
        .select('*')
        .eq('chat_id', chatId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ]);

    if (mensagensResult.error) throw mensagensResult.error;
    if (notasResult.error) throw notasResult.error;

    chatDataCache.set(chatId, {
      mensagens: (mensagensResult.data ?? []).reverse() as Mensagem[],
      notas: notasResult.data ?? [],
      lastFetch: Date.now(),
    });
  } catch (err) {
    console.warn('[chatMessageCache] Failed to preload chat', chatId, err);
  }
}

export async function preloadUnreadChats(userId: string, chats: any[]) {
  const unreadChats = chats.filter(c => c.unread_count > 0 && !chatDataCache.has(c.id));
  if (unreadChats.length === 0) return;

  await Promise.all(
    unreadChats.map(chat => preloadChatData(chat.id, userId))
  );
}
