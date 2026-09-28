/**
 * lua-generate-reply — Gera rascunho de resposta contextual usando o DNA da Lua.
 *
 * Contrato:
 *  - POST body: {
 *      prompt: string,            // Mensagem do cliente (ou pergunta fictícia no playground)
 *      chat_id?: string,          // ID do chat (opcional, para auditoria e contexto)
 *      recent_messages?: Array<{ direction: string, content: string }>,  // Últimas N mensagens para contexto
 *      etapa?: string,            // Etapa do funil para selecionar templates relevantes
 *    }
 *  - Response: { reply: string, dna_version: number }
 *
 * Segurança:
 *  - Verifica JWT via getClaims; user_id vem do token, nunca do body.
 *  - Usa a mesma API Key e provedor configurados no painel admin (app_settings + assistant_provider_keys).
 *  - NUNCA envia mensagem para o cliente. Retorna apenas texto puro.
 *  - Registra auditoria em lua_generation_audit.
 */

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { createGoogleGenerativeAI } from "npm:@ai-sdk/google@^2";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@^1";
import { generateText } from "npm:ai@^5";
import { decryptToken } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_MODEL = "gemini-2.5-flash";

interface GenerateRequestBody {
  prompt: string;
  chat_id?: string;
  recent_messages?: Array<{ direction: string; content: string }>;
  etapa?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // --- Auth ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userId = claimsData.claims.sub as string;

  // --- Parse body ---
  let body: GenerateRequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body.prompt || typeof body.prompt !== "string" || !body.prompt.trim()) {
    return json({ error: "prompt: string required" }, 400);
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = Date.now();

  try {
    // --- 1. Buscar configuração de provedor e modelo do admin ---
    const [{ data: provRow }, { data: modRow }] = await Promise.all([
      supabaseService.from("app_settings").select("value").eq("key", "assistant_ai_provider").maybeSingle(),
      supabaseService.from("app_settings").select("value").eq("key", "assistant_ai_model").maybeSingle(),
    ]);

    const providerName = typeof provRow?.value === "string" ? provRow.value : "gemini";
    const modelId = typeof modRow?.value === "string" ? modRow.value : DEFAULT_MODEL;

    // --- 2. Buscar API Key do cofre ---
    const { data: keyRow } = await supabaseService
      .from("assistant_provider_keys")
      .select("api_key")
      .eq("provider_name", providerName)
      .maybeSingle();

    const apiKey = keyRow?.api_key ? await decryptToken(keyRow.api_key) : undefined;
    if (!apiKey || apiKey.length < 10) {
      return json({ error: `API Key não configurada para o provedor '${providerName}'. Configure no Painel Admin.` }, 500);
    }

    // --- 3. Montar contexto: DNA + Conhecimento + Templates ---
    const [
      { data: dnaProfile },
      { data: knowledge },
      { data: templates },
    ] = await Promise.all([
      supabaseService.from("lua_dna_profiles")
        .select("version, voice_summary, attributes, learning_metrics")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseService.from("lua_studio_knowledge")
        .select("hours, policies, services, pix_reference, websites, socials, notes")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseService.from("conversas_templates")
        .select("nome, conteudo, etapa, palavras_chave")
        .eq("user_id", userId)
        .eq("ativo", true)
        .limit(20),
    ]);

    const dnaVersion = dnaProfile?.version ?? 0;

    // --- 4. Compor System Prompt contextual ---
    const contextParts: string[] = [];
    contextParts.push(
      `Você é a Lua, assistente de atendimento do estúdio de fotografia. Seu papel é redigir um RASCUNHO de resposta para o fotógrafo enviar ao cliente.`,
      `REGRAS INVIOLÁVEIS:`,
      `- Você gera APENAS o texto da resposta. Sem saudações ao fotógrafo, sem explicações, sem prefixos como "Aqui está".`,
      `- NUNCA invente preços, datas ou serviços que não constem no contexto abaixo.`,
      `- Tom: profissional, empático e direto. Sem emojis excessivos.`,
      `- Se não tiver informação suficiente, diga educadamente que o fotógrafo retornará com os detalhes.`,
    );

    if (dnaProfile?.voice_summary) {
      contextParts.push(`\n## DNA de Atendimento (v${dnaVersion})\n${dnaProfile.voice_summary}`);
    }
    if (dnaProfile?.attributes && typeof dnaProfile.attributes === "object") {
      const attrs = Object.entries(dnaProfile.attributes)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n");
      if (attrs) contextParts.push(`\n## Estilo detectado\n${attrs}`);
    }

    if (knowledge) {
      const knowledgeParts: string[] = [];
      if (knowledge.services) knowledgeParts.push(`Serviços: ${knowledge.services}`);
      if (knowledge.hours) knowledgeParts.push(`Horários: ${knowledge.hours}`);
      if (knowledge.policies) knowledgeParts.push(`Políticas: ${knowledge.policies}`);
      if (knowledge.pix_reference) knowledgeParts.push(`PIX: ${knowledge.pix_reference}`);
      if (knowledge.websites) knowledgeParts.push(`Sites: ${knowledge.websites}`);
      if (knowledge.socials) knowledgeParts.push(`Redes: ${knowledge.socials}`);
      if (knowledge.notes) knowledgeParts.push(`Notas: ${knowledge.notes}`);
      if (knowledgeParts.length > 0) {
        contextParts.push(`\n## Dados do Estúdio\n${knowledgeParts.join("\n")}`);
      }
    }

    if (templates && templates.length > 0) {
      const relevantTemplates = body.etapa
        ? templates.filter((t: any) => t.etapa === body.etapa || !t.etapa)
        : templates;
      if (relevantTemplates.length > 0) {
        const templateBlock = relevantTemplates
          .slice(0, 5)
          .map((t: any) => `### ${t.nome}\n${t.conteudo}`)
          .join("\n\n");
        contextParts.push(`\n## Modelos de Referência\nUse como inspiração de tom e estrutura (NÃO copie literalmente):\n${templateBlock}`);
      }
    }

    const systemPrompt = contextParts.join("\n");

    // --- 5. Montar mensagens ---
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (body.recent_messages && body.recent_messages.length > 0) {
      for (const msg of body.recent_messages.slice(-10)) {
        messages.push({
          role: msg.direction === "outbound" ? "assistant" : "user",
          content: msg.content,
        });
      }
    }

    // A mensagem final é sempre o prompt do cliente
    messages.push({ role: "user", content: body.prompt });

    // --- 6. Instanciar provedor ---
    let model: any;
    if (providerName === "gemini") {
      const google = createGoogleGenerativeAI({ apiKey });
      model = google(modelId);
    } else if (providerName === "deepseek") {
      const dsProvider = createOpenAICompatible({
        name: "deepseek",
        baseURL: "https://api.deepseek.com/beta",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      model = dsProvider(modelId);
    } else if (providerName === "openai") {
      const oaProvider = createOpenAICompatible({
        name: "openai",
        baseURL: "https://api.openai.com/v1",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      model = oaProvider(modelId);
    } else {
      // Fallback genérico para qualquer provedor OpenAI-compatible
      const fallbackProvider = createOpenAICompatible({
        name: providerName,
        baseURL: "https://api.openai.com/v1",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      model = fallbackProvider(modelId);
    }

    // --- 7. Gerar resposta ---
    console.log(`[lua-generate-reply] ▶ Gerando resposta — provider=${providerName} model=${modelId} dna_v=${dnaVersion}`);

    const result = await generateText({
      model,
      system: systemPrompt,
      messages,
      temperature: 0.4,
      maxTokens: 1024,
    });

    const reply = result.text?.trim() || "";
    const durationMs = Date.now() - startedAt;

    console.log(`[lua-generate-reply] ✓ Gerado em ${durationMs}ms — ${reply.length} chars`);

    // --- 8. Auditoria ---
    const contextHash = simpleHash(systemPrompt);
    const outputHash = simpleHash(reply);

    await supabaseService.from("lua_generation_audit").insert({
      user_id: userId,
      chat_id: body.chat_id || null,
      dna_version: dnaVersion,
      context_hash: contextHash,
      output_hash: outputHash,
      model: `${providerName}:${modelId}`,
      latency_ms: durationMs,
      tokens_usage: result.usage ?? null,
      status: "success",
    });

    return json({ reply, dna_version: dnaVersion });
  } catch (err: any) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    console.error("[lua-generate-reply] ✗ Erro:", message);

    // Auditoria de falha
    await supabaseService.from("lua_generation_audit").insert({
      user_id: userId,
      chat_id: body.chat_id || null,
      dna_version: 0,
      model: "unknown",
      latency_ms: durationMs,
      status: "error",
      context_hash: message.slice(0, 100),
    }).catch(() => {});

    const status = extractStatus(err) ?? 500;
    return json({ error: message }, status);
  }
});

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}

function extractStatus(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null) {
    const anyErr = err as { status?: number; statusCode?: number };
    if (typeof anyErr.status === "number") return anyErr.status;
    if (typeof anyErr.statusCode === "number") return anyErr.statusCode;
  }
  return undefined;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
