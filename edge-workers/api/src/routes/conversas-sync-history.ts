import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';
import {
  extractMessageContent,
  extractMessageType,
} from './conversas-message-extract.js';

function chunkArray<T>(arr: T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function conversasSyncHistoryRoute(c: Context<{ Bindings: Bindings }>) {
  const authHeader = c.req.header('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return c.json({ error: 'Unauthorized: missing token' }, 401);
  }

  const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) {
    return c.json({ error: 'Unauthorized: invalid token' }, 401);
  }
  const userId = userData.user.id;

  let body: { instanceId: string; chatId: string; remoteJid: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { instanceId, chatId, remoteJid } = body;
  if (!instanceId || !chatId || !remoteJid) {
    return c.json({ error: 'instanceId, chatId e remoteJid são obrigatórios' }, 400);
  }

  const { data: instance, error: instanceError } = await supabaseAdmin
    .from('conversas_instancias')
    .select('id, instance_name, user_id')
    .eq('id', instanceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (instanceError || !instance) {
    return c.json({ error: 'Instância não encontrada' }, 404);
  }

  try {
    const msgsToUpsert: any[] = [];
    
    // Busca até as 2 primeiras páginas de histórico (aprox. 100-200 mensagens antigas)
    for (let page = 1; page <= 2; page++) {
      const res = await fetch(
        `${c.env.EVOLUTION_API_URL}/chat/findMessages/${instance.instance_name}`,
        {
          method: 'POST',
          headers: {
            apikey: c.env.EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            where: { key: { remoteJid } },
            page,
          }),
        },
      );

      if (res.ok) {
        const rawMsgs: any = await res.json();
        const records = rawMsgs?.messages?.records || rawMsgs?.records || [];
        
        if (records.length === 0) break; // Sem mais mensagens

        for (const m of records) {
          const keyId = m.key?.id;
          if (!keyId) continue;

          const direction = m.key?.fromMe ? 'outbound' : 'inbound';
          const content = extractMessageContent(m);
          const msgType = extractMessageType(m);
          const timestamp = m.messageTimestamp
            ? new Date(Number(m.messageTimestamp) * 1000).toISOString()
            : new Date().toISOString();

          msgsToUpsert.push({
            user_id: userId,
            chat_id: chatId,
            instance_id: instanceId,
            evolution_msg_id: keyId,
            direction,
            type: msgType,
            content,
            status: direction === 'outbound' ? 'sent' : 'delivered',
            timestamp,
          });
        }
        
        const totalPages = rawMsgs?.messages?.pages || 1;
        if (page >= totalPages) break;
      }
    }

    if (msgsToUpsert.length > 0) {
      for (const chunk of chunkArray(msgsToUpsert, 100)) {
        await supabaseAdmin
          .from('conversas_mensagens')
          .upsert(chunk, { onConflict: 'user_id,evolution_msg_id' });
      }
    }

    return c.json({
      ok: true,
      syncedMessages: msgsToUpsert.length,
      chatId,
    });
  } catch (err: any) {
    console.error('[sync-history] Erro ao sincronizar histórico:', err);
    return c.json({ error: 'Erro ao buscar mensagens do aparelho', detail: err.message }, 500);
  }
}
