import { createClient } from "@supabase/supabase-js";
import { decryptAiToken } from "./ai-crypto";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenAI } from "@ai-sdk/openai";
import { createLovableAiGatewayProvider } from "./ai-gateway";

export interface AiProviderConfig {
  providerName: string;
  modelId: string;
  model: any;
  apiKey: string;
  gateway?: any;
}

const DEFAULT_MODEL = "gemini-2.5-flash";

export async function resolveAiProvider(env: any, req?: Request): Promise<AiProviderConfig> {
  const supabaseService = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const [{ data: provRow }, { data: modRow }] = await Promise.all([
    supabaseService.from("app_settings").select("value").eq("key", "assistant_ai_provider").maybeSingle(),
    supabaseService.from("app_settings").select("value").eq("key", "assistant_ai_model").maybeSingle(),
  ]);

  const providerName = typeof provRow?.value === "string" ? provRow.value : "gemini";
  const modelId = typeof modRow?.value === "string" ? modRow.value : DEFAULT_MODEL;

  const { data: keyRow } = await supabaseService
    .from("assistant_provider_keys")
    .select("api_key")
    .eq("provider_name", providerName)
    .maybeSingle();

  let apiKey = "";
  if (keyRow?.api_key) {
    const fallbackSource =
      env.GATEWAY_ENCRYPTION_KEY ||
      env.SUPABASE_SERVICE_ROLE_KEY ||
      "lunari-studio-fallback-gateway-key-2026";
      
    apiKey = await decryptAiToken(keyRow.api_key, fallbackSource);
  }

  let model: any;
  let gateway: any = undefined;

  if (providerName === "gemini") {
    if (!apiKey) throw new Error("Gemini API key not configured in vault");
    const google = createGoogleGenerativeAI({ apiKey });
    model = google(modelId);
  } else if (providerName === "deepseek") {
    if (!apiKey) throw new Error("DeepSeek API key not configured in vault");
    const dsProvider = createOpenAICompatible({
      name: "deepseek",
      baseURL: "https://api.deepseek.com/beta",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    model = dsProvider(modelId);
  } else if (providerName === "openai") {
    if (!apiKey) throw new Error("OpenAI API key not configured in vault");
    const openai = createOpenAI({ apiKey });
    model = openai(modelId);
  } else if (providerName === "lovable" || !apiKey) {
    // fallback to lovable
    const lovableKey = apiKey || env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("Lovable API key not configured");
    let initialRunId = undefined;
    if (req) {
      initialRunId = req.headers.get("X-Lovable-AIG-Run-ID")?.trim() || undefined;
    }
    gateway = createLovableAiGatewayProvider(lovableKey, initialRunId);
    model = gateway(modelId);
  } else {
    // Fallback genérico para OpenAI-compatible API
    const fallbackProvider = createOpenAICompatible({
      name: providerName,
      baseURL: "https://api.openai.com/v1",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    model = fallbackProvider(modelId);
  }

  return { providerName, modelId, model, apiKey, gateway };
}
