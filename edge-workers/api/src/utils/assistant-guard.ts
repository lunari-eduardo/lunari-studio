import type { SupabaseClient } from "@supabase/supabase-js";

export async function isAssistantAllowed(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("assistant_access_allowed", {
      _uid: userId,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

export async function assertAssistantAccess(
  supabase: SupabaseClient,
  userId: string,
  corsHeaders: Record<string, string>,
  meta?: { module?: string; capability_id?: string },
): Promise<Response | null> {
  const allowed = await isAssistantAllowed(supabase, userId);
  if (allowed) return null;
  
  try {
    await supabase.from("assistant_invocations").insert({
      user_id: userId,
      capability_id: meta?.capability_id ?? "assistant.access",
      module: meta?.module ?? "assistant",
      kind: "gate",
      actor: "system",
      output_status: "blocked_by_rollout",
    });
  } catch { /* ignore */ }
  
  return new Response(
    JSON.stringify({
      error: "assistant_locked",
      message:
        "A assistente Lu está em teste fechado. Solicite acesso para participar do beta.",
    }),
    {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
