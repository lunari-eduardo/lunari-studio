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
  const { userId, supabase: userSupabase, token } = auth;

  // Service role para inserir a instância (RLS não aplicaria, mas usamos pra evitar problemas).
  const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  let body: { instanceName?: string; integration?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'Invalid JSON' }, 400);
  }

  const instanceName = body.instanceName?.trim();
  if (!instanceName) {
    return c.json({ ok: false, error: 'instanceName é obrigatório' }, 400);
  }

  const integration = body.integration ?? 'WHATSAPP-BUSINESS';

  // Chama Evolution API
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
  const instanceId = data?.instance?.instanceId ?? data?.instance?.instanceName ?? null;
  if (!instanceId) {
    return c.json({ ok: false, error: 'Evolution API não retornou instanceId', data }, 502);
  }

  const qrcode = data.qrcode ?? {};
  const expiresAt =
    typeof qrcode.expires === 'number'
      ? new Date(Date.now() + qrcode.expires * 1000).toISOString()
      : null;

  // Persistir no Supabase
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('conversas_instancias')
    .upsert(
      {
        user_id: userId,
        instance_name: instanceName,
        instance_id: instanceId,
        status: 'connecting',
        phone: null,
        qrcode_data: qrcode.code ?? null,
        qrcode_expires_at: expiresAt,
        evolution_token: data.hash ?? null,
      },
      { onConflict: 'user_id,instance_name' },
    )
    .select('id, instance_name, status, phone, qrcode_data, qrcode_expires_at')
    .single();

  if (insertError) {
    return c.json({ ok: false, error: 'Erro ao persistir instância', detail: insertError.message }, 500);
  }

  return c.json({
    ok: true,
    data: {
      instance: inserted,
      qrcode: {
        code: qrcode.code ?? null,
        expiresAt,
      },
    },
  }, 200);
}
