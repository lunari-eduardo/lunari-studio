/**
 * Route: GET /api/conversas/instance/status/:id
 *
 * Retorna o estado atual da conexão WhatsApp (open/close/connecting).
 * Proxy para GET /instance/connectionState/{instance} da Evolution API.
 */

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';
import { requireUserAuth } from '../utils/auth.js';

function mapStateToStatus(state: string | undefined): string {
  switch (state) {
    case 'open':
      return 'connected';
    case 'close':
      return 'disconnected';
    case 'connecting':
      return 'connecting';
    default:
      return 'error';
  }
}

export async function conversasInstanceStatusRoute(c: Context<{ Bindings: Bindings }>) {
  const auth = await requireUserAuth(c);
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  const instanceId = c.req.param('id');
  if (!instanceId) {
    return c.json({ ok: false, error: 'instance id é obrigatório' }, 400);
  }

  const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: instance, error: instanceErr } = await supabaseAdmin
    .from('conversas_instancias')
    .select('id, instance_name, status')
    .eq('id', instanceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (instanceErr || !instance) {
    return c.json({ ok: false, error: 'Instância não encontrada' }, 404);
  }

  let evolutionResp: Response;
  try {
    evolutionResp = await fetch(
      `${c.env.EVOLUTION_API_URL}/instance/connectionState/${instance.instance_name}`,
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
  const state: string | undefined = data?.instance?.state ?? data?.state;
  const mapped = mapStateToStatus(state);

  // Persistir se mudou.
  if (mapped !== instance.status) {
    await supabaseAdmin
      .from('conversas_instancias')
      .update({ status: mapped })
      .eq('id', instanceId);
  }

  return c.json({
    ok: true,
    data: {
      status: mapped,
      evolutionState: state ?? null,
    },
  }, 200);
}
