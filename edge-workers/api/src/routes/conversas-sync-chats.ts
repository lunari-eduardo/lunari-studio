/**
 * Route: POST /api/conversas/sync-chats
 *
 * Sincroniza conversas históricas do WhatsApp para o Supabase com alto desempenho e batching.
 * Chama POST /chat/findChats/{instanceName} da Evolution API v2, filtra conversas
 * individuais (@s.whatsapp.net), faz upsert em lote de contatos, chats e mensagens,
 * e importa histórico recente em grupos controlados de subrequests.
 *
 * Suporta também sync sob demanda de mensagens de um chat individual:
 * Body:
 * {
 *   instanceId: string;
 *   chatId?: string;
 *   remoteJid?: string;
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

function chunkArray<T>(arr: T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Função central de sincronização de histórico executável tanto via endpoint quanto via webhook CONNECTION_UPDATE
 */
export async function performSyncChats(
  env: Bindings,
  supabaseAdmin: any,
  userId: string,
  instanceId: string,
  instanceName: string,
): Promise<{ ok: boolean; synced: number; syncedMessages: number; total: number; error?: string }> {
  if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY) {
    return { ok: false, synced: 0, syncedMessages: 0, total: 0, error: 'Configuração da Evolution API incompleta' };
  }

  // 1. Chamar Evolution API — listar todas as conversas disponíveis
  let rawChats: any[] = [];
  const contactNameByJid = new Map<string, string>();
  const contactAvatarByJid = new Map<string, string>();

  try {
    const [chatsRes, contactsRes] = await Promise.all([
      fetch(`${env.EVOLUTION_API_URL}/chat/findChats/${instanceName}`, {
        method: 'POST',
        headers: {
          apikey: env.EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }),
      fetch(`${env.EVOLUTION_API_URL}/chat/findContacts/${instanceName}`, {
        method: 'POST',
        headers: {
          apikey: env.EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }).catch(() => null),
    ]);

    if (!chatsRes.ok) {
      const errText = await chatsRes.text();
      console.error('[performSyncChats] Erro Evolution findChats:', errText);
      return { ok: false, synced: 0, syncedMessages: 0, total: 0, error: errText };
    }

    const raw: any = await chatsRes.json();
    rawChats = Array.isArray(raw) ? raw : Array.isArray(raw?.chats) ? raw.chats : [];

    if (contactsRes && contactsRes.ok) {
      const rawContacts: any = await contactsRes.json();
      const contactsList = Array.isArray(rawContacts) ? rawContacts : [];
      for (const c of contactsList) {
        if (c.remoteJid && c.pushName) {
          contactNameByJid.set(c.remoteJid, c.pushName);
        }
        if (c.remoteJid && c.profilePicUrl) {
          contactAvatarByJid.set(c.remoteJid, c.profilePicUrl);
        }
      }
    }
  } catch (err: any) {
    console.error('[performSyncChats] Falha de rede em findChats:', err);
    return { ok: false, synced: 0, syncedMessages: 0, total: 0, error: err.message };
  }

  // 2. Filtrar apenas conversas individuais válidas (@s.whatsapp.net) e desduplicar por telefone
  const uniqueChatsByPhone = new Map<string, { chat: EvolutionChatListItem; phoneNormalized: string; phoneRaw: string; realName: string | null; realAvatar: string | null }>();

  for (const chat of rawChats) {
    const rawJid = chat.remoteJid || chat.id || (chat as any).jid || '';
    if (!rawJid || rawJid.includes('status@broadcast') || !rawJid.endsWith('@s.whatsapp.net')) {
      continue;
    }

    const jidDigits = rawJid.split('@')[0];
    const normalized = normalizeBrPhone(jidDigits);
    const phoneNormalized = normalized
      ? (normalized.startsWith('55') ? normalized : `55${normalized}`)
      : jidDigits;

    if (!phoneNormalized) continue;

    const realName = contactNameByJid.get(rawJid) ?? chat.pushName ?? chat.name ?? chat.contact?.displayName ?? null;
    const realAvatar = contactAvatarByJid.get(rawJid) ?? chat.profilePicUrl ?? null;

    if (!uniqueChatsByPhone.has(phoneNormalized)) {
      uniqueChatsByPhone.set(phoneNormalized, {
        chat,
        phoneNormalized,
        phoneRaw: jidDigits,
        realName,
        realAvatar,
      });
    }
  }

  const validItems = Array.from(uniqueChatsByPhone.values());
  if (validItems.length === 0) {
    return { ok: true, synced: 0, syncedMessages: 0, total: rawChats.length };
  }

  // 3. Batch upsert de contatos (em chunks de 100)
  const contactsPayload = validItems.map(item => ({
    user_id: userId,
    phone_normalized: item.phoneNormalized,
    phone_raw: item.phoneRaw,
    nome: item.realName,
    avatar_url: item.realAvatar,
    tipo: 'unknown',
  }));

  for (const chunk of chunkArray(contactsPayload, 100)) {
    const { error } = await supabaseAdmin
      .from('conversas_contatos')
      .upsert(chunk, { onConflict: 'user_id,phone_normalized' });
    if (error) {
      console.error('[performSyncChats] Erro batch upsert contatos:', error.message);
    }
  }

  // Obter IDs dos contatos atualizados
  const normalizedPhones = validItems.map(i => i.phoneNormalized);
  const { data: dbContacts } = await supabaseAdmin
    .from('conversas_contatos')
    .select('id, phone_normalized')
    .eq('user_id', userId)
    .in('phone_normalized', normalizedPhones);

  const contactIdByPhone = new Map<string, string>();
  for (const c of dbContacts ?? []) {
    contactIdByPhone.set(c.phone_normalized, c.id);
  }

  // 4. Batch upsert de chats (em chunks de 100)
  const chatsPayload: any[] = [];
  for (const item of validItems) {
    const contatoId = contactIdByPhone.get(item.phoneNormalized);
    if (!contatoId) continue;

    chatsPayload.push({
      user_id: userId,
      instance_id: instanceId,
      contato_id: contatoId,
      contato_nome: item.realName,
      contato_avatar: item.realAvatar,
      contato_phone_normalized: item.phoneNormalized,
      status: 'active',
      pin: 'unpinned',
      mute: false,
      unread_count: item.chat.unreadCount ?? 0,
    });
  }

  for (const chunk of chunkArray(chatsPayload, 100)) {
    const { error } = await supabaseAdmin
      .from('conversas_chats')
      .upsert(chunk, { onConflict: 'contato_id,instance_id' });
    if (error) {
      console.error('[performSyncChats] Erro batch upsert chats:', error.message);
    }
  }

  // Obter IDs dos chats atualizados
  const contatoIds = Array.from(contactIdByPhone.values());
  const { data: dbChats } = await supabaseAdmin
    .from('conversas_chats')
    .select('id, contato_id')
    .eq('instance_id', instanceId)
    .in('contato_id', contatoIds);

  const chatIdByContatoId = new Map<string, string>();
  for (const c of dbChats ?? []) {
    chatIdByContatoId.set(c.contato_id, c.id);
  }

  // 5. Batch upsert das últimas mensagens de todos os chats (lastMessage já presente em cada chat)
  const lastMessagesPayload: any[] = [];
  const processedEvolutionMsgIds = new Set<string>();

  for (const item of validItems) {
    const contatoId = contactIdByPhone.get(item.phoneNormalized);
    if (!contatoId) continue;
    const chatId = chatIdByContatoId.get(contatoId);
    if (!chatId) continue;

    const lastMsg = item.chat.lastMessage;
    const keyId = lastMsg?.key?.id;
    if (keyId && !processedEvolutionMsgIds.has(keyId)) {
      processedEvolutionMsgIds.add(keyId);
      const direction = lastMsg.key.fromMe ? 'outbound' : 'inbound';
      const content = extractMessageText(lastMsg.message);
      const msgType = detectMessageType(lastMsg);
      const timestamp = lastMsg.messageTimestamp
        ? new Date(Number(lastMsg.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString();

      lastMessagesPayload.push({
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
  }

  let totalMessagesSynced = 0;
  for (const chunk of chunkArray(lastMessagesPayload, 100)) {
    const { error } = await supabaseAdmin
      .from('conversas_mensagens')
      .upsert(chunk, { onConflict: 'user_id,evolution_msg_id' });
    if (!error) {
      totalMessagesSynced += chunk.length;
    } else {
      console.error('[performSyncChats] Erro batch upsert lastMessages:', error.message);
    }
  }

  // 6. Popular a fila de sincronização (conversas_sync_queue) para processamento em background
  const queuePayload = validItems
    .map(item => {
      const contatoId = contactIdByPhone.get(item.phoneNormalized);
      const chatId = contatoId ? chatIdByContatoId.get(contatoId) : null;
      if (!chatId) return null;
      const rawJid = item.chat.remoteJid || item.chat.id || '';
      if (!rawJid) return null;

      return {
        user_id: userId,
        instance_id: instanceId,
        chat_id: chatId,
        remote_jid: rawJid,
        current_page: 1,
        status: 'pending'
      };
    })
    .filter(Boolean);

  for (const chunk of chunkArray(queuePayload, 100)) {
    const { error } = await supabaseAdmin
      .from('conversas_sync_queue')
      .upsert(chunk, { onConflict: 'instance_id,remote_jid' });
    if (error) {
      console.error('[performSyncChats] Erro batch upsert sync_queue:', error.message);
    }
  }

  // 7. Atualizar flag de última sincronização na instância
  await supabaseAdmin
    .from('conversas_instancias')
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq('id', instanceId);

  return { ok: true, synced: validItems.length, syncedMessages: totalMessagesSynced, total: rawChats.length };
}

/**
 * Processa um lote da fila de sincronização
 */
export async function processSyncQueueBatch(
  env: Bindings,
  supabaseAdmin: any,
  userId: string,
  instanceId: string,
  instanceName: string,
): Promise<{ ok: boolean; processed: number; remaining: number; error?: string }> {
  
  // Buscar até 10 itens na fila que estão 'pending'
  const { data: queueItems, error: queueError } = await supabaseAdmin
    .from('conversas_sync_queue')
    .select('*')
    .eq('instance_id', instanceId)
    .eq('status', 'pending')
    .limit(10);

  if (queueError || !queueItems || queueItems.length === 0) {
    return { ok: true, processed: 0, remaining: 0 };
  }

  const ids = queueItems.map((q: any) => q.id);

  // Marcar como processing
  await supabaseAdmin
    .from('conversas_sync_queue')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .in('id', ids);

  let processedCount = 0;
  const processedEvolutionMsgIds = new Set<string>();
  const historicalMessages: any[] = [];

  // Buscar mensagens paralelamente (limite de 10 subrequests)
  await Promise.all(
    queueItems.map(async (item: any) => {
      try {
        const res = await fetch(
          `${env.EVOLUTION_API_URL}/chat/findMessages/${instanceName}`,
          {
            method: 'POST',
            headers: {
              apikey: env.EVOLUTION_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              where: { key: { remoteJid: item.remote_jid } },
              page: item.current_page
            }),
          },
        );

        let newStatus = 'completed';
        let newPage = item.current_page;
        let totalPages = item.total_pages;

        if (res.ok) {
          const rawMsgs: any = await res.json();
          
          // Tratamento de paginação da Evolution v2 (Prisma wrapper)
          const records = rawMsgs?.messages?.records || rawMsgs?.records || [];
          const currentPage = rawMsgs?.messages?.currentPage || 1;
          const totalPagesFromApi = rawMsgs?.messages?.pages || 1;
          totalPages = totalPagesFromApi;

          for (const m of records) {
            const keyId = m.key?.id;
            if (!keyId || processedEvolutionMsgIds.has(keyId)) continue;
            processedEvolutionMsgIds.add(keyId);

            const direction = m.key?.fromMe ? 'outbound' : 'inbound';
            const content = extractMessageText(m.message);
            const msgType = detectMessageType(m);
            const timestamp = m.messageTimestamp
              ? new Date(Number(m.messageTimestamp) * 1000).toISOString()
              : new Date().toISOString();

            historicalMessages.push({
              user_id: userId,
              chat_id: item.chat_id,
              instance_id: instanceId,
              evolution_msg_id: keyId,
              direction,
              type: msgType,
              content,
              status: direction === 'outbound' ? 'sent' : 'delivered',
              timestamp,
            });
          }

          if (currentPage < totalPagesFromApi && records.length > 0) {
            newStatus = 'pending';
            newPage = currentPage + 1;
          }
        } else {
          newStatus = 'error';
        }

        // Atualiza item da fila
        await supabaseAdmin
          .from('conversas_sync_queue')
          .update({ 
            status: newStatus, 
            current_page: newPage, 
            total_pages: totalPages,
            updated_at: new Date().toISOString() 
          })
          .eq('id', item.id);

        processedCount++;
      } catch (err) {
        console.warn(`[processSyncQueueBatch] Erro findMessages para ${item.remote_jid}:`, err);
        await supabaseAdmin
          .from('conversas_sync_queue')
          .update({ status: 'error', error_msg: String(err), updated_at: new Date().toISOString() })
          .eq('id', item.id);
      }
    }),
  );

  // Upsert mensagens
  for (const chunk of chunkArray(historicalMessages, 100)) {
    await supabaseAdmin
      .from('conversas_mensagens')
      .upsert(chunk, { onConflict: 'user_id,evolution_msg_id' });
  }

  // Contar restantes reais pendentes (não apenas processados neste lote)
  const { count: remainingCount } = await supabaseAdmin
    .from('conversas_sync_queue')
    .select('*', { count: 'exact', head: true })
    .eq('instance_id', instanceId)
    .eq('status', 'pending');

  return { ok: true, processed: processedCount, remaining: remainingCount || 0 };
}

/**
 * Rota POST /api/conversas/sync-chats
 */
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
  let body: { instanceId: string; chatId?: string; remoteJid?: string; mode?: 'initial' | 'batch' | 'single' };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { instanceId, chatId, remoteJid, mode = 'initial' } = body;
  if (!instanceId) {
    return c.json({ error: 'instanceId é obrigatório' }, 400);
  }

  // 3. Verificar se a instância pertence ao usuário
  const { data: instance, error: instanceError } = await supabaseAdmin
    .from('conversas_instancias')
    .select('id, instance_name, user_id')
    .eq('id', instanceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (instanceError || !instance) {
    return c.json({ error: 'Instância não encontrada' }, 404);
  }

  // Se modo for processamento em lote da fila
  if (mode === 'batch') {
    const result = await processSyncQueueBatch(c.env, supabaseAdmin, userId, instance.id, instance.instance_name);
    return c.json(result);
  }

  // 4. Se for sincronização sob demanda de um chat específico (single mode antigo ou explícito)
  if (chatId && remoteJid && mode !== 'initial') {
    const targetPage = Number((body as any).page) > 0 ? Number((body as any).page) : 1;
    try {
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
            page: targetPage,
          }),
        },
      );

      if (res.ok) {
        const rawMsgs: any = await res.json();
        const records = rawMsgs?.messages?.records || rawMsgs?.records || [];

        const msgsToUpsert: any[] = [];
        for (const m of records) {
          const keyId = m.key?.id;
          if (!keyId) continue;

          const direction = m.key?.fromMe ? 'outbound' : 'inbound';
          const content = extractMessageText(m.message);
          const msgType = detectMessageType(m);
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

        for (const chunk of chunkArray(msgsToUpsert, 100)) {
          await supabaseAdmin
            .from('conversas_mensagens')
            .upsert(chunk, { onConflict: 'user_id,evolution_msg_id' });
        }

        return c.json({
          ok: true,
          syncedMessages: msgsToUpsert.length,
          chatId,
          page: targetPage,
          totalPages: rawMsgs?.messages?.pages || 1,
        });
      }
    } catch (chatSyncErr: any) {
      console.error('[sync-chats] Erro ao sincronizar chat individual:', chatSyncErr);
      return c.json({ error: 'Erro ao buscar mensagens do chat', detail: chatSyncErr.message }, 500);
    }
  }

  // 5. Sincronização completa de histórico (initial)
  const result = await performSyncChats(c.env, supabaseAdmin, userId, instance.id, instance.instance_name);
  if (!result.ok) {
    return c.json({ error: 'Falha na sincronização', detail: result.error }, 500);
  }

  return c.json(result);
}
