import { Context } from "hono";
import { createClient } from "@supabase/supabase-js";
import {
  convertToCoreMessages,
  jsonSchema,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { resolveAiProvider } from "../../utils/ai-provider-resolver";
import { DEFAULT_ASSISTANT_SYSTEM_PROMPT } from "../../utils/ai-constants";
import { requireUserAuth } from "../../utils/auth";
import { assertAssistantAccess } from "../../utils/assistant-guard";
import {
  getLovableAiGatewayResponseHeaders,
  withLovableAiGatewayRunIdHeader,
} from "../../utils/ai-gateway";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ClientToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  needsApproval?: boolean;
  kind?: "query" | "command";
}

interface ChatRequestBody {
  messages: UIMessage[];
  system?: string;
  tools?: ClientToolDeclaration[];
  model?: string;
  page?: string;
}

function sanitizeJsonSchemaForGemini(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(sanitizeJsonSchemaForGemini);

  const result: Record<string, any> = { ...schema };
  if (result.type === "array" && !result.items) {
    result.items = { type: "string" };
  }
  if (result.properties && typeof result.properties === "object") {
    const props: Record<string, any> = {};
    for (const [key, val] of Object.entries(result.properties)) {
      props[key] = sanitizeJsonSchemaForGemini(val);
    }
    result.properties = props;
  }
  if (result.items && typeof result.items === "object") {
    result.items = sanitizeJsonSchemaForGemini(result.items);
  }
  return result;
}

function buildToolDescription(decl: ClientToolDeclaration): string {
  const parts: string[] = [decl.description ?? ""];
  if (decl.kind === "command") parts.push("[COMMAND — modifica dados]");
  if (decl.kind === "query") parts.push("[QUERY — apenas leitura]");
  if (decl.needsApproval) {
    parts.push(
      "[APPROVAL — peça confirmação humana explícita ANTES de chamar; se o usuário não confirmar, não execute].",
    );
  }
  return parts.filter(Boolean).join(" ");
}

async function logInvocation(
  db: any,
  entry: {
    userId: string | null;
    page?: string | null;
    model: string;
    provider: string;
    toolCount: number;
    status: "ok" | "error";
    error?: string;
    finishReason?: string;
    usage?: unknown;
    durationMs: number;
  },
) {
  try {
    const { error: auditError } = await db.from("assistant_invocations").insert({
      user_id: entry.userId,
      capability_id: "assistant.chat.turn",
      module: "assistant",
      kind: "query",
      actor: "assistant",
      output_status: entry.status,
      error_message: entry.error ?? null,
      latency_ms: Math.round(entry.durationMs),
      surface: "chat",
      auth_source: "supabase",
      tool_name: `${entry.provider}:${entry.model} (${entry.toolCount} tools${
        entry.finishReason ? `, ${entry.finishReason}` : ""
      })`,
    });
    if (auditError) {
      console.error("[assistant-chat] ✗ auditoria rejeitada:", auditError.message ?? auditError);
    }
  } catch (e) {
    console.error("[assistant-chat] falha ao auditar invocação:", e);
  }
}

export async function assistantChatRoute(c: Context) {
  const startedAt = Date.now();
  
  const auth = await requireUserAuth(c as any);
  if (!auth.ok) return (auth as any).response;
  
  const { userId, supabaseAdmin: supabaseService, supabase } = auth as any;
  
  const deniedResponse = await assertAssistantAccess(supabase, userId, corsHeaders);
  if (deniedResponse) {
    return deniedResponse;
  }

  let body: ChatRequestBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return c.json({ error: "messages: array required" }, 400);
  }

  try {
    // --- Resolver Provider e Gateway ---
    const aiConfig = await resolveAiProvider(c.env, c.req.raw);

    const tools: Record<string, any> = {};
    for (const decl of body.tools ?? []) {
      if (!decl?.name) continue;
      const rawParams =
        decl.parameters && typeof decl.parameters === "object"
          ? decl.parameters
          : { type: "object", properties: {} };
      const sanitizedParams = sanitizeJsonSchemaForGemini(rawParams);
      tools[decl.name] = {
        description: buildToolDescription(decl),
        inputSchema: jsonSchema(sanitizedParams as any),
      };
    }

    const systemPrompt = [DEFAULT_ASSISTANT_SYSTEM_PROMPT, body.system?.trim()].filter(Boolean).join("\n\n");

    let coreMessages = convertToCoreMessages(body.messages);

    if (coreMessages.length > 10) {
      let start = coreMessages.length - 10;
      while (start > 0 && coreMessages[start].role !== "user") start--;
      coreMessages = coreMessages.slice(start);
    }
    
    let toolResultCount = 0;
    for (let i = coreMessages.length - 1; i >= 0; i--) {
      const msg = coreMessages[i];
      if (msg.role === "tool" && Array.isArray(msg.content)) {
        toolResultCount++;
        if (toolResultCount > 2) {
          msg.content = msg.content.map((part: any) => {
            if (part.type === "tool-result") {
              return {
                ...part,
                result: { _truncated: "Resultados antigos omitidos para economia de tokens" },
              };
            }
            return part;
          });
        }
      }
    }

    const result = streamText({
      model: aiConfig.model,
      system: systemPrompt,
      messages: coreMessages,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      temperature: 0.2,
      stopWhen: stepCountIs(8),
      providerOptions: {
        lovable: {
          metadata: { userId, page: body.page ?? null, source: "assistant-chat" },
        },
      },
      onError({ error }) {
        const m = error instanceof Error ? error.message : String(error);
        console.error("[assistant-chat] ✗ Erro no stream:", m);
        c.executionCtx.waitUntil(
          logInvocation(supabaseService, {
            userId,
            page: body.page ?? null,
            model: aiConfig.modelId,
            provider: aiConfig.providerName,
            toolCount: Object.keys(tools).length,
            status: "error",
            error: m,
            durationMs: Date.now() - startedAt,
          })
        );
      },
      onFinish({ finishReason, usage }) {
        c.executionCtx.waitUntil(
          logInvocation(supabaseService, {
            userId,
            page: body.page ?? null,
            model: aiConfig.modelId,
            provider: aiConfig.providerName,
            toolCount: Object.keys(tools).length,
            status: "ok",
            finishReason,
            usage,
            durationMs: Date.now() - startedAt,
          })
        );
      },
    });

    const streamResponse = result.toUIMessageStreamResponse({
      headers: getLovableAiGatewayResponseHeaders(undefined, {
        ...corsHeaders,
        ...(aiConfig.gateway ? { "X-Lovable-AIG-Run-ID": aiConfig.gateway.getRunId?.() } : {}),
      }),
    });

    if (aiConfig.gateway) {
      return withLovableAiGatewayRunIdHeader(streamResponse, aiConfig.gateway, corsHeaders);
    }
    
    return streamResponse;
  } catch (err: any) {
    console.error("[assistant-chat] Falha:", err.message);
    const status = err.status || err.statusCode || 500;
    return c.json({ error: err.message }, status);
  }
}
