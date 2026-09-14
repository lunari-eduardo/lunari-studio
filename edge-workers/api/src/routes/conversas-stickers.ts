import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { getBucketBinding, getCdnUrl } from '../utils/r2-helpers.js';
import type { Bindings } from '../index.js';

/**
 * Route: GET /api/conversas/stickers
 *
 * Lista as figurinhas salvas pelo usuário.
 */
export async function getConversasStickersRoute(c: Context<{ Bindings: Bindings }>) {
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

    const { data: stickers, error } = await supabaseAdmin
      .from('conversas_stickers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return c.json({ success: true, stickers });
  } catch (err: any) {
    console.error('[conversas-stickers get] error:', err);
    return c.json({ error: 'Erro ao listar figurinhas', detail: err.message }, 500);
  }
}

/**
 * Route: POST /api/conversas/stickers
 *
 * Salva uma figurinha no banco do usuário a partir de uma URL R2 já existente,
 * ou via upload de arquivo de imagem, ou via payload Base64 (fallback).
 */
export async function saveConversasStickersRoute(c: Context<{ Bindings: Bindings }>) {
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

    // Check contentType to decide how to parse
    const contentType = c.req.header('Content-Type') || '';
    let mediaUrl = '';
    let title = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.parseBody();
      const file = formData['file'] as File;
      if (!file) {
        return c.json({ error: 'Arquivo é necessário para upload via multipart.' }, 400);
      }
      
      title = formData['title'] as string || file.name;

      // Validação MIME Type (apenas webp ou png ou gif)
      if (!file.type.startsWith('image/')) {
         return c.json({ error: 'Apenas arquivos de imagem são permitidos.' }, 400);
      }
      // Limite 1MB
      if (file.size > 1024 * 1024 * 1) {
         return c.json({ error: 'A imagem deve ter no máximo 1MB.' }, 400);
      }

      const { bucket, bucketName } = getBucketBinding(c.env, 'conversas/');
      if (!bucket) {
        return c.json({ error: 'Storage bucket not configured' }, 500);
      }

      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const ext = file.name.split('.').pop() || 'webp';
      const filename = `${crypto.randomUUID()}.${ext}`;
      
      const storagePath = `conversas/${userId}/stickers/${year}/${month}/${filename}`;
      const arrayBuffer = await file.arrayBuffer();

      await bucket.put(storagePath, arrayBuffer, {
        httpMetadata: { contentType: file.type },
      });

      mediaUrl = getCdnUrl(c.env, storagePath, bucketName);

    } else if (contentType.includes('application/json')) {
      // payload contendo media_url
      const body = await c.req.json();
      if (!body.media_url) {
        return c.json({ error: 'media_url is required when JSON body is used' }, 400);
      }
      mediaUrl = body.media_url;
      title = body.title || 'Sticker';
    } else {
       return c.json({ error: 'Unsupported Content-Type' }, 400);
    }

    const { data: sticker, error } = await supabaseAdmin
      .from('conversas_stickers')
      .insert({
        user_id: userId,
        media_url: mediaUrl,
        title: title,
        is_favorite: true
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return c.json({ success: true, sticker });
  } catch (err: any) {
    console.error('[conversas-stickers save] error:', err);
    return c.json({ error: 'Erro ao salvar figurinha', detail: err.message }, 500);
  }
}

/**
 * Route: DELETE /api/conversas/stickers/:id
 *
 * Remove uma figurinha salva.
 */
export async function deleteConversasStickersRoute(c: Context<{ Bindings: Bindings }>) {
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
    const stickerId = c.req.param('id');

    const { error } = await supabaseAdmin
      .from('conversas_stickers')
      .delete()
      .match({ id: stickerId, user_id: userId });

    if (error) {
      throw error;
    }

    return c.json({ success: true });
  } catch (err: any) {
    console.error('[conversas-stickers delete] error:', err);
    return c.json({ error: 'Erro ao remover figurinha', detail: err.message }, 500);
  }
}

/**
 * Route: POST /api/conversas/stickers/proxy-send
 * 
 * Proxy de Envio (Fase 3 do plano)
 * Baixa figurinha do Giphy/url, joga no R2 e devolve a CDN url confiável.
 */
export async function proxyConversasStickersRoute(c: Context<{ Bindings: Bindings }>) {
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

    const body = await c.req.json();
    const sourceUrl = body.url;
    if (!sourceUrl) {
      return c.json({ error: 'Missing source url' }, 400);
    }

    const { bucket, bucketName } = getBucketBinding(c.env, 'conversas/');
    if (!bucket) {
      return c.json({ error: 'Storage bucket not configured' }, 500);
    }

    const resp = await fetch(sourceUrl);
    if (!resp.ok) {
      throw new Error('Failed to fetch from source url');
    }
    const arrayBuffer = await resp.arrayBuffer();
    const contentType = resp.headers.get('content-type') || 'image/webp';

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Attempt to guess extension from content type or URL
    let ext = 'webp';
    if (contentType.includes('gif')) ext = 'gif';
    else if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('jpeg')) ext = 'jpg';

    const filename = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `conversas/${userId}/stickers_proxy/${year}/${month}/${filename}`;

    await bucket.put(storagePath, arrayBuffer, {
      httpMetadata: { contentType },
    });

    const cdnUrl = getCdnUrl(c.env, storagePath, bucketName);

    return c.json({ success: true, url: cdnUrl });

  } catch (err: any) {
    console.error('[conversas-stickers proxy] error:', err);
    return c.json({ error: 'Erro no proxy de figurinha', detail: err.message }, 500);
  }
}
