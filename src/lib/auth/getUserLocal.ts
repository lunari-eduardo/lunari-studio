/**
 * Substituto "drop-in" de `supabase.auth.getUser()` para o frontend.
 *
 * `getUser()` SEMPRE faz um round-trip a /auth/v1/user (log de Auth + log de API
 * + latência) a cada chamada; o app tinha ~200 call sites, vários em polling.
 * `getSession()` lê a sessão do storage local (e renova o token se expirado).
 *
 * Mantém o formato `UserResponse` para que o call site não mude. Seguro para
 * escopo de dados: o servidor valida o JWT e o RLS isola por `auth.uid()`.
 * NÃO use em Edge Functions/Workers — lá `getUser(jwt)` é a validação real.
 */
import { AuthSessionMissingError, type UserResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export async function getUserLocal(): Promise<UserResponse> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (session?.user) return { data: { user: session.user }, error: null };
  return { data: { user: null }, error: error ?? new AuthSessionMissingError() } as UserResponse;
}
