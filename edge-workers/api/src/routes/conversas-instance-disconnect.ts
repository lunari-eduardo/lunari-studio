/**
 * Route: POST /api/conversas/instance/disconnect/:id
 *
 * Desloga a instância do WhatsApp (logout) via Evolution API.
 * Atualiza o status para 'disconnected' localmente.
 */

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';

export async function conversasInstanceDisconnectRoute(c: Context<{ Bindings: Bindings }>) {
  if (!c.env.EVOLUTION_API_URL || !c.env.EVOLUTION_API_KEY) {
    return c.json({ error: 'Configuração de API incompleta' }, 500);
  }

  const authHeader = c.req.header('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) return c.json({ error: 'Unauthorized' }, 401);
  const userId = userData.user.id;

  const instanceId = c.req.param('id');
  if (!instanceId) return c.json({ error: 'ID da instância não fornecido' }, 400);

  // Obter instância
  const { data: instance, error: instanceError } = await supabaseAdmin
    .from('conversas_instancias')
    .select('instance_name')
    .eq('id', instanceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (instanceError || !instance) return c.json({ error: 'Instância não encontrada' }, 404);

  try {
    const response = await fetch(
      `${c.env.EVOLUTION_API_URL}/instance/logout/${instance.instance_name}`,
      {
        method: 'DELETE',
        headers: { apikey: c.env.EVOLUTION_API_KEY },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      // Em alguns casos a Evolution API pode retornar erro se já estiver deslogado. 
      // Vamos assumir que se falhar, logamos o erro, mas tentamos atualizar o banco mesmo assim.
      console.error('[instance-disconnect] Evolution API falhou:', errText);
    }

    await supabaseAdmin
      .from('conversas_instancias')
      .update({ status: 'disconnected', qrcode_data: null })
      .eq('id', instanceId);

    return c.json({ success: true }, 200);
  } catch (err: any) {
    return c.json({ error: 'Erro ao deslogar da Evolution API', detail: err.message }, 500);
  }
}
