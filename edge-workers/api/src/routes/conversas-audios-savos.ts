import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { getBucketBinding, getCdnUrl } from '../utils/r2-helpers.js';
import type { Bindings } from '../index.js';

const MAX_DURATION = 600; // 10 min
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const STORAGE_FOLDER = 'audios_salvos';

/**
 * Route: GET /api/conversas/audios_salvos
 */
export async function getAudiosSalvosRoute(c: Context<{ Bindings: Bindings }>) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Missing Authorization' }, 401);

    const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '').trim(),
    );
    if (authError || !userData?.user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: audios, error } = await supabaseAdmin
      .from('conversas_audios_salvos')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return c.json({ success: true, audios });
  } catch (err: any) {
    console.error('[audios_salvos list] error:', err);
    return c.json({ error: 'Erro ao listar áudios', detail: err.message }, 500);
  }
}

/**
 * Route: POST /api/conversas/audios_salvos
 *
 * Body (multipart):
 *   file: File (audio/*)
 *   nome?: string
 *   duration: number (segundos)
 */
export async function saveAudiosSalvosRoute(c: Context<{ Bindings: Bindings }>) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Missing Authorization' }, 401);

    const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '').trim(),
    );
    if (authError || !userData?.user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const userId = userData.user.id;

    const formData = await c.req.parseBody();
    const file = formData['file'] as File;
    if (!file) return c.json({ error: 'Arquivo de áudio obrigatório' }, 400);

    if (!file.type.startsWith('audio/')) {
      return c.json({ error: 'Apenas arquivos de áudio são permitidos' }, 400);
    }
    if (file.size > MAX_SIZE) {
      return c.json({ error: 'O áudio deve ter no máximo 10 MB' }, 400);
    }

    const duration = parseInt(String(formData['duration'] ?? '0'), 10);
    if (!duration || duration <= 0 || duration > MAX_DURATION) {
      return c.json({ error: `Duração inválida (máx: ${MAX_DURATION}s)` }, 400);
    }

    const nome = String(formData['nome'] ?? `Áudio ${new Date().toLocaleString('pt-BR')}`);

    // Upload para R2
    const { bucket, bucketName } = getBucketBinding(c.env, 'conversas/');
    if (!bucket) return c.json({ error: 'Storage bucket não configurado' }, 500);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'webm';
    const filename = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `conversas/${userId}/${STORAGE_FOLDER}/${filename}`;
    const arrayBuffer = await file.arrayBuffer();

    await bucket.put(storagePath, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    const mediaUrl = getCdnUrl(c.env, storagePath, bucketName);

    const { data: audio, error: insertError } = await supabaseAdmin
      .from('conversas_audios_salvos')
      .insert({
        user_id: userId,
        nome,
        duration,
        file_size: file.size,
        media_url: mediaUrl,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return c.json({ success: true, audio });
  } catch (err: any) {
    console.error('[audios_salvos save] error:', err);
    return c.json({ error: 'Erro ao salvar áudio', detail: err.message }, 500);
  }
}

/**
 * Route: PATCH /api/conversas/audios_salvos/:id
 *
 * Atualiza o nome de um áudio salvo.
 */
export async function patchAudiosSalvosRoute(c: Context<{ Bindings: Bindings }>) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Missing Authorization' }, 401);

    const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '').trim(),
    );
    if (authError || !userData?.user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const userId = userData.user.id;
    const audioId = c.req.param('id');

    const body = await c.req.json();
    const nome = body.nome;
    if (!nome || typeof nome !== 'string' || nome.trim().length === 0) {
      return c.json({ error: 'nome é obrigatório' }, 400);
    }

    const { data: audio, error } = await supabaseAdmin
      .from('conversas_audios_salvos')
      .update({ nome: nome.trim(), updated_at: new Date().toISOString() })
      .eq('id', audioId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!audio) return c.json({ error: 'Áudio não encontrado' }, 404);

    return c.json({ success: true, audio });
  } catch (err: any) {
    console.error('[audios_salvos patch] error:', err);
    return c.json({ error: 'Erro ao atualizar áudio', detail: err.message }, 500);
  }
}

/**
 * Route: DELETE /api/conversas/audios_salvos/:id
 *
 * Remove áudio do banco E do R2.
 */
export async function deleteAudiosSalvosRoute(c: Context<{ Bindings: Bindings }>) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Missing Authorization' }, 401);

    const supabaseAdmin = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '').trim(),
    );
    if (authError || !userData?.user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const userId = userData.user.id;
    const audioId = c.req.param('id');

    // Buscar para obter storage_path
    const { data: audio, error: fetchError } = await supabaseAdmin
      .from('conversas_audios_salvos')
      .select('storage_path')
      .eq('id', audioId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!audio) return c.json({ error: 'Áudio não encontrado' }, 404);

    // Deletar do R2
    const { bucket } = getBucketBinding(c.env, 'conversas/');
    if (bucket && audio.storage_path) {
      try {
        await bucket.delete(audio.storage_path);
      } catch (r2err) {
        // Não falhar se R2 delete falhar — o banco é fonte da verdade
        console.warn('[audios_salvos delete] R2 delete failed:', r2err);
      }
    }

    const { error } = await supabaseAdmin
      .from('conversas_audios_salvos')
      .delete()
      .eq('id', audioId)
      .eq('user_id', userId);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err: any) {
    console.error('[audios_salvos delete] error:', err);
    return c.json({ error: 'Erro ao excluir áudio', detail: err.message }, 500);
  }
}
