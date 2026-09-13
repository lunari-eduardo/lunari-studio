/**
 * Route: POST /api/conversas/sync-chats
 *
 * Sincroniza conversas históricas do WhatsApp para o Supabase.
 * Chama GET /chat/findChats/{instanceName} da Evolution API v2
 * e upserts os contatos, chats e mensagens recentes correspondentes.
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
  id: string;
  remoteJid?: string;
  name?: string;
  pushName?: string;
  profilePicUrl?: string;
  unreadCount?: number;
  updatedAt?: string;
  contact?: { displayName?: string };
  lastMessage?: any;
}

function extractMessageText(msgObj: any): string {
  if (!msgObj) return '';
  if (typeof msgObj === 'string') return msgObj;
  if (msgObj.conversation) return msgObj.conversation;
  if (msgObj.extendedTextMessage?.text) return msgObj.extendedTextMessage.text;
  if (msgObj.imageMessage?.caption) return msgObj.imageMessage.caption;
  if (msgObj.videoMessage?.caption) return msgObj.videoMessage.caption;
  if (msgObj.documentMessage?.title) return msgObj.documentMessage.title;
  if (msgObj.documentMessage?.caption) return msgObj.documentMessage.caption;
  if (msgObj.audioMessage) return '🎤 Áudio';
  if (msgObj.imageMessage) return '📷 Imagem';
  if (msgObj.videoMessage) return '🎥 Vídeo';
  if (msgObj.documentMessage) return '📄 Documento';
  if (msgObj.stickerMessage) return '🎨 Figurinha';
  if (msgObj.contactMessage?.displayName) return `👤 Contato: ${msgObj.contactMessage.displayName}`;
  if (msgObj.locationMessage) return '📍 Localização';
  return '';
}

function detectMessageType(m: any): 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'contact' {
  const mt = (m?.messageType || '').replace('Message', '').toLowerCase();
  if (['text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact'].includes(mt)) {
    return mt as any;
  }
  const msg = m?.message;
  if (!msg) return 'text';
  if (msg.imageMessage) return 'image';
  if (msg.audioMessage) return 'audio';
  if (msg.videoMessage) return 'video';
  if (msg.documentMessage) return 'document';
  if (msg.stickerMessage) return 'sticker';
  if (msg.contactMessage) return 'contact';
  if (msg.locationMessage) return 'location';
  return 'text';
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

  // 3. Verificar que a instância pertence ao usuário
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

  // 5. Chamar Evolution API — listar conversas (v2.3.7 requer POST com body {})
  let evolutionChats: EvolutionChatListItem[] = [];
  try {
    const response = await fetch(
      `${c.env.EVOLUTION_API_URL}/chat/findChats/${instance.instance_name}`,
      {
        method: 'POST',
        headers: {
          apikey: c.env.EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[sync-chats] Evolution API error:', errText);
      return c.json({ error: 'Erro ao buscar conversas na Evolution API', detail: errText }, 500);
    }

    const raw: any = await response.json();
    evolutionChats = Array.isArray(raw) ? raw : Array.isArray(raw?.chats) ? raw.chats : [];
  } catch (err: any) {
    console.error('[sync-chats] Fetch error:', err);
    return c.json({ error: 'Erro de rede ao buscar conversas', detail: err.message }, 500);
  }

  // 6. Para cada chat válido (@s.whatsapp.net): upsert contato + upsert chat + importar mensagens
  let synced = 0;
  let syncedMessagesCount = 0;
  const errors: string[] = [];

  for (const chat of evolutionChats) {
    const rawJid = chat.remoteJid || chat.id || (chat as any).jid || '';
    if (!rawJid || rawJid.includes('status@broadcast') || !rawJid.endsWith('@s.whatsapp.net')) {
      continue;
    }

    const jidDigits = rawJid.split('@')[0];
    const normalized = normalizeBrPhone(jidDigits);
    const phoneNormalized = normalized
      ? (normalized.startsWith('55') ? normalized : `55${normalized}`)
      : jidDigits;

    if (!phoneNormalized) {
      errors.push(`Ignorado (phone inválido): ${rawJid}`);
      continue;
    }

    const pushName = chat.pushName ?? chat.name ?? chat.contact?.displayName ?? null;
    const avatarUrl = chat.profilePicUrl ?? null;
    const unreadCount = chat.unreadCount ?? 0;

    try {
      // 6a. Upsert contato
      const { data: contato, error: contatoErr } = await supabaseAdmin
        .from('conversas_contatos')
        .upsert(
          {
            user_id: userId,
            phone_normalized: phoneNormalized,
            phone_raw: jidDigits,
            nome: pushName,
            avatar_url: avatarUrl,
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

      // 6b. Upsert chat
      const { data: dbChat, error: chatErr } = await supabaseAdmin
        .from('conversas_chats')
        .upsert(
          {
            user_id: userId,
            instance_id: instanceId,
            contato_id: contato.id,
            contato_nome: pushName,
            contato_avatar: avatarUrl,
            contato_phone_normalized: phoneNormalized,
            status: 'active',
            pin: 'unpinned',
            mute: false,
            unread_count: unreadCount,
          },
          { onConflict: 'contato_id,instance_id' },
        )
        .select('id')
        .single();

      if (chatErr || !dbChat) {
        errors.push(`Chat ${phoneNormalized}: ${chatErr?.message}`);
        continue;
      }

      synced++;

      // 6c. Importar a última mensagem do chat diretamente se presente
      const lastMsg = chat.lastMessage;
      if (lastMsg && lastMsg.key?.id) {
        try {
          const keyId = lastMsg.key.id;
          const direction = lastMsg.key.fromMe ? 'outbound' : 'inbound';
          const content = extractMessageText(lastMsg.message);
          const msgType = detectMessageType(lastMsg);
          const timestamp = lastMsg.messageTimestamp
            ? new Date(Number(lastMsg.messageTimestamp) * 1000).toISOString()
            : new Date().toISOString();

          await supabaseAdmin.from('conversas_mensagens').upsert(
            {
              user_id: userId,
              chat_id: dbChat.id,
              instance_id: instanceId,
              evolution_msg_id: keyId,
              direction,
              type: msgType,
              content,
              status: direction === 'outbound' ? 'sent' : 'delivered',
              timestamp,
            },
            { onConflict: 'user_id,evolution_msg_id' },
          );
          syncedMessagesCount++;
        } catch (lastMsgErr) {
          console.warn(`[sync-chats] Falha ao upsert lastMessage de ${rawJid}:`, lastMsgErr);
        }
      }

      // 6d. Buscar histórico detalhado dos primeiros 20 chats mais ativos
      if (synced <= 20) {
        try {
          const msgResponse = await fetch(
            `${c.env.EVOLUTION_API_URL}/chat/findMessages/${instance.instance_name}`,
            {
              method: 'POST',
              headers: {
                apikey: c.env.EVOLUTION_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                where: {
                  key: {
                    remoteJid: rawJid,
                  },
                },
                limit: 20,
              }),
            },
          );

          if (msgResponse.ok) {
            const rawMsgs: any = await msgResponse.json();
            const msgList: any[] = Array.isArray(rawMsgs)
              ? rawMsgs
              : Array.isArray(rawMsgs?.messages?.records)
              ? rawMsgs.messages.records
              : Array.isArray(rawMsgs?.messages)
              ? rawMsgs.messages
              : Array.isArray(rawMsgs?.records)
              ? rawMsgs.records
              : [];

            for (const m of msgList) {
              const keyId = m.key?.id;
              if (!keyId) continue;

              const direction = m.key?.fromMe ? 'outbound' : 'inbound';
              const content = extractMessageText(m.message);
              const msgType = detectMessageType(m);
              const timestamp = m.messageTimestamp
                ? new Date(Number(m.messageTimestamp) * 1000).toISOString()
                : new Date().toISOString();

              await supabaseAdmin.from('conversas_mensagens').upsert(
                {
                  user_id: userId,
                  chat_id: dbChat.id,
                  instance_id: instanceId,
                  evolution_msg_id: keyId,
                  direction,
                  type: msgType,
                  content,
                  status: direction === 'outbound' ? 'sent' : 'delivered',
                  timestamp,
                },
                { onConflict: 'user_id,evolution_msg_id' },
              );
              syncedMessagesCount++;
            }
          }
        } catch (msgErr) {
          console.warn(`[sync-chats] Falha ao sincronizar mensagens de ${rawJid}:`, msgErr);
        }
      }
    } catch (err: any) {
      errors.push(`Exceção ${phoneNormalized}: ${err.message}`);
    }
  }

  return c.json({
    ok: true,
    synced,
    syncedMessages: syncedMessagesCount,
    total: evolutionChats.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
