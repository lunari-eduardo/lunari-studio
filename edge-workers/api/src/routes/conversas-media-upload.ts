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
import { createClient } from '@supabase/supabase-js';
import { getBucketBinding, getCdnUrl } from '../utils/r2-helpers.js';
import type { Bindings } from '../index.js';

export async function conversasMediaUploadRoute(c: Context<{ Bindings: Bindings }>) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Missing Authorization header' }, 401);

    const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !userData?.user) {
      return c.json({ error: 'Unauthorized: invalid token' }, 401);
    }
    const userId = userData.user.id;

    // Parse FormData
    const formData = await c.req.parseBody();
    const file = formData['file'] as File;
    const chatId = formData['chatId'] as string;

    if (!file || !chatId) {
      return c.json({ error: 'File and chatId are required' }, 400);
    }

    const { bucket, bucketName } = getBucketBinding(c.env, 'conversas/');
    if (!bucket) {
      return c.json({ error: 'Storage bucket not configured' }, 500);
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${crypto.randomUUID()}.${ext}`;
    
    const storagePath = `conversas/${userId}/${chatId}/${year}/${month}/${filename}`;

    const arrayBuffer = await file.arrayBuffer();

    await bucket.put(storagePath, arrayBuffer, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    });

    const cdnUrl = getCdnUrl(c.env, storagePath, bucketName);

    return c.json({
      success: true,
      mediaUrl: cdnUrl,
      mediaMimeType: file.type || 'application/octet-stream',
      mediaFilename: file.name,
      mediaSizeBytes: file.size
    });
  } catch (err: any) {
    console.error('[conversas-media-upload] error:', err);
    return c.json({ error: 'Erro no upload de mídia', detail: err.message }, 500);
  }
}
