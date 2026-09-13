import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';

export async function conversasMarkReadRoute(c: Context<{ Bindings: Bindings }>) {
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

    if (chat.unread_count === 0) {
      return c.json({ ok: true, message: 'No unread messages' }, 200);
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

    // 3. Fetch unread inbound messages for this chat
    const { data: messages, error: messagesError } = await supabase
      .from('conversas_mensagens')
      .select('evolution_msg_id')
      .eq('chat_id', chat.id)
      .eq('direction', 'inbound')
      .neq('status', 'read')
      // Only the last 10-20 to avoid giant payloads, Evolution only needs the latest to mark everything behind it, but we can send all known
      .order('timestamp', { ascending: false })
      .limit(20);

    if (messagesError || !messages || messages.length === 0) {
      // Even if no messages found in DB, just reset unread_count
      await supabase.from('conversas_chats').update({ unread_count: 0 }).eq('id', chat.id);
      return c.json({ ok: true, message: 'Reset unread count, no unread messages in DB' }, 200);
    }

    const remoteJid = `${chat.contato_phone_normalized}@s.whatsapp.net`;
    const readMessages = messages.map(m => ({
      remoteJid,
      fromMe: false,
      id: m.evolution_msg_id
    }));

    // 4. Send to Evolution API
    const evoUrl = c.env.EVOLUTION_API_URL;
    const evoKey = c.env.EVOLUTION_API_KEY;

    if (evoUrl && evoKey) {
      const response = await fetch(`${evoUrl}/chat/markMessageAsRead/${instance.instance_name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evoKey,
        },
        body: JSON.stringify({ readMessages }),
      });

      if (!response.ok) {
        console.warn(`[conversas-mark-read] Failed to mark read in Evolution: ${response.status}`, await response.text());
      }
    }

    // 5. Update DB: Set messages to 'read' and chat unread_count to 0
    // Usando supabase admin ou anon? Anon ok since the user owns them
    await supabase.from('conversas_mensagens')
      .update({ status: 'read' })
      .eq('chat_id', chat.id)
      .in('evolution_msg_id', messages.map(m => m.evolution_msg_id!));

    await supabase.from('conversas_chats')
      .update({ unread_count: 0 })
      .eq('id', chat.id);

    return c.json({ ok: true, marked: readMessages.length });
  } catch (err: any) {
    console.error('[conversas-mark-read] Error:', err);
    return c.json({ ok: false, error: err.message }, 500);
  }
}
