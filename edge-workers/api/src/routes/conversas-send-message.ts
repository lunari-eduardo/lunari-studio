/**
 * Route: POST /api/conversas/send-message
 *
 * Envia mensagem via Evolution API v2.
 * Persiste registro no Supabase com status 'pending' antes do fetch.
 * Atualiza para 'sent'/'failed' após resposta da API.
 *
 * Body:
 * {
 *   chatId: string;
 *   instanceId: string;
 *   content: string;
 *   type?: 'text' | 'image' | 'audio' | 'video' | 'document';
 *   mediaUrl?: string;
 *   mediaMimeType?: string;
 *   mediaFilename?: string;
 *   mediaSizeBytes?: number;
 * }
 */

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';

export async function conversasSendMessageRoute(c: Context<{ Bindings: Bindings }>) {
  // 0. Guard: verificar configuração essencial
  if (!c.env.EVOLUTION_API_URL || !c.env.EVOLUTION_API_KEY) {
    console.error('[send-message] EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados no Worker');
    return c.json({ error: 'Configuração de API incompleta — contacte o suporte' }, 500);
  }

  // 1. Autenticar via JWT do Supabase (Authorization: Bearer <token>)
  const authHeader = c.req.header('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return c.json({ error: 'Unauthorized: missing token' }, 401);
  }

  const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  // Validar JWT e extrair user_id
  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) {
    return c.json({ error: 'Unauthorized: invalid token' }, 401);
  }
  const userId = userData.user.id;

  // 2. Parsear body
  let body: {
    chatId: string;
    instanceId: string;
    content: string;
    type?: string;
    mediaUrl?: string;
    mediaMimeType?: string;
    mediaFilename?: string;
    mediaSizeBytes?: number;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { chatId, instanceId, content, type = 'text', mediaUrl, mediaFilename } = body;

  const VALID_TYPES = ['text', 'image', 'audio', 'video', 'document'];
  if (!VALID_TYPES.includes(type)) {
    return c.json({ error: 'Tipo inválido' }, 400);
  }

  if (!chatId || !instanceId || !content) {
    return c.json({ error: 'chatId, instanceId e content são obrigatórios' }, 400);
  }

  // 3. Obter phone do chat + validar que pertence à instância fornecida
  const { data: chat, error: chatError } = await supabaseAdmin
    .from('conversas_chats')
    .select('id, instance_id, contato_phone_normalized, user_id')
    .eq('id', chatId)
    .eq('user_id', userId)
    .maybeSingle();

  if (chatError || !chat) {
    return c.json({ error: 'Chat não encontrado' }, 404);
  }

  // O chat.instance_id deve ser o mesmo que o instanceId fornecido (prevenir cross-user)
  if (chat.instance_id !== instanceId) {
    return c.json({ error: 'Chat não pertence a esta instância' }, 403);
  }

  const rawPhone = chat.contato_phone_normalized;
  if (!rawPhone) {
    return c.json({ error: 'Telefone do contato não disponível' }, 400);
  }

  // Evolution API usa JID no formato "55DDDXXXXXXXX@s.whatsapp.net"
  // Armazenamos como "+55DDDXXXXXXXXX" → remover o +
  const phoneDigits = rawPhone.replace(/^\+/, '');
  const recipientJid = `${phoneDigits}@s.whatsapp.net`;

  // 3.5 Obter instance_name da instância
  const { data: instance, error: instanceError } = await supabaseAdmin
    .from('conversas_instancias')
    .select('instance_name')
    .eq('id', instanceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (instanceError || !instance) {
    return c.json({ error: 'Instância não encontrada' }, 404);
  }

  // 4. Inserir mensagem com status 'pending'
  const timestamp = new Date().toISOString();
  const msgId = crypto.randomUUID();

  const { data: insertedMsg, error: insertError } = await supabaseAdmin
    .from('conversas_mensagens')
    .insert({
      id: msgId,
      user_id: userId,
      chat_id: chatId,
      instance_id: instanceId,
      evolution_msg_id: null, // preenchido após envio
      direction: 'outbound',
      type: type as any,
      content,
      media_url: mediaUrl ?? null,
      media_mime_type: body.mediaMimeType ?? null,
      media_filename: mediaFilename ?? null,
      media_size_bytes: body.mediaSizeBytes ?? null,
      status: 'pending',
      timestamp,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[send-message] Insert error:', insertError);
    return c.json({ error: 'Erro ao registrar mensagem' }, 500);
  }

  // 5. Enviar via Evolution API
  try {
    let evolutionEndpoint = `${c.env.EVOLUTION_API_URL}/message/sendText/${instance.instance_name}`;
    let evolutionBody: any = {
      number: recipientJid,
      text: content,
    };

    if (type === 'audio' && mediaUrl) {
      evolutionEndpoint = `${c.env.EVOLUTION_API_URL}/message/sendWhatsAppAudio/${instance.instance_name}`;
      evolutionBody = {
        number: recipientJid,
        audio: mediaUrl,
      };
    } else if (['image', 'video', 'document'].includes(type) && mediaUrl) {
      evolutionEndpoint = `${c.env.EVOLUTION_API_URL}/message/sendMedia/${instance.instance_name}`;
      evolutionBody = {
        number: recipientJid,
        mediatype: type,
        mimetype: body.mediaMimeType ?? 'application/octet-stream',
        caption: content || undefined,
        media: mediaUrl,
        fileName: mediaFilename || `media_${Date.now()}`,
      };
    }

    const response = await fetch(evolutionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: c.env.EVOLUTION_API_KEY ?? '',
      },
      body: JSON.stringify(evolutionBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[send-message] Evolution API error:', errText);

      // Marcar como failed
      await supabaseAdmin
        .from('conversas_mensagens')
        .update({ status: 'failed' })
        .eq('id', msgId);

      return c.json({ error: 'Erro ao enviar mensagem via WhatsApp', detail: errText }, 500);
    }

    const result = await response.json();

    // Atualizar com evolution_msg_id e status
    const evolutionMsgId = result?.messages?.[0]?.key?.id ?? null;
    await supabaseAdmin
      .from('conversas_mensagens')
      .update({
        evolution_msg_id: evolutionMsgId,
        status: 'sent',
      })
      .eq('id', msgId);

    return c.json({
      success: true,
      id: msgId,
      evolutionMsgId,
      message: result?.messages?.[0] ?? null,
    }, 200);

  } catch (err: any) {
    console.error('[send-message] Fetch error:', err);

    await supabaseAdmin
      .from('conversas_mensagens')
      .update({ status: 'failed' })
      .eq('id', msgId);

    return c.json({ error: 'Erro de rede ao enviar mensagem', detail: err.message }, 500);
  }
}
