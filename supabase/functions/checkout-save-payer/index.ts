/**
 * checkout-save-payer — grava no checkout preferences os dados coletados no checkout público.
 *
 * PÚBLICO (verify_jwt = false). Recebe apenas o `cobrancaId` e os campos do
 * pagador; resolve o `cliente_id` pelo banco (nunca aceita do cliente).
 *
 * MUDANÇA CRÍTICA: Nome do checkout vai para cliente_checkout_preferences,
 * NUNCA para clientes.nome. Isso evita que o cliente atualize o nome da mãe
 * no CRM ao pagar (ex: InfinitePay atualiza nome e volta para o sistema).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { normalizeCpfCnpj, normalizeEmail, normalizePhone } from "../_shared/payer-hints.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cobrancaId, payer } = await req.json();
    if (!cobrancaId) return json({ success: false, error: "cobrancaId é obrigatório" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Buscar cobranca para resolver cliente_id
    const { data: cobranca } = await supabase
      .from("cobrancas")
      .select("id, cliente_id")
      .eq("id", cobrancaId)
      .maybeSingle();

    if (!cobranca) return json({ success: false, error: "Cobrança não encontrada" }, 404);
    if (!cobranca.cliente_id) return json({ success: true, updated: false, fields: [] });

    // 2. Preparar dados normalizados para o checkout
    const normalizedNome = (payer?.nome || "").trim();
    const normalizedEmail = normalizeEmail(payer?.email);
    const normalizedTelefone = normalizePhone(payer?.telefone);
    const normalizedCpf = normalizeCpfCnpj(payer?.cpfCnpj);

    // 3. Usar RPC para upsert das preferences de checkout
    // IMPORTANTE: NUNCA atualizamos clientes.nome aqui
    const { data: prefsId, error: prefsError } = await supabase.rpc(
      "upsert_checkout_preferences",
      {
        p_cliente_id: cobranca.cliente_id,
        p_nome_preferido: normalizedNome.length >= 2 ? normalizedNome : null,
        p_email_preferido: normalizedEmail || null,
        p_telefone_preferido: normalizedTelefone || null,
        p_cpf_preferido: normalizedCpf || null,
      }
    );

    if (prefsError) {
      console.error("[checkout-save-payer] RPC error:", prefsError);
      return json({ success: false, error: "Erro ao salvar preferências" }, 500);
    }

    // 4. Log do que foi salvo para debugging
    const savedFields: string[] = [];
    if (normalizedNome.length >= 2) savedFields.push("nome_preferido");
    if (normalizedEmail) savedFields.push("email_preferido");
    if (normalizedTelefone) savedFields.push("telefone_preferido");
    if (normalizedCpf) savedFields.push("cpf_preferido");

    console.log(`[checkout-save-payer] Saved preferences for cliente ${cobranca.cliente_id}:`, savedFields);

    return json({
      success: true,
      updated: savedFields.length > 0,
      fields: savedFields,
      preferencesId: prefsId
    });

  } catch (err) {
    console.error("[checkout-save-payer]", err);
    return json({ success: false, error: "Erro interno" }, 500);
  }
});
