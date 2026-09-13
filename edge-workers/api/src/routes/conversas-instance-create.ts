/**
 * Route: POST /api/conversas/instance/create
 *
 * Cria uma instância WhatsApp na Evolution API e persiste em `conversas_instancias`.
 *
 * Body: { instanceName: string, integration?: string }
 * Retorna: { ok: true, data: { instanceId, qrcode, expiresAt, hash } }
 */

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';
import { requireUserAuth } from '../utils/auth.js';

export async function conversasInstanceCreateRoute(c: Context<{ Bindings: Bindings }>) {
  const auth = await requireUserAuth(c);
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  // Service role para inserir a instância
  const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  let body: { instanceName?: string; integration?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const rawInstanceName = body.instanceName?.trim();
  // Se não fornecido ou for o default genérico, gerar nome único multi-tenant por usuário
  const instanceName = rawInstanceName && rawInstanceName !== 'lunari-default'
    ? rawInstanceName
    : `lunari-${userId.slice(0, 8)}`;

  const integration = body.integration ?? 'WHATSAPP-BAILEYS';
  const webhookUrl = `${new URL(c.req.url).origin}/api/conversas/webhook?instance=${encodeURIComponent(instanceName)}`;

  const requiredEvents = [
    'CONNECTION_UPDATE',
    'MESSAGES_UPSERT',
    'MESSAGES_UPDATE',
    'MESSAGES_DELETE',
    'CHATS_SET',
    'CHATS_UPSERT',
    'CHATS_UPDATE',
    'CONTACTS_SET',
    'CONTACTS_UPSERT',
    'MESSAGES_SET',
  ];

  // 1. Chama Evolution API para criar a instância
  let evolutionResp: Response;
  try {
    evolutionResp = await fetch(`${c.env.EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: c.env.EVOLUTION_API_KEY ?? '',
      },
      body: JSON.stringify({
        instanceName,
        token: crypto.randomUUID(),
        qrcode: true,
        integration,
        webhook: {
          enabled: true,
          url: webhookUrl,
          events: requiredEvents,
        },
      }),
    });
  } catch (err: any) {
    return c.json({ ok: false, error: 'Falha de rede com Evolution API', detail: err.message }, 502);
  }

  if (!evolutionResp.ok) {
    const errText = await evolutionResp.text();
    return c.json(
      { ok: false, error: `Evolution API retornou ${evolutionResp.status}`, detail: errText },
      502 as any,
    );
  }

  const data: any = await evolutionResp.json();
  const instanceId = data?.instance?.instanceId ?? data?.instance?.instanceName ?? instanceName;

  const qrcode = data.qrcode ?? {};
  const expiresAt =
    typeof qrcode.expires === 'number'
      ? new Date(Date.now() + qrcode.expires * 1000).toISOString()
      : null;

  // 2. Configurar Webhook na Evolution API v2.3.7 (garante registro explícito com suporte a formato raiz e aninhado)
  try {
    await fetch(`${c.env.EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: c.env.EVOLUTION_API_KEY ?? '',
      },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: requiredEvents,
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: requiredEvents,
        },
      }),
    });
  } catch (err) {
    console.error('[conversas-instance-create] Erro ao configurar webhook:', err);
  }

  const qrcodeDataFinal = data.base64 ?? qrcode.base64 ?? qrcode.code ?? null;

  // 3. Persistir no Supabase com vínculo seguro ao usuário
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('conversas_instancias')
    .upsert(
      {
        user_id: userId,
        instance_name: instanceName,
        instance_id: instanceId,
        status: 'connecting',
        phone: null,
        webhook_url: webhookUrl,
        qrcode_data: qrcodeDataFinal,
        qrcode_expires_at: expiresAt,
        evolution_token: data.hash ?? null,
      },
      { onConflict: 'user_id,instance_name' },
    )
    .select('id, instance_name, status, phone, qrcode_data, qrcode_expires_at, webhook_url')
    .single();

  if (insertError) {
    return c.json({ ok: false, error: 'Erro ao persistir instância', detail: insertError.message }, 500);
  }

  return c.json({
    ok: true,
    data: {
      instance: inserted,
      qrcode: {
        code: qrcodeDataFinal,
        expiresAt,
      },
    },
  }, 200);
}
