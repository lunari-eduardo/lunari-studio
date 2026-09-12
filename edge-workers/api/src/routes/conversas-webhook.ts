/**
 * Route: POST /api/conversas/webhook
 *
 * Recebe webhooks da Evolution API (eventos de mensagens).
 *
 * Responsabilidades:
 *  1. Validar X-Webhook-Secret (HMAC-SHA256)
 *  2. Persistir mensagem no Supabase via Service Role (idempotente)
 *  3. Responder 200 em <500ms
 *  4. Dispara ctx.waitUntil() para processamento assíncrono (mídia, signals)
 *
 * Stub — implementação completa na Fase 3.
 */
import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';

export async function conversasWebhookRoute(c: Context) {
  // TODO[Fase3]: validar X-Webhook-Secret (HMAC-SHA256)
  // TODO[Fase3]: parse EvolutionWebhookPayload
  // TODO[Fase3]: INSERT into conversas_mensagens via Service Role
  // TODO[Fase3]: ctx.waitUntil() para upload de mídia R2

  const body = await c.req.json().catch(() => null);
  console.log('[conversas-webhook] payload recebido (stub):', JSON.stringify(body));

  return c.json({ received: true, stub: true }, 200);
}
