/**
 * Route: GET /api/conversas/instance/connect/:id
 *
 * Retorna o QR code atual da instância Evolution (refresh).
 *
 * Valida que a instância pertence ao usuário autenticado (multi-tenant).
 */

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';
import { requireUserAuth } from '../utils/auth.js';

export async function conversasInstanceConnectRoute(c: Context<{ Bindings: Bindings }>) {
  const auth = await requireUserAuth(c);
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  const instanceId = c.req.param('id');
  if (!instanceId) {
    return c.json({ ok: false, error: 'instance id é obrigatório' }, 400);
  }

  const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  // Verifica que a instância pertence ao usuário (multi-tenant).
  const { data: instance, error: instanceErr } = await supabaseAdmin
    .from('conversas_instancias')
    .select('id, instance_name')
    .eq('id', instanceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (instanceErr || !instance) {
    return c.json({ ok: false, error: 'Instância não encontrada' }, 404);
  }

  // GET é o método correto na Evolution API v2 (POST dá 404 "Cannot POST").
  let evolutionResp: Response;
  try {
    evolutionResp = await fetch(
      `${c.env.EVOLUTION_API_URL}/instance/connect/${instance.instance_name}`,
      {
        method: 'GET',
        headers: { apikey: c.env.EVOLUTION_API_KEY ?? '' },
      },
    );
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
  const qrcode = data?.qrcode ?? {};
  const expiresAt =
    typeof qrcode.expires === 'number'
      ? new Date(Date.now() + qrcode.expires * 1000).toISOString()
      : null;

  // Persistir o novo QR no banco.
  await supabaseAdmin
    .from('conversas_instancias')
    .update({
      qrcode_data: qrcode.code ?? null,
      qrcode_expires_at: expiresAt,
      status: 'connecting',
    })
    .eq('id', instanceId);

  return c.json({
    ok: true,
    data: {
      qrcode: {
        code: qrcode.code ?? null,
        expiresAt,
      },
    },
  }, 200);
}
