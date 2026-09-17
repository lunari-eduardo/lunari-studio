// Admin-only: persiste/atualiza credenciais Asaas usadas exclusivamente
// pelas assinaturas Lunari (tabela platform_integrations).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // ─── ACTION: Definir chave do assistente (Cofre IA) ───
    if (body.action === "set_assistant_key") {
      const { provider_name, api_key, model_id } = body;
      if (!provider_name) {
        return new Response(JSON.stringify({ error: "provider_name required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let encryptedKey = "";
      if (api_key) {
        encryptedKey = await encryptToken(api_key.trim());
      }

      const { error: rpcError } = await supabase.rpc("set_assistant_provider_key", {
        p_provider_name: provider_name,
        p_api_key: encryptedKey,
        p_model_id: model_id,
      });

      if (rpcError) throw rpcError;

      return new Response(JSON.stringify({ ok: true, success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: Executar Backfill de Criptografia ───
    if (body.action === "run_backfill") {
      // 1. Migrar tokens de usuários (usuarios_integracoes)
      const { data: userIntegrations, error: uiErr } = await admin
        .from("usuarios_integracoes")
        .select("id, access_token, refresh_token");
      if (uiErr) throw uiErr;

      let uiCount = 0;
      for (const row of (userIntegrations || [])) {
        let changed = false;
        const updates: any = {};
        const at = row.access_token?.trim();
        if (at && !at.startsWith("enc:v1:")) {
          updates.access_token = await encryptToken(at);
          changed = true;
        }
        const rt = row.refresh_token?.trim();
        if (rt && !rt.startsWith("enc:v1:")) {
          updates.refresh_token = await encryptToken(rt);
          changed = true;
        }
        if (changed) {
          const { error: upErr } = await admin.from("usuarios_integracoes").update(updates).eq("id", row.id);
          if (!upErr) uiCount++;
        }
      }

      // 2. Migrar platform_integrations
      const { data: platformRows, error: pErr } = await admin
        .from("platform_integrations")
        .select("id, api_key")
        .not("api_key", "is", null);
      if (pErr) throw pErr;

      let platformCount = 0;
      for (const row of (platformRows || [])) {
        const k = row.api_key?.trim();
        if (k && !k.startsWith("enc:v1:")) {
          const encrypted = await encryptToken(k);
          const { error: upErr } = await admin.from("platform_integrations").update({ api_key: encrypted }).eq("id", row.id);
          if (!upErr) platformCount++;
        }
      }

      // 3. Migrar assistant_provider_keys
      const { data: assistantRows, error: aErr } = await admin
        .from("assistant_provider_keys")
        .select("provider_name, api_key")
        .not("api_key", "is", null);
      if (aErr) throw aErr;

      let assistantCount = 0;
      for (const row of (assistantRows || [])) {
        const k = row.api_key?.trim();
        if (k && !k.startsWith("enc:v1:")) {
          const encrypted = await encryptToken(k);
          const { error: upErr } = await admin.from("assistant_provider_keys").update({ api_key: encrypted }).eq("provider_name", row.provider_name);
          if (!upErr) assistantCount++;
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        message: "Backfill concluído com sucesso",
        migrated: {
          usuarios_integracoes: uiCount,
          platform_integrations: platformCount,
          assistant_provider_keys: assistantCount,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = String(body.provider || "asaas");
    const scope = String(body.scope || "subscriptions");
    const environment = body.environment === "production" ? "production" : "sandbox";
    const apiKey = String(body.apiKey || "").trim();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "apiKey é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validação ativa prévia se for Asaas
    if (provider === "asaas") {
      const testUrl = environment === "production" ? "https://api.asaas.com" : "https://api-sandbox.asaas.com";
      const testRes = await fetch(`${testUrl}/v3/myAccount/status`, {
        headers: { access_token: apiKey },
      });
      if (!testRes.ok) {
        return new Response(
          JSON.stringify({ error: `Chave de API inválida no Asaas (${environment}): HTTP ${testRes.status}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const encryptedKey = await encryptToken(apiKey);

    // Upsert por (provider, scope)
    const { data, error } = await admin
      .from("platform_integrations")
      .upsert(
        {
          provider,
          scope,
          environment,
          api_key: encryptedKey,
          updated_by: user.id,
          last_test_status: null,
          last_test_message: null,
          last_test_at: null,
        },
        { onConflict: "provider,scope" }
      )
      .select("id, provider, scope, environment, updated_at")
      .single();

    if (error) {
      console.error("upsert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, integration: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
