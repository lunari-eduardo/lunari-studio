/**
 * Route: POST /api/conversas/sync-chats
 *
 * Sincroniza conversas históricas do WhatsApp para o Supabase.
 * Chama GET /chat/findChats/{instanceName} da Evolution API v2
 * e upserts os contatos e chats correspondentes.
 *
 * Body:
 * {
 *   instanceId: string;
 * }
 */

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';
import { normalizeBrPhone } from '../utils/phone.js';

interface EvolutionChatListItem {
  id: string; // JID do chat: "5519987654321@s.whatsapp.net"
  name?: string;
  pushName?: string;
  contact?: { displayName?: string };
  lastMsg?: { conversation?: string };
}

export async function conversasSyncChatsRoute(c: Context<{ Bindings: Bindings }>) {
  // 1. Autenticar via JWT
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

  // 2. Parsear body
  let body: { instanceId: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { instanceId } = body;
  if (!instanceId) {
    return c.json({ error: 'instanceId é obrigatório' }, 400);
  }

  // 3. Verificar que a instância pertence ao user
  const { data: instance, error: instanceError } = await supabaseAdmin
    .from('conversas_instancias')
    .select('id, instance_name, user_id')
    .eq('id', instanceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (instanceError || !instance) {
    return c.json({ error: 'Instância não encontrada' }, 404);
  }

  // 4. Obter a Evolution API Key
  if (!c.env.EVOLUTION_API_URL || !c.env.EVOLUTION_API_KEY) {
    return c.json({ error: 'Configuração de API incompleta' }, 500);
  }

  // 5. Chamar Evolution API — listar conversas históricas
  let evolutionChats: EvolutionChatListItem[] = [];
  try {
    const response = await fetch(
      `${c.env.EVOLUTION_API_URL}/chat/findChats/${instance.instance_name}`,
      {
        method: 'GET',
        headers: {
          apikey: c.env.EVOLUTION_API_KEY ?? '',
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[sync-chats] Evolution API error:', errText);
      return c.json({ error: 'Erro ao buscar conversas na Evolution API', detail: errText }, 500);
    }

    const raw = await response.json();
    // Evolution API retorna { chats: [...] } ou [...] diretamente
    evolutionChats = Array.isArray(raw) ? raw : (Array.isArray(raw.chats) ? raw.chats : []);
  } catch (err: any) {
    console.error('[sync-chats] Fetch error:', err);
    return c.json({ error: 'Erro de rede ao buscar conversas', detail: err.message }, 500);
  }

  // 6. Para cada chat: upsert contato + upsert chat (sem mensagens)
  let synced = 0;
  const errors: string[] = [];

  for (const chat of evolutionChats) {
    const jid = chat.id.split('@')[0]; // "5519987654321"
    const phoneNormalized = normalizeBrPhone(jid);
    if (!phoneNormalized) {
      errors.push(`Ignorado (phone inválido): ${jid}`);
      continue;
    }

    const pushName = chat.pushName ?? chat.contact?.displayName ?? chat.name ?? null;
    const lastMessage = chat.lastMsg?.conversation ?? null;

    try {
      // 6a. Upsert contato
      const { data: contato, error: contatoErr } = await supabaseAdmin
        .from('conversas_contatos')
        .upsert(
          {
            user_id: userId,
            phone_normalized: phoneNormalized,
            phone_raw: jid,
            nome: pushName,
            tipo: 'unknown',
          },
          { onConflict: 'user_id,phone_normalized' },
        )
        .select('id')
        .single();

      if (contatoErr || !contato) {
        errors.push(`Contato ${phoneNormalized}: ${contatoErr?.message}`);
        continue;
      }

      // 6b. Upsert chat (não insere mensagens históricas)
      const { error: chatErr } = await supabaseAdmin
        .from('conversas_chats')
        .upsert(
          {
            user_id: userId,
            instance_id: instanceId,
            contato_id: contato.id,
            contato_nome: pushName,
            contato_phone_normalized: phoneNormalized,
            status: 'active',
            pin: 'unpinned',
            mute: false,
            unread_count: 0,
          },
          { onConflict: 'contato_id,instance_id' },
        );

      if (chatErr) {
        errors.push(`Chat ${phoneNormalized}: ${chatErr.message}`);
      } else {
        synced++;
      }
    } catch (err: any) {
      errors.push(`Exceção ${phoneNormalized}: ${err.message}`);
    }
  }

  return c.json({
    ok: true,
    synced,
    total: evolutionChats.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
