/**
 * Helper compartilhado de autenticação para rotas protegidas do Worker.
 *
 * Recebe `Authorization: Bearer <jwt>` do Supabase, valida via
 * `supabase.auth.getUser`, e devolve um objeto com `userId` + clients
 * prontos para uso.
 *
 * Uso:
 *   const auth = await requireUserAuth(c);
 *   if (!auth.ok) return auth.response;
 *   const { userId } = auth;
 */

import { Context } from 'hono';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';

export type AuthSuccess = {
  ok: true;
  userId: string;
  token: string;
  supabase: SupabaseClient; // client com anon key + user JWT (RLS enforced)
  supabaseAdmin: SupabaseClient; // client com service role (RLS bypassed)
};

export type AuthFailure = {
  ok: false;
  response: Response;
};

export async function requireUserAuth(
  c: Context<{ Bindings: Bindings }>,
): Promise<AuthSuccess | AuthFailure> {
  const authHeader = c.req.header('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return {
      ok: false,
      response: c.json({ ok: false, error: 'Unauthorized: missing token' }, 401),
    };
  }

  const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !userData?.user) {
    return {
      ok: false,
      response: c.json({ ok: false, error: 'Unauthorized: invalid token' }, 401),
    };
  }

  // Client "scoped" do usuário — RLS aplicado com o JWT dele.
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  return {
    ok: true,
    userId: userData.user.id,
    token,
    supabase,
    supabaseAdmin,
  };
}
