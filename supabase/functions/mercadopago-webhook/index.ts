// supabase/functions/mercadopago-webhook/index.ts
// Webhook do Mercado Pago com reconciliaÃ§Ã£o determinÃ­stica O(1) e mÃ¡quina de estados

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { corsHeaders, jsonResponse } from "../_shared/auth-guard.ts";
import { normalizeGatewayStatus, canTransition } from "../_shared/state-machine.ts";
import { decryptToken } from "../_shared/crypto.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    let body: any = {};
    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const idFromQuery = url.searchParams.get("id") || url.searchParams.get("data.id");

    try {
      body = await req.json();
    } catch {
      // NotificaÃ§Ã£o IPN do Mercado Pago pode vir apenas via query params
    }

    console.log("[mercadopago-webhook] Recebido:", JSON.stringify({ body, query: Object.fromEntries(url.searchParams.entries()) }));

    // 1. Log preliminar do webhook para auditoria
    await supabase.from("webhook_logs").insert({
      provedor: "mercadopago",
      payload: { body, query: Object.fromEntries(url.searchParams.entries()) },
      headers: Object.fromEntries(req.headers.entries()),
      status: "received",
    }).then(() => {}, (err) => console.warn("[mercadopago-webhook] Falha no log:", err));

    const type = body.type || topic;
    const action = body.action;
    const paymentId = body.data?.id || idFromQuery;

    if (!paymentId || (type !== "payment" && !action?.includes("payment") && topic !== "payment")) {
      console.log("[mercadopago-webhook] Evento ignorado (nÃ£o Ã© de pagamento ou ID ausente):", { type, action, paymentId });
      return jsonResponse({ received: true });
    }

    console.log(`[mercadopago-webhook] Processando pagamento Mercado Pago: ${paymentId}`);

    // 2. BUSCA O(1) DA COBRANÃ‡A NO BANCO
    let { data: cobranca } = await supabase
      .from("cobrancas")
      .select("*")
      .or(`mp_payment_id.eq.${paymentId},provider_transaction_id.eq.${paymentId},provider_order_id.eq.${paymentId},id.eq.${paymentId}`)
      .maybeSingle();

    let paymentData: any = null;

    // Se a cobranÃ§a jÃ¡ foi encontrada, usamos o token do fotÃ³grafo dono para consultar dados de taxas atualizados
    if (cobranca) {
      const { data: integ } = await supabase
        .from("usuarios_integracoes")
        .select("access_token")
        .eq("user_id", cobranca.user_id)
        .eq("provedor", "mercadopago")
        .eq("status", "ativo")
        .maybeSingle();

      if (integ?.access_token) {
        try {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${await decryptToken(integ.access_token)}` },
          });
          if (mpRes.ok) {
            paymentData = await mpRes.json();
          }
        } catch (e) {
          console.warn("[mercadopago-webhook] Falha nÃ£o impeditiva ao consultar pagamento no MP:", e);
        }
      }
    } else {
      // CobranÃ§a nÃ£o encontrada por payment_id (ex: pagamento via Link de PreferÃªncia onde payment_id sÃ³ nasce agora)
      // Fazemos busca por token do fotÃ³grafo ou varredura de integraÃ§Ãµes
      const { data: integrations } = await supabase
        .from("usuarios_integracoes")
        .select("user_id, access_token")
        .eq("provedor", "mercadopago")
        .eq("status", "ativo");

      for (const integ of integrations || []) {
        if (!integ.access_token) continue;
        try {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${await decryptToken(integ.access_token)}` },
          });
          if (mpRes.ok) {
            paymentData = await mpRes.json();
            break;
          }
        } catch {
          // Continua busca
        }
      }

      if (paymentData) {
        // ReconciliaÃ§Ã£o direta por external_reference (cobranca.id) ou preference_id
        if (paymentData.external_reference) {
          const { data: byExtRef } = await supabase
            .from("cobrancas")
            .select("*")
            .eq("id", paymentData.external_reference)
            .maybeSingle();
          if (byExtRef) cobranca = byExtRef;
        }

        if (!cobranca && paymentData.preference_id) {
          const { data: byPref } = await supabase
            .from("cobrancas")
            .select("*")
            .or(`mp_preference_id.eq.${paymentData.preference_id},provider_order_id.eq.${paymentData.preference_id}`)
            .maybeSingle();
          if (byPref) cobranca = byPref;
        }
      }
    }

    if (!cobranca) {
      console.warn(`[mercadopago-webhook] Nenhuma cobranÃ§a encontrada para payment_id=${paymentId}`);
      return jsonResponse({ received: true, not_found: true });
    }

    const { requireEntitlement } = await import("../_shared/entitlements.ts");
    const ent = await requireEntitlement(supabase, cobranca.user_id, "integrations", "IntegraÃ§Ã£o MP");
    if (!ent.hasEntitlement) {
       console.warn(`[mercadopago-webhook] Pagamento ignorado por restriÃ§Ã£o de plano (user ${cobranca.user_id})`);
       return jsonResponse({ received: true, ignored: true, reason: "plan_restriction" });
    }

    // 3. NORMALIZAÃ‡ÃƒO DO EVENTO VIA MÃQUINA DE ESTADOS
    const rawStatus = paymentData?.status || "approved";
    const { nextStatus, isPaymentConfirmed } = normalizeGatewayStatus("mercadopago", rawStatus, paymentData);

    console.log(`[mercadopago-webhook] TransiÃ§Ã£o: status_atual=${cobranca.status} -> proximo_status=${nextStatus} (raw=${rawStatus})`);

    if (!canTransition(cobranca.status, nextStatus)) {
      console.warn(`[mercadopago-webhook] TransiÃ§Ã£o invÃ¡lida ignorada: ${cobranca.status} -> ${nextStatus}`);
      return jsonResponse({ received: true, skipped_transition: true });
    }

    // 4. ATUALIZAR COBRANÃ‡A
    const netReceived = paymentData?.transaction_details?.net_received_amount ?? null;
    const updateData: Record<string, any> = {
      status: nextStatus,
      mp_payment_id: String(paymentId),
      provider_transaction_id: String(paymentId),
      updated_at: new Date().toISOString(),
    };

    if (isPaymentConfirmed) {
      updateData.data_pagamento = new Date().toISOString();
      if (netReceived !== null && netReceived !== undefined) {
        updateData.valor_liquido = netReceived;
      }
      
      // FASE 1: Populando data de crÃ©dito para camada financeira
      if (paymentData?.money_release_date) {
        updateData.data_credito = paymentData.money_release_date.split("T")[0];
      }
      if (paymentData?.money_release_status === "released") {
        updateData.data_credito_real = new Date().toISOString();
      }
    }

    const { error: updateError } = await supabase
      .from("cobrancas")
      .update(updateData)
      .eq("id", cobranca.id);

    if (updateError) {
      console.error("[mercadopago-webhook] Erro ao atualizar cobranÃ§a:", updateError);
      return jsonResponse({ received: false, error: updateError.message }, 500);
    }

    console.log(`[mercadopago-webhook] CobranÃ§a ${cobranca.id} atualizada com sucesso para status=${nextStatus}`);

    // Finalizar galeria e sincronizar extras se aplicÃ¡vel
    if (isPaymentConfirmed && (cobranca.galeria_id || cobranca.finalidade === "fotos_extras" || cobranca.finalidade === "sessao_e_extras")) {
      try {
        await supabase.rpc("finalize_gallery_payment", {
          p_cobranca_id: cobranca.id,
          p_paid_at: updateData.data_pagamento,
        });
        console.log(`[mercadopago-webhook] finalize_gallery_payment executado para cobranca=${cobranca.id}`);
      } catch (finalizeErr) {
        console.warn("[mercadopago-webhook] finalize_gallery_payment erro nÃ£o impeditivo:", finalizeErr);
      }
    }

    // Disparo de e-mail de pagamento confirmado se aplicÃ¡vel
    if (isPaymentConfirmed) {
      try {
        fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            eventType: "payment_confirmed",
            paymentId: cobranca.id,
            galleryId: cobranca.galeria_id || undefined,
          }),
        }).catch((e) => console.warn("[mercadopago-webhook] send-email async error:", e));
      } catch (e) {
        console.warn("[mercadopago-webhook] send-email error:", e);
      }
    }

    return jsonResponse({ received: true, status: nextStatus, cobrancaId: cobranca.id });
  } catch (error: any) {
    console.error("[mercadopago-webhook] Erro inesperado:", error);
    return jsonResponse({ received: true, error: error.message });
  }
});
