import { Context } from "hono";
import { generateText } from "ai";
import { resolveAiProvider } from "../utils/ai-provider-resolver";
import { requireUserAuth } from "../utils/auth";

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}

export async function luaGenerateReplyRoute(c: Context) {
  const startedAt = Date.now();
  let auditPayload: any = { status: "pending", latency_ms: 0 };
  
  const auth = await requireUserAuth(c as any);
  if (!auth.ok) return (auth as any).response;
  const { userId, supabaseAdmin: supabaseService } = auth as any;

  try {
    const body = await c.req.json().catch(() => ({}));
    if (!body.prompt || typeof body.prompt !== "string") {
      return c.json({ error: "prompt is required" }, 400);
    }

    auditPayload.user_id = userId;
    auditPayload.chat_id = body.chat_id || null;

    // --- 1. Resolver Provedor de IA ---
    const aiConfig = await resolveAiProvider(c.env, c.req.raw);
    auditPayload.model = `${aiConfig.providerName}:${aiConfig.modelId}`;

    // --- 2. Montar contexto: DNA + Conhecimento + Templates ---
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
    auditPayload.dna_version = dnaVersion;

    const contextParts: string[] = [];
    contextParts.push(
      `Você é a Lua, assistente de atendimento do estúdio de fotografia. Seu papel é redigir um RASCUNHO de resposta para o fotógrafo enviar ao cliente.`,
      `REGRAS INVIOLÁVEIS:`,
      `- Você gera APENAS o texto da resposta. Sem saudações ao fotógrafo, sem explicações.`,
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
    auditPayload.context_hash = simpleHash(systemPrompt);

    // --- 3. Montar mensagens ---
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (body.recent_messages && body.recent_messages.length > 0) {
      for (const msg of body.recent_messages.slice(-10)) {
        messages.push({
          role: msg.direction === "outbound" ? "assistant" : "user",
          content: msg.content,
        });
      }
    }
    messages.push({ role: "user", content: body.prompt });

    // --- 4. Gerar resposta via provider principal ---
    let reply = "";
    let usage = null;
    try {
      const result = await generateText({
        model: aiConfig.model,
        system: systemPrompt,
        messages,
        temperature: 0.4,
      });
      reply = result.text?.trim() || "";
      usage = result.usage;
    } catch (err: any) {
      console.warn(`[lua-generate-reply] Provedor principal (${aiConfig.providerName}) falhou. Tentando fallback Llama 3.`);
      if (c.env.AI) {
        const cfMessages = [
          { role: 'system', content: systemPrompt },
          ...messages
        ];
        const response = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', { messages: cfMessages });
        if (typeof response === 'string') reply = response.trim();
        else if (response && 'response' in response) reply = (response as any).response.trim();
        auditPayload.model = 'cloudflare:llama-3-8b-instruct (fallback)';
      } else {
        throw err;
      }
    }

    const durationMs = Date.now() - startedAt;
    auditPayload.output_hash = simpleHash(reply);
    auditPayload.latency_ms = durationMs;
    auditPayload.tokens_usage = usage;
    auditPayload.status = "success";

    c.executionCtx.waitUntil(
      Promise.resolve(supabaseService.from("lua_generation_audit").insert(auditPayload).then(() => {}))
    );

    return c.json({ reply, dna_version: dnaVersion });

  } catch (error: any) {
    const durationMs = Date.now() - startedAt;
    auditPayload.latency_ms = durationMs;
    auditPayload.status = "error";
    auditPayload.context_hash = (error.message || String(error)).slice(0, 100);

    c.executionCtx.waitUntil(
      Promise.resolve(supabaseService.from("lua_generation_audit").insert(auditPayload).then(() => {}))
    );

    return c.json({ error: error.message }, 500);
  }
}
