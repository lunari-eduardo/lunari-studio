import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { errorResponse } from "./auth-guard.ts";

export async function hasEntitlement(
  supabase: SupabaseClient,
  userId: string,
  key: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("has_entitlement", {
      _user_id: userId,
      _key: key,
    });
    
    if (error) {
      console.error(`[hasEntitlement] Error checking key ${key} for user ${userId}:`, error);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error(`[hasEntitlement] Unexpected error:`, err);
    return false;
  }
}

export async function requireEntitlement(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  featureName: string = "Esta funcionalidade"
): Promise<{ hasEntitlement: true; errorResponse: null } | { hasEntitlement: false; errorResponse: Response }> {
  const isAllowed = await hasEntitlement(supabase, userId, key);
  
  if (!isAllowed) {
    return {
      hasEntitlement: false,
      errorResponse: errorResponse(
        `${featureName} não está disponível no seu plano atual. Faça o upgrade para o plano Pro para ter acesso.`,
        403,
        "PLAN_RESTRICTION"
      ),
    };
  }

  return { hasEntitlement: true, errorResponse: null };
}
