import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';
import { normalizeBrPhone } from '../utils/phone.js';

export async function conversasMessageDeleteRoute(c: Context<{ Bindings: Bindings }>) {
  try {
    const msgId = c.req.param('id');
    if (!msgId) return c.json({ ok: false, error: 'msgId is required' }, 400);

    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ ok: false, error: 'Missing Authorization header' }, 401);

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return c.json({ ok: false, error: 'Unauthorized: missing token' }, 401);

    const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) {
      return c.json({ ok: false, error: 'Unauthorized: invalid token' }, 401);
    }
    const userId = userData.user.id;

    // 1. Fetch message details
    const { data: msg, error: msgError } = await supabaseAdmin
      .from('conversas_mensagens')
      .select('id, chat_id, instance_id, evolution_msg_id, direction, user_id, conversas_chats!inner(contato_phone_normalized)')
      .eq('id', msgId)
      .eq('user_id', userId)
      .single();

    if (msgError || !msg) {
      return c.json({ ok: false, error: 'Message not found' }, 404);
    }

    if (!msg.evolution_msg_id) {
      // Se não tem ID na Evolution, apenas deleta localmente (ex: erro de envio pendente)
      await supabaseAdmin.from('conversas_mensagens').delete().eq('id', msgId);
      return c.json({ ok: true, localOnly: true });
    }

    // 2. Fetch Instance to get instance_name
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from('conversas_instancias')
      .select('instance_name')
      .eq('id', msg.instance_id)
      .eq('user_id', userId)
      .single();

    if (instanceError || !instance) {
      return c.json({ ok: false, error: 'Instance not found' }, 404);
    }

    const rawPhone = Array.isArray(msg.conversas_chats) ? msg.conversas_chats[0]?.contato_phone_normalized : (msg.conversas_chats as any)?.contato_phone_normalized;
    const normalizedPhone = normalizeBrPhone(rawPhone) || rawPhone.replace(/\D/g, '');
    const remoteJid = normalizedPhone.startsWith('55') ? `${normalizedPhone}@s.whatsapp.net` : `55${normalizedPhone}@s.whatsapp.net`;

    // 3. Delete via Evolution API
    const evoUrl = c.env.EVOLUTION_API_URL;
    const evoKey = c.env.EVOLUTION_API_KEY;

    if (evoUrl && evoKey) {
      const evolutionEndpoint = `${evoUrl}/message/delete/${instance.instance_name}`;
      
      const body = {
        message: {
          remoteJid: remoteJid,
          fromMe: msg.direction === 'outbound',
          id: msg.evolution_msg_id
        }
      };

      const response = await fetch(evolutionEndpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evoKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[conversas-message-delete] Evolution API error: ${response.status}`, errText);
        // Continuamos e deletamos do DB de qualquer forma para não travar a UI? 
        // Depende da regra de negócios. Em muitos casos, se falhar na Evolution (ex: tempo limite excedido),
        // avisamos o usuário que não é possível apagar para todos, apenas apaga local.
        // Vamos apagar apenas localmente (ou seja, para mim)
      }
    }

    // 4. Update DB
    await supabaseAdmin.from('conversas_mensagens').delete().eq('id', msgId);

    return c.json({ ok: true });
  } catch (err: any) {
    console.error('[conversas-message-delete] Error:', err);
    return c.json({ ok: false, error: err.message }, 500);
  }
}
