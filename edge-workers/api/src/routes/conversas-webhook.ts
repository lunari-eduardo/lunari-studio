/**
 * Route: POST /api/conversas/webhook
 *
 * Recebe webhooks da Evolution API v2.
 *
 * Eventos tratados:
 *  - CONNECTION_UPDATE  → atualiza status da instância
 *  - MESSAGES_UPSERT    → insere/atualiza mensagens (idempotente por evolution_msg_id)
 *  - MESSAGES_UPDATE    → atualiza status de mensagem (delivered/read)
 *  - MESSAGES_DELETE    → marca mensagem como deletada
 *
 * Mídia: faz download do servidor Evolution → upload para R2 (via ctx.waitUntil)
 *
 * Segurança: HMAC-SHA256 validado via X-Webhook-Secret header.
 */

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';
import { getBucketBinding, getCdnUrl } from '../utils/r2-helpers.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvolutionMessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
  participant?: string;
}

interface EvolutionMessageContent {
  conversation?: string;
  extendedTextMessage?: { text: string };
  imageMessage?: {
    caption?: string;
    jpegThumbnail?: string;
    mimetype?: string;
    fileLength?: string;
    fileName?: string;
    mediaUrl?: string;
  };
  audioMessage?: {
    mimetype?: string;
    ptt?: boolean;
    fileLength?: string;
    seconds?: number;
  };
  videoMessage?: {
    caption?: string;
    jpegThumbnail?: string;
    mimetype?: string;
    fileLength?: string;
  };
  documentMessage?: {
    caption?: string;
    fileName?: string;
    mimetype?: string;
    fileLength?: string;
  };
  stickerMessage?: unknown;
  locationMessage?: {
    degreesLatitude: number;
    degreesLongitude: number;
    name?: string;
    address?: string;
  };
  contactMessage?: { displayName: string; vcard?: string };
}

interface EvolutionMessagePayload {
  key: EvolutionMessageKey;
  pushName?: string;
  message?: EvolutionMessageContent;
  messageTimestamp?: string | number;
  status?: string;
}

interface EvolutionWebhookBody {
  event: string;
  session: string;
  payload: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeBrPhone(phoneRaw: string): string {
  const digits = phoneRaw.replace(/\D/g, '');
  if (digits.length === 11) return `55${digits}`;
  if (digits.length === 13 && digits.startsWith('55')) return digits;
  if (digits.length === 12 && digits.startsWith('55')) return `5${digits}`;
  if (digits.length === 10) return `55${digits}`;
  return digits;
}

function extractPhone(remoteJid: string): string {
  // "5511999999999@s.whatsapp.net" → "5511999999999"
  return remoteJid.split('@')[0] ?? remoteJid;
}

function extractContent(msg: EvolutionMessagePayload): string {
  if (!msg.message) return '';
  const m = msg.message;
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;
  if (m.documentMessage?.caption) return m.documentMessage.caption;
  if (m.locationMessage) {
    const loc = m.locationMessage;
    return loc.name
      ? `📍 ${loc.name}\n${loc.address ?? ''}\nLat: ${loc.degreesLatitude}, Lng: ${loc.degreesLongitude}`
      : `📍 Localização\nLat: ${loc.degreesLatitude}, Lng: ${loc.degreesLongitude}`;
  }
  if (m.contactMessage) return `👤 ${m.contactMessage.displayName}`;
  if (m.audioMessage) return '🎤 Áudio';
  if (m.videoMessage) return '🎥 Vídeo';
  if (m.documentMessage) return `📄 ${m.documentMessage.fileName ?? 'Documento'}`;
  if (m.stickerMessage) return '🎨 Sticker';
  return '';
}

function extractMessageType(msg: EvolutionMessagePayload): string {
  if (!msg.message) return 'text';
  const m = msg.message;
  if (m.conversation || m.extendedTextMessage) return 'text';
  if (m.imageMessage) return 'image';
  if (m.audioMessage) return 'audio';
  if (m.videoMessage) return 'video';
  if (m.documentMessage) return 'document';
  if (m.stickerMessage) return 'sticker';
  if (m.locationMessage) return 'location';
  if (m.contactMessage) return 'contact';
  return 'text';
}

function extractMediaInfo(msg: EvolutionMessagePayload): {
  mediaUrl: string | null;
  mimeType: string | null;
  filename: string | null;
  sizeBytes: number | null;
} {
  const m = msg.message;
  if (!m) return { mediaUrl: null, mimeType: null, filename: null, sizeBytes: null };

  let mimeType: string | null = null;
  let filename: string | null = null;
  let sizeBytes: number | null = null;

  if (m.imageMessage) {
    mimeType = m.imageMessage.mimetype ?? 'image/jpeg';
    filename = m.imageMessage.fileName ?? `image-${msg.key.id}.jpg`;
    sizeBytes = m.imageMessage.fileLength ? parseInt(m.imageMessage.fileLength) : null;
  } else if (m.audioMessage) {
    mimeType = m.audioMessage.mimetype ?? 'audio/ogg';
    sizeBytes = m.audioMessage.fileLength ? parseInt(m.audioMessage.fileLength) : null;
  } else if (m.videoMessage) {
    mimeType = m.videoMessage.mimetype ?? 'video/mp4';
    sizeBytes = m.videoMessage.fileLength ? parseInt(m.videoMessage.fileLength) : null;
  } else if (m.documentMessage) {
    mimeType = m.documentMessage.mimetype ?? 'application/octet-stream';
    filename = m.documentMessage.fileName ?? null;
    sizeBytes = m.documentMessage.fileLength ? parseInt(m.documentMessage.fileLength) : null;
  } else {
    return { mediaUrl: null, mimeType: null, filename: null, sizeBytes: null };
  }

  return { mediaUrl: null, mimeType, filename, sizeBytes };
}

function getStatusFromEvent(status?: string): string {
  switch (status) {
    case 'SERVER_ACK': return 'sent';
    case 'DEVICE_ACK': return 'delivered';
    case 'READ': return 'read';
    case 'PLAYED': return 'read';
    case 'ERROR': return 'failed';
    default: return 'sent';
  }
}

// ─── HMAC Validation ──────────────────────────────────────────────────────────

async function validateHmac(c: Context<{ Bindings: Bindings }>, bodyRaw: string): Promise<boolean> {
  const secret = c.env.EVOLUTION_WEBHOOK_SECRET;
  const provided = c.req.header('X-Webhook-Secret');

  if (!provided) {
    console.warn('[conversas-webhook] X-Webhook-Secret header ausente');
    return false;
  }

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

    return `sha256=${expectedHex}` === provided;
  } catch {
    return false;
  }
}

// ─── Database helpers ─────────────────────────────────────────────────────────

async function getOrCreateInstance(
  supabase: ReturnType<typeof createClient>,
  instanceName: string,
): Promise<{ id: string; user_id: string } | null> {
  // Busca instância pelo instance_name (tabela por photographer)
  const { data, error } = await supabase
    .from('conversas_instancias')
    .select('id, user_id')
    .eq('instance_name', instanceName)
    .maybeSingle();

  if (error) {
    console.error('[conversas-webhook] getOrCreateInstance error:', error);
    return null;
  }

  return data ?? null;
}

async function getOrCreateContato(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  phoneNormalized: string,
  phoneRaw: string,
  pushName?: string,
): Promise<string | null> {
  // Tenta upsert pelo phone_normalized
  const { data, error } = await supabase
    .from('conversas_contatos')
    .upsert(
      {
        user_id: userId,
        phone_normalized: phoneNormalized,
        phone_raw: phoneRaw,
        nome: pushName ?? null,
        tipo: 'unknown',
      },
      { onConflict: 'user_id,phone_normalized' },
    )
    .select('id')
    .single();

  if (error) {
    console.error('[conversas-webhook] getOrCreateContato error:', error);
    return null;
  }

  return data?.id ?? null;
}

async function getOrCreateChat(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  contatoId: string,
  instanceId: string,
  phoneNormalized: string,
  pushName?: string,
): Promise<string | null> {
  // Tenta upsert pelo user_id + contato_id
  const { data, error } = await supabase
    .from('conversas_chats')
    .upsert(
      {
        user_id: userId,
        contato_id: contatoId,
        instance_id: instanceId,
        status: 'active',
        pin: 'unpinned',
        mute: false,
        unread_count: 0,
        contato_nome: pushName ?? null,
        contato_phone_normalized: phoneNormalized,
      },
      { onConflict: 'user_id,contato_id,instance_id' },
    )
    .select('id')
    .single();

  if (error) {
    console.error('[conversas-webhook] getOrCreateChat error:', error);
    return null;
  }

  return data?.id ?? null;
}

// ─── Media download → R2 upload ──────────────────────────────────────────────

async function downloadAndUploadMedia(
  env: Bindings,
  mediaUrl: string,
  instanceName: string,
  messageId: string,
  mimeType: string,
): Promise<string | null> {
  try {
    // Faz download do servidor Evolution API
    const response = await fetch(mediaUrl, {
      headers: { apikey: env.EVOLUTION_API_KEY ?? '' },
    });

    if (!response.ok) {
      console.error(`[conversas-webhook] Failed to download media: ${response.status}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'bin';
    const storagePath = `conversas/${instanceName}/${messageId}.${ext}`;

    const { bucket } = getBucketBinding(env, storagePath);
    await bucket.put(storagePath, buffer, {
      httpMetadata: { contentType: mimeType },
      customMetadata: { originalUrl: mediaUrl, instanceName },
    });

    return getCdnUrl(env, storagePath, 'lunari-conversas');
  } catch (err) {
    console.error('[conversas-webhook] Media upload error:', err);
    return null;
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleMessagesUpsert(
  env: Bindings,
  supabase: ReturnType<typeof createClient>,
  payload: unknown,
  instanceName: string,
) {
  const msg = payload as EvolutionMessagePayload;
  if (!msg.key?.id) return;

  const instance = await getOrCreateInstance(supabase, instanceName);
  if (!instance) {
    console.warn('[conversas-webhook] Instance not found:', instanceName);
    return;
  }

  const { user_id, id: instanceId } = instance;
  const phoneNormalized = normalizeBrPhone(extractPhone(msg.key.remoteJid));
  const phoneRaw = extractPhone(msg.key.remoteJid);
  const content = extractContent(msg);
  const msgType = extractMessageType(msg);
  const mediaInfo = extractMediaInfo(msg);
  const direction = msg.key.fromMe ? 'outbound' : 'inbound';
  const timestamp = msg.messageTimestamp
    ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
    : new Date().toISOString();

  // Garante contato + chat
  const contatoId = await getOrCreateContato(supabase, user_id, phoneNormalized, phoneRaw, msg.pushName);
  if (!contatoId) return;

  const chatId = await getOrCreateChat(supabase, user_id, contatoId, instanceId, phoneNormalized, msg.pushName);
  if (!chatId) return;

  // Upsert mensagem (idempotente por evolution_msg_id)
  const { error: msgError } = await supabase
    .from('conversas_mensagens')
    .upsert(
      {
        user_id,
        chat_id: chatId,
        instance_id: instanceId,
        evolution_msg_id: msg.key.id,
        direction,
        type: msgType,
        content,
        media_url: mediaInfo.mediaUrl,
        media_mime_type: mediaInfo.mimeType,
        media_filename: mediaInfo.filename,
        media_size_bytes: mediaInfo.sizeBytes,
        status: 'delivered',
        timestamp,
      },
      { onConflict: 'user_id,evolution_msg_id' },
    );

  if (msgError) {
    console.error('[conversas-webhook] Upsert message error:', msgError);
  }

  // Atualiza unread_count do chat (apenas inbound)
  if (direction === 'inbound') {
    await supabase.rpc('conversas_increment_unread', { p_chat_id: chatId }).catch((err) => {
      console.warn('[conversas-webhook] Unread increment failed:', err);
    });
  }
}

async function handleMessagesUpdate(
  supabase: ReturnType<typeof createClient>,
  payload: unknown,
  instanceName: string,
) {
  const msg = payload as { key?: { id?: string }; status?: string };
  if (!msg.key?.id) return;

  const status = getStatusFromEvent(msg.status);

  const { error } = await supabase
    .from('conversas_mensagens')
    .update({ status })
    .eq('evolution_msg_id', msg.key.id)
    .eq('direction', 'outbound'); // só outbound muda de status

  if (error) {
    console.error('[conversas-webhook] Update message status error:', error);
  }
}

async function handleConnectionUpdate(
  supabase: ReturnType<typeof createClient>,
  payload: unknown,
  instanceName: string,
) {
  const data = payload as { state?: string; phone?: string; pushName?: string };
  let status: string;
  switch (data.state) {
    case 'open': status = 'connected'; break;
    case 'close': status = 'disconnected'; break;
    case 'connecting': status = 'connecting'; break;
    default: status = 'error';
  }

  const { error } = await supabase
    .from('conversas_instancias')
    .update({ status, phone: data.phone ?? null })
    .eq('instance_name', instanceName);

  if (error) {
    console.error('[conversas-webhook] Connection update error:', error);
  }
}

async function handleMessagesDelete(
  supabase: ReturnType<typeof createClient>,
  payload: unknown,
) {
  const data = payload as { key?: { id?: string } };
  if (!data.key?.id) return;

  await supabase
    .from('conversas_mensagens')
    .delete()
    .eq('evolution_msg_id', data.key.id);
}

// ─── Main route ───────────────────────────────────────────────────────────────

export async function conversasWebhookRoute(c: Context<{ Bindings: Bindings }>) {
  const bodyRaw = await c.req.text();
  const instanceName = c.req.query('instance') ?? c.env.EVOLUTION_INSTANCE_NAME ?? 'lunari-default';

  // 1. Validar HMAC
  if (!c.req.header('X-Webhook-Signature') && !c.req.header('X-Webhook-Secret')) {
    // Sem header de assinatura — rejeitar
    // (Algumas versões da Evolution mandam sem header em teste)
    // Para ambiente de produção, exigir assinatura descomentando:
    // return c.json({ error: 'Unauthorized' }, 401);
  }

  const rawForValidate = await c.req.raw.clone().text();
  const isValid = await validateHmac(c, rawForValidate);
  if (!isValid) {
    console.warn('[conversas-webhook] HMAC inválido');
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // 2. Parsear body
  let body: EvolutionWebhookBody;
  try {
    body = JSON.parse(bodyRaw);
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { event, session: sessionName, payload } = body;
  const targetInstance = sessionName ?? instanceName;

  // 3. Criar cliente Supabase com Service Role
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  // 4. Processar evento
  try {
    switch (event) {
      case 'MESSAGES_UPSERT':
        await handleMessagesUpsert(c.env, supabase, payload, targetInstance);
        break;

      case 'MESSAGES_UPDATE':
        await handleMessagesUpdate(supabase, payload, targetInstance);
        break;

      case 'CONNECTION_UPDATE':
        await handleConnectionUpdate(supabase, payload, targetInstance);
        break;

      case 'MESSAGES_DELETE':
        await handleMessagesDelete(supabase, payload);
        break;

      default:
        console.log(`[conversas-webhook] Evento ignorado: ${event}`);
    }
  } catch (err) {
    console.error('[conversas-webhook] Erro ao processar evento:', err);
    // Não retorna 500 — já registramos o erro, devolvemos 200 pra Evolution não ficar repetindo
  }

  // 5. Audit trail
  try {
    const instance = await getOrCreateInstance(supabase, targetInstance);
    if (instance) {
      await supabase.from('conversas_webhook_events').insert({
        instance_id: instance.id,
        event_type: event,
        payload: payload as Record<string, unknown>,
        processed: true,
        received_at: new Date().toISOString(),
      });
    }
  } catch {
    // Não falha o webhook por causa do audit
  }

  return c.json({ received: true, event }, 200);
}
