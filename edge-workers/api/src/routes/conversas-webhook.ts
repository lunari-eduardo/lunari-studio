/**
 * Route: POST /api/conversas/webhook
 *
 * Recebe webhooks da Evolution API v2.3.7.
 *
 * Eventos tratados:
 *  - CONNECTION_UPDATE  → atualiza status da instância (connected/disconnected)
 *  - MESSAGES_UPSERT    → insere/atualiza mensagens (idempotente por evolution_msg_id)
 *  - MESSAGES_UPDATE    → atualiza status de mensagem (delivered/read), suportando keyId e messageId
 *  - MESSAGES_DELETE    → remove mensagem
 *  - CHATS_SET          → sincronização inicial de chats após escaneamento do QR code
 *  - MESSAGES_SET       → sincronização inicial de mensagens históricas
 *
 * Mídia: faz download do servidor Evolution → upload para R2 (via c.executionCtx.waitUntil)
 *
 * Multi-tenant: resolve instância por instance_name ou instance_id recebidos pela Evolution,
 * sem depender de fallback fixo.
 */

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';
import { getBucketBinding, getCdnUrl } from '../utils/r2-helpers.js';
import { normalizeBrPhone } from '../utils/phone.js';
import { performSyncChats } from './conversas-sync-chats.js';
import {
  extractMessageContent,
  extractMessageType,
  extractMediaInfo,
  extractDirection,
  extractTimestamp,
  extractQuotedInfo,
  type EvolutionMessagePayload as BaseEvolutionMessagePayload,
} from './conversas-message-extract.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvolutionMessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
  participant?: string;
  remoteJidAlt?: string;
}

interface EvolutionMessagePayload extends BaseEvolutionMessagePayload {
  key: EvolutionMessageKey;
  instanceId?: string;
}

interface EvolutionWebhookBody {
  event: string;
  session?: string;
  instance?: string;
  payload?: unknown;
  data?: unknown;
}

interface ResolvedInstance {
  id: string;
  user_id: string;
  instance_name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractPhone(remoteJid: string): string {
  // "5511999999999@s.whatsapp.net" → "5511999999999"
  return remoteJid.split('@')[0] ?? remoteJid;
}

function getStatusFromEvent(status?: string): string {
  switch (status) {
    case 'SERVER_ACK': return 'sent';
    case 'DELIVERY_ACK':
    case 'DEVICE_ACK': return 'delivered';
    case 'READ':
    case 'PLAYED': return 'read';
    case 'ERROR': return 'failed';
    default: return 'sent';
  }
}

// ─── HMAC / Secret Validation ──────────────────────────────────────────────────

async function validateHmac(c: Context<{ Bindings: Bindings }>, bodyRaw: string): Promise<boolean> {
  const secret = c.env.EVOLUTION_WEBHOOK_SECRET;
  const provided = c.req.header('X-Webhook-Secret') ?? c.req.header('X-Webhook-Signature');
  if (!secret || !provided) return true;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(bodyRaw);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const expectedHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `sha256=${expectedHex}` === provided || expectedHex === provided || secret === provided;
  } catch {
    return false;
  }
}

// ─── Database Helpers ─────────────────────────────────────────────────────────

async function findInstance(
  supabase: any,
  identifier: string | null | undefined,
): Promise<ResolvedInstance | null> {
  if (!identifier) return null;
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  // 1. Busca por instance_name
  const { data: byName } = await supabase
    .from('conversas_instancias')
    .select('id, user_id, instance_name')
    .eq('instance_name', trimmed)
    .maybeSingle();

  if (byName) return byName;

  // 2. Busca por instance_id (o UUID retornado pela Evolution API)
  const { data: byId } = await supabase
    .from('conversas_instancias')
    .select('id, user_id, instance_name')
    .eq('instance_id', trimmed)
    .maybeSingle();

  return byId ?? null;
}

async function getOrCreateContato(
  supabase: any,
  userId: string,
  phoneNormalized: string,
  phoneRaw: string,
  pushName?: string,
): Promise<string | null> {
  const payload: Record<string, any> = {
    user_id: userId,
    phone_normalized: phoneNormalized,
    phone_raw: phoneRaw,
    tipo: 'unknown',
  };
  // Apenas grava o nome se tiver um pushName real (evita sobrescrever com null)
  if (pushName && pushName.trim().length > 0) {
    payload.nome = pushName.trim();
  }

  // Tenta upsert pelo user_id + phone_normalized
  const { data, error } = await supabase
    .from('conversas_contatos')
    .upsert(payload, { onConflict: 'user_id,phone_normalized' })
    .select('id')
    .single();

  if (error) {
    console.error('[conversas-webhook] getOrCreateContato error:', error.message);
    return null;
  }

  return data?.id ?? null;
}

const presenceCache = new Map<string, { status: string, timestamp: number }>();

async function handlePresenceUpdate(
  supabase: any,
  payload: any,
  instance: ResolvedInstance,
) {
  try {
    const rawId = payload?.id || payload?.remoteJid || '';
    if (!rawId || rawId.includes('status@broadcast') || !rawId.endsWith('@s.whatsapp.net')) return;
    
    const phoneRaw = extractPhone(rawId);
    const normalized = normalizeBrPhone(phoneRaw);
    const phoneNormalized = normalized
      ? (normalized.startsWith('55') ? normalized : `55${normalized}`)
      : phoneRaw;

    // Achar o chat local para fazer broadcast na channel correta
    const { data: chat } = await supabase
      .from('conversas_chats')
      .select('id')
      .eq('contato_phone_normalized', phoneNormalized)
      .eq('instance_id', instance.id)
      .eq('user_id', instance.user_id)
      .maybeSingle();

    if (!chat) return;

    // Identificar status
    const presences = payload.presences || {};
    let status = 'available';
    for (const key of Object.keys(presences)) {
      if (presences[key]?.lastKnownPresence) {
        status = presences[key].lastKnownPresence;
      }
    }

    // Debounce logic (in-memory per worker isolate)
    const cacheKey = `${instance.id}_${phoneNormalized}`;
    const now = Date.now();
    const cached = presenceCache.get(cacheKey);

    if (cached && cached.status === status && (now - cached.timestamp < 3000)) {
      // Ignore if status is the same and less than 3 seconds elapsed
      return;
    }
    
    presenceCache.set(cacheKey, { status, timestamp: now });

    // Limpar cache antigo ocasionalmente (ex: mais de 1 minuto)
    if (Math.random() < 0.1) {
      for (const [k, v] of presenceCache.entries()) {
        if (now - v.timestamp > 60000) presenceCache.delete(k);
      }
    }

    // Fazer broadcast usando o channel supabase
    const channel = supabase.channel(`conversas_chat_${chat.id}_${instance.user_id}`);
    await channel.send({
      type: 'broadcast',
      event: 'presence',
      payload: { status },
    });
    // Removemos o canal logo em seguida, pois não precisamos ouvir
    supabase.removeChannel(channel);

  } catch (err) {
    console.error('[conversas-webhook] Erro ao tratar PRESENCE_UPDATE:', err);
  }
}

async function getOrCreateChat(
  supabase: any,
  userId: string,
  contatoId: string,
  instanceId: string,
  phoneNormalized: string,
  pushName?: string,
): Promise<string | null> {
  const payload: Record<string, any> = {
    user_id: userId,
    contato_id: contatoId,
    instance_id: instanceId,
    contato_phone_normalized: phoneNormalized,
  };
  // Apenas grava o contato_nome se tiver um pushName real (evita sobrescrever com null)
  if (pushName && pushName.trim().length > 0) {
    payload.contato_nome = pushName.trim();
  }

  const { data, error } = await supabase
    .from('conversas_chats')
    .upsert(payload, { onConflict: 'contato_id,instance_id' })
    .select('id')
    .single();

  if (error) {
    console.error('[conversas-webhook] getOrCreateChat error:', error.message);
    return null;
  }

  return data?.id ?? null;
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

async function processSingleMessage(
  env: Bindings,
  supabase: any,
  msg: EvolutionMessagePayload,
  instance: ResolvedInstance,
  ctx?: any,
) {
  if (!msg.key?.id) return;

  const remoteJid = msg.key.remoteJid || msg.key.participant || '';
  // Descartar canais de notícias (@newsletter), transmissões e status do WhatsApp
  if (
    !remoteJid ||
    remoteJid.includes('status@broadcast') ||
    remoteJid.includes('@newsletter') ||
    remoteJid.includes('@broadcast') ||
    (!remoteJid.endsWith('@s.whatsapp.net') && !remoteJid.endsWith('@g.us'))
  ) {
    return;
  }

  const phoneRaw = extractPhone(remoteJid);
  const normalized = normalizeBrPhone(phoneRaw);
  const phoneNormalized = normalized
    ? (normalized.startsWith('55') ? normalized : `55${normalized}`)
    : phoneRaw;

  if (!phoneNormalized) {
    console.warn(`[conversas-webhook] Telefone inválido ignorado: ${phoneRaw}`);
    return;
  }

  // 0. Tratamento de Reações do WhatsApp (reactionMessage)
  const reactionMsg = (msg.message as any)?.reactionMessage;
  if (reactionMsg && reactionMsg.key?.id) {
    const targetMsgId = reactionMsg.key.id;
    const emoji = (reactionMsg.text || '').trim();
    const fromMe = Boolean(msg.key.fromMe);

    const { data: targetMsg } = await supabase
      .from('conversas_mensagens')
      .select('id, reactions')
      .eq('evolution_msg_id', targetMsgId)
      .eq('user_id', instance.user_id)
      .maybeSingle();

    if (targetMsg) {
      let currentReactions = Array.isArray(targetMsg.reactions) ? targetMsg.reactions : [];
      if (!emoji) {
        currentReactions = currentReactions.filter((r: any) => r.fromMe !== fromMe);
      } else {
        const filtered = currentReactions.filter((r: any) => r.fromMe !== fromMe);
        currentReactions = [
          ...filtered,
          {
            emoji,
            fromMe,
            sender: fromMe ? 'Você' : (msg.pushName || 'Contato'),
            timestamp: new Date().toISOString(),
          }
        ];
      }

      await supabase
        .from('conversas_mensagens')
        .update({ reactions: currentReactions })
        .eq('id', targetMsg.id);
    }
    return;
  }

  const content = extractMessageContent(msg);
  const msgType = extractMessageType(msg);
  const mediaInfo = extractMediaInfo(msg);
  const direction = msg.key.fromMe ? 'outbound' : 'inbound';
  const timestamp = msg.messageTimestamp
    ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
    : new Date().toISOString();

  // Se a mensagem foi enviada pelo próprio usuário (outbound/fromMe), o msg.pushName
  // pertence ao remetente (dono do aparelho), e JAMAIS deve ser usado para renomear
  // o contato destinatário! (Evita que o suporte vire "Lise Diehl")
  const contactPushName = direction === 'inbound' ? msg.pushName : undefined;

  // 1. Garante contato
  const contatoId = await getOrCreateContato(
    supabase,
    instance.user_id,
    phoneNormalized,
    phoneRaw,
    contactPushName,
  );
  if (!contatoId) {
    throw new Error(`Falha ao criar contato para ${phoneNormalized}`);
  }

  // 2. Garante chat
  const chatId = await getOrCreateChat(
    supabase,
    instance.user_id,
    contatoId,
    instance.id,
    phoneNormalized,
    contactPushName,
  );
  if (!chatId) {
    throw new Error(`Falha ao criar chat para contato ${contatoId}`);
  }

  // 2.5 Quote / Reply (Fase P3)
  const quotedInfo = extractQuotedInfo(msg);
  let replyToId: string | null = null;
  let quotedSender = quotedInfo?.participant || null;

  if (quotedInfo?.stanzaId) {
    const { data: quotedRow } = await supabase
      .from('conversas_mensagens')
      .select('id, direction')
      .eq('user_id', instance.user_id)
      .eq('evolution_msg_id', quotedInfo.stanzaId)
      .maybeSingle();

    if (quotedRow) {
      replyToId = quotedRow.id;
      if (!quotedSender) {
        quotedSender = quotedRow.direction === 'outbound' ? 'Você' : (contactPushName || 'Contato');
      }
    }
  }

  // 3. Upsert mensagem (idempotente por user_id, evolution_msg_id)
  // Preserva dados de mídia já existentes caso o registro já tenha sido baixado ou criado
  const { data: existingMsg } = await supabase
    .from('conversas_mensagens')
    .select('id, media_url, media_mime_type, media_filename, media_size_bytes')
    .eq('user_id', instance.user_id)
    .eq('evolution_msg_id', msg.key.id)
    .maybeSingle();

  const finalMediaUrl = mediaInfo.mediaUrl || existingMsg?.media_url || null;
  const finalMimeType = mediaInfo.mimeType || existingMsg?.media_mime_type || null;
  const finalFilename = mediaInfo.filename || existingMsg?.media_filename || null;
  const finalSizeBytes = mediaInfo.sizeBytes || existingMsg?.media_size_bytes || null;

  const initialStatus = direction === 'outbound' ? 'sent' : 'delivered';
  const { error: msgError } = await supabase
    .from('conversas_mensagens')
    .upsert(
      {
        user_id: instance.user_id,
        chat_id: chatId,
        instance_id: instance.id,
        evolution_msg_id: msg.key.id,
        direction,
        type: msgType as any,
        content,
        media_url: finalMediaUrl,
        media_mime_type: finalMimeType,
        media_filename: finalFilename,
        media_size_bytes: finalSizeBytes,
        status: initialStatus,
        reply_to_id: replyToId,
        quoted_content: quotedInfo?.content || null,
        quoted_sender: quotedSender,
        quoted_type: quotedInfo?.type || null,
        timestamp,
      },
      { onConflict: 'user_id,evolution_msg_id' },
    );

  if (msgError) {
    console.error('[conversas-webhook] Upsert message error:', msgError.message);
    throw msgError;
  }

  // 4. Download de Mídia Assíncrono (Fase 2)
  if (['image', 'video', 'audio', 'document', 'sticker'].includes(msgType) && !finalMediaUrl && ctx?.waitUntil) {
    ctx.waitUntil((async () => {
      try {
        const evoUrl = env.EVOLUTION_API_URL;
        const evoKey = env.EVOLUTION_API_KEY;
        if (!evoUrl || !evoKey) return;

        // Pede a mídia em base64 para a Evolution
        const response = await fetch(`${evoUrl}/chat/getBase64FromMediaMessage/${instance.instance_name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: evoKey,
          },
          body: JSON.stringify({ message: msg, convertToMp4: false }),
        });

        if (!response.ok) {
          console.error('[conversas-webhook] Erro ao baixar mídia da Evolution:', await response.text());
          return;
        }

        const data = await response.json();
        let base64 = (data as any).base64;
        if (!base64 || typeof base64 !== 'string') return;

        // Limpa prefixo Data URI (ex: data:image/webp;base64,) para não quebrar atob()
        base64 = base64.replace(/^data:[^;]+;base64,/, '').trim();

        // Converte base64 para ArrayBuffer
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Upload pro R2 (mesma estrutura do media-upload para ficar roteável)
        const ext = mediaInfo.filename
          ? mediaInfo.filename.split('.').pop()
          : msgType === 'image'
          ? 'jpg'
          : msgType === 'video'
          ? 'mp4'
          : msgType === 'sticker'
          ? 'webp'
          : msgType === 'audio'
          ? 'ogg'
          : 'bin';
        const r2Filename = `conversas/${instance.user_id}/${chatId}/${msg.key.id}.${ext}`;

        const { bucket, bucketName } = getBucketBinding(env, r2Filename);
        if (!bucket) {
          console.error('[conversas-webhook] R2 bucket não resolvido para', r2Filename);
          return;
        }

        await bucket.put(r2Filename, bytes, {
          httpMetadata: {
            contentType: mediaInfo.mimeType || (msgType === 'sticker' ? 'image/webp' : 'application/octet-stream'),
          },
        });

        const finalUrl = getCdnUrl(env, r2Filename, bucketName);

        // Atualiza a mensagem no banco
        await supabase
          .from('conversas_mensagens')
          .update({
            media_url: finalUrl,
            media_mime_type: mediaInfo.mimeType || (msgType === 'sticker' ? 'image/webp' : null),
            media_filename: mediaInfo.filename || (msgType === 'sticker' ? `sticker-${msg.key.id}.webp` : null),
            media_size_bytes: mediaInfo.sizeBytes || bytes.length,
          })
          .eq('evolution_msg_id', msg.key.id)
          .eq('user_id', instance.user_id);
          
      } catch (err: any) {
        console.error('[conversas-webhook] Falha no background media download:', err.message);
      }
    })());
  }
}

async function handleMessagesUpsert(
  env: Bindings,
  supabase: any,
  payload: unknown,
  instance: ResolvedInstance,
  ctx?: any,
) {
  // Suporta payload como objeto único ou array
  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as any)?.messages)
    ? (payload as any).messages
    : payload && typeof payload === 'object' && (payload as any).key
    ? [payload]
    : [];

  for (const item of rawList) {
    await processSingleMessage(env, supabase, item as EvolutionMessagePayload, instance, ctx);
  }
}

async function handleMessagesUpdate(
  supabase: any,
  payload: unknown,
  instance: ResolvedInstance,
) {
  const updates = Array.isArray(payload) ? payload : [payload];

  for (const item of updates) {
    if (!item) continue;
    // Evolution v2.3.7 envia keyId ou messageId; v1 envia key.id
    const msgKeyId = item?.key?.id ?? item?.keyId ?? item?.messageId;
    if (!msgKeyId) continue;

    const status = getStatusFromEvent(item?.status);

    // Primeiro buscamos a mensagem para saber a direção e o chat_id (Fase P0)
    const { data: existingMsg } = await supabase
      .from('conversas_mensagens')
      .select('id, chat_id, direction, status')
      .eq('evolution_msg_id', msgKeyId)
      .eq('instance_id', instance.id)
      .eq('user_id', instance.user_id)
      .maybeSingle();

    if (!existingMsg) continue;

    // Guarda de transição para evitar regressão de status (Fase 4 / P1-07)
    let shouldUpdate = true;
    if (existingMsg.status === status) {
      shouldUpdate = false;
    } else if (status === 'sent' && existingMsg.status !== 'pending') {
      shouldUpdate = false;
    } else if (status === 'delivered' && !['pending', 'sent'].includes(existingMsg.status)) {
      shouldUpdate = false;
    } else if (status === 'failed' && !['pending', 'sent'].includes(existingMsg.status)) {
      shouldUpdate = false;
    }

    if (shouldUpdate) {
      const { error: updateError } = await supabase
        .from('conversas_mensagens')
        .update({ status })
        .eq('id', existingMsg.id);

      if (updateError) {
        console.error('[conversas-webhook] Update message status error:', updateError.message);
        continue;
      }
    }

    // P0 — Sincronização de Leitura Celular -> Lunari
    // Se recebemos um update de READ para uma mensagem inbound,
    // significa que o usuário leu no celular. Então zeramos as não lidas.
    if (existingMsg.direction === 'inbound' && ['read', 'played'].includes(status)) {
      const { error: chatError } = await supabase
        .from('conversas_chats')
        .update({ unread_count: 0 })
        .eq('id', existingMsg.chat_id)
        .eq('user_id', instance.user_id);
      
      if (chatError) {
        console.error('[conversas-webhook] Update chat unread_count error:', chatError.message);
      }
    }
  }
}

async function handleConnectionUpdate(
  env: Bindings,
  supabase: any,
  payload: unknown,
  instance: ResolvedInstance,
  ctx?: any,
) {
  const data = payload as { state?: string; phone?: string; pushName?: string; jid?: string };
  let status: string;
  switch (data?.state) {
    case 'open': status = 'connected'; break;
    case 'close': status = 'disconnected'; break;
    case 'connecting': status = 'connecting'; break;
    default: status = 'error';
  }

  const phone = data?.phone ?? (data?.jid ? extractPhone(data.jid) : null);

  const updateFields: Record<string, unknown> = { status };
  if (phone) {
    updateFields.phone = phone;
  }
  if (status === 'connected') {
    updateFields.qrcode_data = null;
    updateFields.qrcode_expires_at = null;
  }

  const { error } = await supabase
    .from('conversas_instancias')
    .update(updateFields)
    .eq('id', instance.id);

  if (error) {
    console.error('[conversas-webhook] Connection update error:', error.message);
  }

  // Disparar sincronização inicial de histórico automaticamente em segundo plano ao conectar
  if (status === 'connected') {
    const syncPromise = performSyncChats(
      env,
      supabase,
      instance.user_id,
      instance.id,
      instance.instance_name,
    ).then(res => {
      console.log("%s", `[conversas-webhook] Auto-sync concluído para ${instance.instance_name}:`, res);
    }).catch(err => {
      console.error("%s", `[conversas-webhook] Erro no auto-sync para ${instance.instance_name}:`, err);
    });

    if (ctx && typeof (ctx as any).waitUntil === 'function') {
      (ctx as any).waitUntil(syncPromise);
    }
  }
}

async function handleMessagesDelete(
  supabase: any,
  payload: unknown,
  instance: ResolvedInstance,
) {
  const data = payload as { key?: { id?: string }; keyId?: string };
  const keyId = data?.key?.id ?? data?.keyId;
  if (!keyId) return;

  await supabase
    .from('conversas_mensagens')
    .delete()
    .eq('evolution_msg_id', keyId)
    .eq('instance_id', instance.id)
    .eq('user_id', instance.user_id);
}

async function handleChatsSet(
  env: Bindings,
  supabase: any,
  payload: unknown,
  instance: ResolvedInstance,
) {
  // CHATS_UPDATE (singular) chega como objeto único direto da Evolution v2.
  // CHATS_SET/CHATS_UPSERT chegam como array ou { chats: [...] }.
  // Normalizar para sempre iterar objeto por objeto.
  const chatsList: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as any)?.chats)
    ? (payload as any).chats
    : payload && typeof payload === 'object'
    ? [payload]
    : [];

  for (const chat of chatsList) {
    const rawId = chat.remoteJid || chat.id || chat.jid || '';
    
    // Ignorar status@broadcast
    if (!rawId || rawId.includes('status@broadcast')) continue;

    // A Evolution v2.3.7 emite CHATS_UPDATE usando @lid e removendo todos os dados (incluindo unreadCount).
    // Como não temos mapeamento de @lid para telefone nativamente sem buscar mensagens antigas, 
    // e o unreadCount não vem no webhook de qualquer forma, descartamos explicitamente updates vazios de @lid.
    if (rawId.endsWith('@lid') && chat.unreadCount === undefined && chat.unreadMessages === undefined) {
      console.warn(`[conversas-webhook] Ignorando CHATS_UPDATE vazio com @lid (limitação Evolution v2.3.7): ${rawId}`);
      continue;
    }

    if (!rawId.endsWith('@s.whatsapp.net')) continue;

    const phoneRaw = extractPhone(rawId);
    const normalized = normalizeBrPhone(phoneRaw);
    const phoneNormalized = normalized
      ? (normalized.startsWith('55') ? normalized : `55${normalized}`)
      : phoneRaw;

    const pushName = chat.name || chat.pushName || null;

    // Resolved unread é o número autoritativo que o Lunari deve refletir.
    // Protobuf Baileys/Evolution expõe apenas `unreadCount` (uint32) — não existe
    // `unreadMessages`. Quando o usuário marca manualmente como não lido no
    // celular, o Evolution pode mandar `markedAsUnread: true` sem incrementar
    // `unreadCount` → nesse caso forçamos 1 para o badge aparecer.
    const explicitCount = typeof chat.unreadCount === 'number' ? chat.unreadCount : null;
    const markedAsUnread = chat.markedAsUnread === true;
    const resolvedUnread: number | null =
      explicitCount !== null
        ? explicitCount
        : markedAsUnread
        ? 1
        : null;

    const contatoId = await getOrCreateContato(supabase, instance.user_id, phoneNormalized, phoneRaw, pushName);
    if (!contatoId) continue;

    const chatId = await getOrCreateChat(supabase, instance.user_id, contatoId, instance.id, phoneNormalized, pushName);

    const rawPinned = (chat as any)?.pinned ?? (chat as any)?.isPinned;
    const isPinnedFromWpp = rawPinned && (rawPinned === true || Number(rawPinned) > 0);

    if (chatId) {
      const updates: Record<string, any> = {};
      if (resolvedUnread !== null) {
        updates.unread_count = resolvedUnread;
      }
      if (isPinnedFromWpp) {
        updates.pin = 'pinned';
        updates.pin_origin = 'whatsapp';
      }
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('conversas_chats')
          .update(updates)
          .eq('id', chatId)
          .eq('user_id', instance.user_id);
        if (error) {
          console.error('[conversas-webhook] handleChatsSet update error:', error.message);
        }
      }
    }
  }
}

async function handleMessagesSet(
  env: Bindings,
  supabase: any,
  payload: unknown,
  instance: ResolvedInstance,
) {
  const messagesList = Array.isArray(payload) ? payload : Array.isArray((payload as any)?.messages) ? (payload as any).messages : [];
  for (const msg of messagesList) {
    try {
      await processSingleMessage(env, supabase, msg as EvolutionMessagePayload, instance);
    } catch {
      // Sincronização em lote não deve falhar se uma mensagem específica der erro
    }
  }
}

// ─── Main Route ───────────────────────────────────────────────────────────────

export async function conversasWebhookRoute(c: Context<{ Bindings: Bindings }>) {
  const bodyRaw = await c.req.text();

  // 1. Validar HMAC se o secret e a assinatura existirem
  const webhookSecret = c.env.EVOLUTION_WEBHOOK_SECRET;
  const providedSignature = c.req.header('X-Webhook-Secret') ?? c.req.header('X-Webhook-Signature');

  if (webhookSecret && providedSignature) {
    const isValid = await validateHmac(c, bodyRaw);
    if (!isValid) {
      console.warn('[conversas-webhook] HMAC inválido');
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }

  // 2. Parsear body
  let body: EvolutionWebhookBody;
  try {
    body = JSON.parse(bodyRaw);
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const rawEvent = body.event || (body as any).type || '';
  const event = rawEvent.toUpperCase().replace(/\./g, '_');
  const payload = body.data ?? body.payload ?? body;

  // 3. Criar cliente Supabase com Service Role
  const supabase: any = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  // 4. Resolver instância de forma estrita e segura (sem fallback cego para 'lunari-default')
  const queryInstance = c.req.query('instance');
  const payloadInstanceId = (payload as any)?.instanceId;
  const bodyInstanceName = body.instance ?? body.session;

  const instanceCandidate = queryInstance || bodyInstanceName || payloadInstanceId;
  const instance = await findInstance(supabase, instanceCandidate);

  if (!instance) {
    console.warn(`[conversas-webhook] Instância não encontrada para o identificador: "${instanceCandidate}"`);
    // Salvar evento no audit mesmo sem instância vinculada para investigação
    await supabase.from('conversas_webhook_events').insert({
      instance_id: instanceCandidate || 'unknown',
      event_type: event || 'UNKNOWN',
      payload: (payload ?? {}) as Record<string, unknown>,
      processed: false,
      error_message: `Instância não encontrada para o identificador: "${instanceCandidate}"`,
      received_at: new Date().toISOString(),
    });
    return c.json({ error: 'Instance not found', candidate: instanceCandidate }, 404);
  }

  let processError: string | null = null;

  // 5. Processar eventos suportados
  try {
    switch (event) {
      case 'MESSAGES_UPSERT':
      case 'MESSAGE_UPSERT':
        await handleMessagesUpsert(c.env, supabase, payload, instance, c.executionCtx);
        break;

      case 'MESSAGES_UPDATE':
      case 'MESSAGE_UPDATE':
        await handleMessagesUpdate(supabase, payload, instance);
        break;

      case 'CONNECTION_UPDATE':
        await handleConnectionUpdate(c.env, supabase, payload, instance, c.executionCtx);
        break;

      case 'PRESENCE_UPDATE':
        await handlePresenceUpdate(supabase, payload, instance);
        break;

      case 'MESSAGES_DELETE':
      case 'MESSAGE_DELETE':
        await handleMessagesDelete(supabase, payload, instance);
        break;

      case 'CHATS_SET':
      case 'CHATS_UPSERT':
      case 'CHATS_UPDATE':
        await handleChatsSet(c.env, supabase, payload, instance);
        break;

      case 'MESSAGES_SET':
        await handleMessagesSet(c.env, supabase, payload, instance);
        break;

      default:
        console.log(`[conversas-webhook] Evento ignorado ou não tratado: ${event}`);
    }
  } catch (err: any) {
    processError = err.message || 'Erro desconhecido ao processar webhook';
    console.error('[conversas-webhook] Erro ao processar evento:', err);
  }

  // 6. Audit trail com registro claro de status de processamento e erro
  try {
    await supabase.from('conversas_webhook_events').insert({
      instance_id: instance.id,
      event_type: event || 'UNKNOWN',
      payload: (payload ?? {}) as Record<string, unknown>,
      processed: processError === null,
      error_message: processError,
      received_at: new Date().toISOString(),
    });
  } catch (auditErr) {
    console.error('[conversas-webhook] Falha no audit log:', auditErr);
  }

  if (processError) {
    return c.json({ received: true, event, error: processError }, 500);
  }

  return c.json({ received: true, event }, 200);
}
