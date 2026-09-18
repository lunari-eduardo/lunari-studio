import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';

export async function conversasMarkUnreadRoute(c: Context<{ Bindings: Bindings }>) {
  try {
    const chatId = c.req.param('chatId');
    if (!chatId) return c.json({ ok: false, error: 'chatId is required' }, 400);

    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ ok: false, error: 'Missing Authorization header' }, 401);

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return c.json({ ok: false, error: 'Unauthorized' }, 401);
    }

    // 1. Fetch Chat details
    const { data: chat, error: chatError } = await supabase
      .from('conversas_chats')
      .select('id, instance_id, contato_phone_normalized, unread_count')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single();

    if (chatError || !chat) {
      return c.json({ ok: false, error: 'Chat not found' }, 404);
    }

    // 2. Fetch Instance to get instance_name
    const { data: instance, error: instanceError } = await supabase
      .from('conversas_instancias')
      .select('instance_name')
      .eq('id', chat.instance_id)
      .eq('user_id', user.id)
      .single();

    if (instanceError || !instance) {
      return c.json({ ok: false, error: 'Instance not found' }, 404);
    }

    const remoteJid = `${chat.contato_phone_normalized}@s.whatsapp.net`;

    // 3. Fetch the last message for this chat (required by Evolution v2.3.7 to mark unread)
    const { data: lastMessage, error: msgError } = await supabase
      .from('conversas_mensagens')
      .select('evolution_msg_id, direction, timestamp')
      .eq('chat_id', chat.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    let evolutionBody: any = { number: remoteJid };

    if (lastMessage) {
      evolutionBody.lastMessage = {
        key: {
          id: lastMessage.evolution_msg_id,
          fromMe: lastMessage.direction === 'outbound',
          remoteJid: remoteJid
        },
        messageTimestamp: Math.floor(new Date(lastMessage.timestamp).getTime() / 1000)
      };
    }

    // 4. Send to Evolution API
    const evoUrl = c.env.EVOLUTION_API_URL;
    const evoKey = c.env.EVOLUTION_API_KEY;

    if (evoUrl && evoKey) {
      const response = await fetch(`${evoUrl}/chat/markChatUnread/${instance.instance_name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evoKey,
        },
        body: JSON.stringify(evolutionBody),
      });

      if (!response.ok) {
        console.warn("%s", `[conversas-mark-unread] Failed to mark unread in Evolution: ${response.status}`, await response.text());
      }
    }

    // 5. Update DB: Set chat unread_count to 1
    await supabase.from('conversas_chats')
      .update({ unread_count: 1 })
      .eq('id', chat.id);

    return c.json({ ok: true, marked: true });
  } catch (err: any) {
    console.error('[conversas-mark-unread] Error:', err);
    return c.json({ ok: false, error: err.message }, 500);
  }
}
