/**
 * Route: POST /api/conversas/message/retry/:id
 *
 * Reenvia uma mensagem que falhou (status: 'failed') via Evolution API.
 * A mensagem original não é duplicada, apenas o status é alterado.
 */

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';

export async function conversasMessageRetryRoute(c: Context<{ Bindings: Bindings }>) {
  if (!c.env.EVOLUTION_API_URL || !c.env.EVOLUTION_API_KEY) {
    return c.json({ error: 'Configuração de API incompleta' }, 500);
  }

  const authHeader = c.req.header('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) return c.json({ error: 'Unauthorized' }, 401);
  const userId = userData.user.id;

  const msgId = c.req.param('id');
  if (!msgId) return c.json({ error: 'ID da mensagem não fornecido' }, 400);

  // 1. Obter a mensagem e verificar se pertence ao usuário e está como falha
  const { data: msg, error: msgError } = await supabaseAdmin
    .from('conversas_mensagens')
    .select('*, conversas_chats(contato_phone_normalized)')
    .eq('id', msgId)
    .eq('user_id', userId)
    .maybeSingle();

  if (msgError || !msg) return c.json({ error: 'Mensagem não encontrada' }, 404);
  if (msg.status !== 'failed') return c.json({ error: 'Apenas mensagens com falha podem ser reenviadas' }, 400);

  // 2. Obter informações da instância
  const { data: instance, error: instanceError } = await supabaseAdmin
    .from('conversas_instancias')
    .select('instance_name')
    .eq('id', msg.instance_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (instanceError || !instance) return c.json({ error: 'Instância não encontrada' }, 404);

  // 3. Atualizar status para pending localmente
  await supabaseAdmin
    .from('conversas_mensagens')
    .update({ status: 'pending' })
    .eq('id', msgId);

  // Formatar JID
  const rawPhone = msg.conversas_chats?.contato_phone_normalized;
  if (!rawPhone) return c.json({ error: 'Telefone do contato inválido' }, 400);
  const phoneDigits = rawPhone.replace(/^\+/, '');
  const recipientJid = `${phoneDigits}@s.whatsapp.net`;

  // 4. Enviar para Evolution API
  try {
    let response;
    // O envio varia de acordo com o type, mas como fallback assumimos 'text' no momento.
    // Futuramente suportar media.
    if (msg.type === 'text' || !msg.type) {
      response = await fetch(
        `${c.env.EVOLUTION_API_URL}/message/sendText/${instance.instance_name}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: c.env.EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number: recipientJid,
            text: msg.content,
          }),
        },
      );
    } else {
      // Stub para medias
      response = await fetch(
        `${c.env.EVOLUTION_API_URL}/message/sendText/${instance.instance_name}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: c.env.EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number: recipientJid,
            text: `[Retentativa de envio: ${msg.type}] ` + msg.content,
          }),
        },
      );
    }

    if (!response.ok) {
      const errText = await response.text();
      await supabaseAdmin.from('conversas_mensagens').update({ status: 'failed' }).eq('id', msgId);
      return c.json({ error: 'Erro ao reenviar mensagem', detail: errText }, 500);
    }

    const result = await response.json();
    const evolutionMsgId = result?.messages?.[0]?.key?.id ?? null;

    // 5. Atualizar como sent
    await supabaseAdmin
      .from('conversas_mensagens')
      .update({
        evolution_msg_id: evolutionMsgId,
        status: 'sent',
      })
      .eq('id', msgId);

    return c.json({ success: true, id: msgId, evolutionMsgId }, 200);
  } catch (err: any) {
    await supabaseAdmin.from('conversas_mensagens').update({ status: 'failed' }).eq('id', msgId);
    return c.json({ error: 'Erro de rede ao reenviar', detail: err.message }, 500);
  }
}
