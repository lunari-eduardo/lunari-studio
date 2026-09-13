/**
 * Route: POST /api/conversas/fetch-avatar
 *
 * Busca a foto de perfil de um contato sob demanda na Evolution API (WhatsApp)
 * e persiste no Supabase (conversas_chats e conversas_contatos).
 */

import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';

export async function conversasFetchAvatarRoute(c: Context<{ Bindings: Bindings }>) {
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

  let body: { instanceId: string; phone: string; chatId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { instanceId, phone, chatId } = body;
  if (!instanceId || !phone) {
    return c.json({ error: 'instanceId e phone são obrigatórios' }, 400);
  }

  const { data: instance, error: instanceError } = await supabaseAdmin
    .from('conversas_instancias')
    .select('id, instance_name, user_id')
    .eq('id', instanceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (instanceError || !instance) {
    return c.json({ error: 'Instância não encontrada' }, 404);
  }

  try {
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    const res = await fetch(
      `${c.env.EVOLUTION_API_URL}/chat/fetchProfilePictureUrl/${instance.instance_name}`,
      {
        method: 'POST',
        headers: {
          apikey: c.env.EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: digitsOnly }),
      },
    );

    if (!res.ok) {
      return c.json({ ok: false, error: 'Evolution API returned error' }, res.status as any);
    }

    const data: any = await res.json();
    const avatarUrl = data?.profilePictureUrl ?? null;

    if (avatarUrl) {
      if (chatId) {
        await supabaseAdmin
          .from('conversas_chats')
          .update({ contato_avatar: avatarUrl })
          .eq('id', chatId)
          .eq('user_id', userId);
      } else {
        await supabaseAdmin
          .from('conversas_chats')
          .update({ contato_avatar: avatarUrl })
          .eq('instance_id', instanceId)
          .eq('contato_phone_normalized', digitsOnly)
          .eq('user_id', userId);
      }

      await supabaseAdmin
        .from('conversas_contatos')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId)
        .eq('phone_normalized', digitsOnly);
    }

    return c.json({ ok: true, avatarUrl });
  } catch (err: any) {
    console.error('[fetch-avatar] Erro ao buscar foto de perfil:', err);
    return c.json({ error: 'Erro ao buscar avatar', detail: err.message }, 500);
  }
}
