/**
 * conversas-ai-classify — Classificação inteligente de conversas para a Assistente Lua.
 *
 * Utiliza o mesmo motor da Lua (Google Gemini) configurado no cofre `assistant_provider_keys`
 * e `app_settings` (assistant_ai_provider / assistant_ai_model).
 *
 * POST (JWT obrigatório) body:
 *  {
 *    messages: Array<{ role: "user" | "assistant", content: string }>
 *  }
 *
 * Response: { has_intent: boolean, category: string | null }
 */

import {
  jsonResponse,
  handleCors,
  requireUser,
  completeJson,
} from "../_shared/proposal-ai.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const userId = await requireUser(req);
    if (!userId) return jsonResponse({ error: "Não autenticado" }, 401);

    const body = await req.json().catch(() => ({}));
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse({ has_intent: false, category: null });
    }

    const conversationText = messages
      .slice(-10)
      .map((m: any) => `${m.role === "user" ? "Cliente" : "Fotógrafo"}: ${m.content}`)
      .join("\n");

    const system = `Você é a Lua, assistente de inteligência comercial do Lunari Studio para fotógrafos profissionais.
Sua função é analisar as últimas mensagens de uma conversa de WhatsApp entre um cliente potencial e o estúdio de fotografia.
Você deve detectar se o cliente demonstra real intenção comercial de contratação (orçamento, disponibilidade de datas, valores, pacotes de fotos) e identificar a categoria de ensaio pretendida.`;

    const prompt = `Analise as mensagens abaixo:
${conversationText}

Responda exclusivamente com um JSON contendo:
- "has_intent": boolean (true apenas se o cliente perguntar de preços, datas, pacotes ou demonstrar interesse em fechar/agendar)
- "category": string ou null (a categoria de ensaio fotográfico identificada, ex.: "Gestante", "Newborn", "Casamento", "Ensaio Feminino", "Aniversário", "Infantil", "Família", "Corporativo", "Formatura", "Smash the Cake")

Formato estrito:
{
  "has_intent": boolean,
  "category": string | null
}`;

    const { data } = await completeJson(system, prompt);

    return jsonResponse({
      has_intent: Boolean(data?.has_intent),
      category: typeof data?.category === "string" ? data.category : null,
    });
  } catch (err: any) {
    console.error("[conversas-ai-classify] Erro:", err?.message || err);
    // Fail-safe silencioso: retorna sem intenção em vez de quebrar a tela do fotógrafo
    return jsonResponse({ has_intent: false, category: null });
  }
});
