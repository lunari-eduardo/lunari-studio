/**
 * Route: POST /api/conversas/send-message
 *
 * Envia uma mensagem via Evolution API.
 *
 * Fluxo:
 *  1. Autenticar usuário (Bearer JWT)
 *  2. Obter instance_id + token da tabela conversas_instancias (Service Role)
 *  3. POST para Evolution API /message/sendText
 *  4. Inserir mensagem no banco com status='pending'
 *  5. Retornar mensagem inserida para optimistic UI
 *
 * Stub — implementação completa na Fase 4.
 */
import { Context } from 'hono';

export async function conversasSendMessageRoute(c: Context) {
  // TODO[Fase4]: requireUserAuth (Bearer JWT)
  // TODO[Fase4]: ler conversas_instancias via Service Role
  // TODO[Fase4]: POST para Evolution API
  // TODO[Fase4]: INSERT conversas_mensagens status='pending'
  // TODO[Fase4]: Disparar realtime broadcast

  const body = await c.req.json().catch(() => null);
  console.log('[conversas-send-message] body (stub):', JSON.stringify(body));

  return c.json({ success: true, stub: true }, 200);
}
