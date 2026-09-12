/**
 * Route: POST /api/conversas/media-upload
 *
 * Upload de mídia para o bucket R2 LUNARI_CONVERSAS.
 *
 * Fluxo:
 *  1. Autenticar usuário (Bearer JWT)
 *  2. Ler contexto 'conversas-media' da request (FormData)
 *  3. Persistir no R2 com caminho: conversas/{user_id}/{chat_id}/{year}/{month}/{msg_id}_{filename}
 *  4. Retornar CDN URL (privado — requer signed URL para acesso)
 *
 * Stub — implementação completa na Fase 10.
 */
import { Context } from 'hono';

export async function conversasMediaUploadRoute(c: Context) {
  // TODO[Fase10]: requireUserAuth (Bearer JWT)
  // TODO[Fase10]: parse FormData (file, chat_id)
  // TODO[Fase10]: persistir em R2 LUNARI_CONVERSAS
  // TODO[Fase10]: retornar CDN URL + signed URL

  const body = await c.req.json().catch(() => null);
  console.log('[conversas-media-upload] body (stub):', JSON.stringify(body));

  return c.json({ success: true, stub: true }, 200);
}
