import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';

export async function conversasMessageReactRoute(c: Context<{ Bindings: Bindings }>) {
  if (!c.env.EVOLUTION_API_URL || !c.env.EVOLUTION_API_KEY) {
    return c.json({ error: 'Configuracao de API incompleta' }, 500);
  }

  const authHeader = c.req.header('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return c.json({ error: 'Unauthorized: missing token' }, 401);

  const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) {
    return c.json({ error: 'Unauthorized: invalid token' }, 401);
  }
  const userId = userData.user.id;

  const msgId = c.req.param('id');
  if (!msgId) return c.json({ error: 'ID da mensagem nao fornecido' }, 400);

  let body: { reaction: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { reaction } = body;
  if (reaction === undefined) return c.json({ error: 'Reacao nao fornecida' }, 400);

  const { data: msg, error: msgError } = await supabaseAdmin
    .from('conversas_mensagens')
    .select('id, evolution_msg_id, chat_id, instance_id, direction')
    .eq('id', msgId)
    .eq('user_id', userId)
    .maybeSingle();

  if (msgError || !msg) return c.json({ error: 'Mensagem nao encontrada' }, 404);
  if (!msg.evolution_msg_id) return c.json({ error: 'Mensagem ainda nao sincronizada com Evolution' }, 400);

  const { data: chat } = await supabaseAdmin
    .from('conversas_chats')
    .select('contato_phone_normalized')
    .eq('id', msg.chat_id)
    .maybeSingle();

  if (!chat?.contato_phone_normalized) return c.json({ error: 'Telefone do contato nao disponivel' }, 400);

  const { data: instance } = await supabaseAdmin
    .from('conversas_instancias')
    .select('instance_name')
    .eq('id', msg.instance_id)
    .maybeSingle();

  if (!instance?.instance_name) return c.json({ error: 'Instancia nao encontrada' }, 404);

  const recipientNumber = chat.contato_phone_normalized.startsWith('55') 
    ? chat.contato_phone_normalized 
    : `55${chat.contato_phone_normalized}`;

  try {
    const evolutionEndpoint = `${c.env.EVOLUTION_API_URL}/message/sendReaction/${instance.instance_name}`;
    const response = await fetch(evolutionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: c.env.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        key: {
          id: msg.evolution_msg_id,
          remoteJid: `${recipientNumber}@s.whatsapp.net`,
          fromMe: msg.direction === 'outbound'
        },
        reaction: reaction, // String with emoji or empty string to remove
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return c.json({ error: 'Erro ao reagir via WhatsApp', detail: errText }, 500);
    }

    return c.json({ success: true }, 200);

  } catch (err: any) {
    return c.json({ error: 'Erro de rede', detail: err.message }, 500);
  }
}
