/**
 * conversas-ai-classify — Classificação inteligente de conversas para a Assistente Lua.
 * Integração direta com Google Gemini via vault de chaves do Lunari Studio.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { generateText } from "npm:ai@^5";
import { createGoogleGenerativeAI } from "npm:@ai-sdk/google@^2";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@^1";

const DEFAULT_MODEL = "gemini-2.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error("Resposta da IA não contém JSON");
  const sliced = candidate.slice(start);
  for (let end = sliced.length; end > 1; end--) {
    const attempt = sliced.slice(0, end).trim();
    if (!/[\]}]$/.test(attempt)) continue;
    try {
      return JSON.parse(attempt);
    } catch { /* parse progressivo */ }
  }
  throw new Error("Não foi possível interpretar o JSON da IA");
}

async function resolveModel() {
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [{ data: provRow }, { data: modRow }] = await Promise.all([
    supabaseService.from("app_settings").select("value").eq("key", "assistant_ai_provider").maybeSingle(),
    supabaseService.from("app_settings").select("value").eq("key", "assistant_ai_model").maybeSingle(),
  ]);

  const providerName = typeof provRow?.value === "string" ? provRow.value : "gemini";
  const modelId = typeof modRow?.value === "string" && modRow.value ? modRow.value : DEFAULT_MODEL;

  const { data: keyRow } = await supabaseService
    .from("assistant_provider_keys")
    .select("api_key")
    .eq("provider_name", providerName)
    .maybeSingle();

  const apiKey = keyRow?.api_key || Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");

  if (providerName === "gemini" && apiKey) {
    const google = createGoogleGenerativeAI({ apiKey });
    return { model: google(modelId), providerName, modelId };
  }
  if (providerName === "openai" && apiKey) {
    const oa = createOpenAICompatible({
      name: "openai",
      baseURL: "https://api.openai.com/v1",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return { model: oa(modelId), providerName, modelId };
  }

  // Fallback caso gemini não tenha chave direta no vault
  const envKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
  if (envKey) {
    const google = createGoogleGenerativeAI({ apiKey: envKey });
    return { model: google(DEFAULT_MODEL), providerName: "gemini", modelId: DEFAULT_MODEL };
  }

  throw new Error("Nenhuma chave de IA configurada para a Lua");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const messages = body?.messages;
    const availableCategories: string[] = Array.isArray(body?.categories) ? body.categories : [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ has_intent: false, category: null });
    }

    const conversationText = messages
      .slice(-10)
      .map((m: any) => `${m.role === "user" ? "Cliente" : "Fotógrafo"}: ${m.content}`)
      .join("\n");

    const categoriesInstruction = availableCategories.length > 0
      ? `As categorias cadastradas neste estúdio de fotografia são: [${availableCategories.join(", ")}].
Se o cliente tiver interesse em alguma delas, retorne EXATAMENTE o nome correspondente dessa lista no campo "category".`
      : `Exemplos de categorias: Gestante, Newborn, Casamento, Ensaio Feminino, Aniversário, Infantil, Família, Corporativo, Formatura.`;

    const system = `Você é a Lua, assistente de inteligência comercial do Lunari Studio para fotógrafos profissionais.
Sua função é analisar as mensagens de uma conversa de WhatsApp entre um cliente potencial e o estúdio de fotografia.
Você deve detectar se o cliente demonstra real intenção comercial de contratação (orçamento, disponibilidade de datas, valores, pacotes de fotos) e identificar a categoria de ensaio pretendida.
${categoriesInstruction}

Responda APENAS com JSON válido sem markdown:
{
  "has_intent": boolean,
  "category": string | null
}`;

    const { model } = await resolveModel();
    const { text } = await generateText({
      model,
      system,
      prompt: `Conversa recente:\n${conversationText}`,
    });

    const parsed = extractJson(text);

    return jsonResponse({
      has_intent: Boolean(parsed?.has_intent),
      category: typeof parsed?.category === "string" ? parsed.category : null,
    });
  } catch (err: any) {
    console.error("[conversas-ai-classify] Erro:", err?.message || err);
    return jsonResponse({ has_intent: false, category: null });
  }
});
