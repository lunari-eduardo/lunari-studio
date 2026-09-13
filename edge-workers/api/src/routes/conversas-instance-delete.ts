/**
 * Route: DELETE /api/conversas/instance/:id
 *
 * Exclui completamente a instância na Evolution API.
 * Apaga o registro correspondente no banco (o CASCADE cuidará das mensagens/chats associados).
 */

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';

export async function conversasInstanceDeleteRoute(c: Context<{ Bindings: Bindings }>) {
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
      `${c.env.EVOLUTION_API_URL}/instance/delete/${instance.instance_name}`,
      {
        method: 'DELETE',
        headers: { apikey: c.env.EVOLUTION_API_KEY },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[instance-delete] Evolution API falhou:', errText);
      // Se não encontrou na API (404), ignoramos e deletamos no Supabase
      if (response.status !== 404) {
        return c.json({ error: 'Erro ao deletar instância na Evolution API', detail: errText }, 500);
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('conversas_instancias')
      .delete()
      .eq('id', instanceId);

    if (deleteError) {
      return c.json({ error: 'Erro ao deletar instância localmente', detail: deleteError.message }, 500);
    }

    return c.json({ success: true }, 200);
  } catch (err: any) {
    return c.json({ error: 'Erro de rede ao deletar instância', detail: err.message }, 500);
  }
}
