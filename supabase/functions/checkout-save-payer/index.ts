/**
 * checkout-save-payer — grava dados do checkout em clientes.nome_checkout
 * (e campos de contato secundários se estiverem vazios).
 *
 * PÚBLICO (verify_jwt = false). Recebe apenas o `cobrancaId` e os campos do
 * pagador; resolve o `cliente_id` pelo banco (nunca aceita do cliente).
 *
 * REGRA CRÍTICA: nome do checkout vai para clientes.nome_checkout,
 * NUNCA para clientes.nome. "Primeira vez wins": se já tem nome_checkout,
 * alterações são descartadas para proteger contra edições posteriores.
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

    // 3. Buscar estado atual do cliente (nome_checkout + CRM)
    // para respeitar a regra "primeira vez wins" no nome.
    const { data: clienteDb } = await supabase
      .from("clientes")
      .select("nome_checkout, nome, email, telefone, whatsapp, cpf_cnpj")
      .eq("id", cobranca.cliente_id)
      .maybeSingle();

    // 4. Montar patch para clientes
    // IMPORTANTE: nome_checkout só grava se ainda estiver vazio (proteção "1ª vez wins")
    // clientes.nome NUNCA é alterado aqui (proteção do CRM)
    const patchCliente: Record<string, string> = {};
    const isEmptyField = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");

    if (normalizedNome.length >= 2 && !clienteDb?.nome_checkout) {
      patchCliente.nome_checkout = normalizedNome;
    }
    if (normalizedEmail && isEmptyField(clienteDb?.email)) {
      patchCliente.email = normalizedEmail.toLowerCase();
    }
    if (normalizedTelefone && isEmptyField(clienteDb?.whatsapp) && isEmptyField(clienteDb?.telefone)) {
      const phoneDigits = normalizedTelefone.replace(/\D/g, "");
      patchCliente.whatsapp = phoneDigits;
      patchCliente.telefone = phoneDigits;
    }
    if (normalizedCpf && isEmptyField(clienteDb?.cpf_cnpj)) {
      patchCliente.cpf_cnpj = normalizedCpf.replace(/\D/g, "");
    }

    if (Object.keys(patchCliente).length > 0) {
      const { error: updateError } = await supabase
        .from("clientes")
        .update(patchCliente)
        .eq("id", cobranca.cliente_id);

      if (updateError) {
        console.error("[checkout-save-payer] Update error:", updateError);
        return json({ success: false, error: "Erro ao salvar dados" }, 500);
      }
    }

    // 5. Log do que foi salvo para debugging
    const savedFields: string[] = [];
    if (patchCliente.nome_checkout) savedFields.push("nome_checkout");
    if (normalizedEmail) savedFields.push("email");
    if (normalizedTelefone) savedFields.push("telefone");
    if (normalizedCpf) savedFields.push("cpfCnpj");

    console.log(`[checkout-save-payer] Saved data for cliente ${cobranca.cliente_id}:`, savedFields);

    return json({
      success: true,
      updated: savedFields.length > 0,
      fields: savedFields,
    });

  } catch (err) {
    console.error("[checkout-save-payer]", err);
    return json({ success: false, error: "Erro interno" }, 500);
  }
});
