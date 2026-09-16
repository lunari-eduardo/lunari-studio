/**
 * Cloudflare Worker: Gallery Upload, Serve & Download
 * Custom Domain: cdn.lunarihub.com
 * Worker Name: gallery-upload
 *
 * Routes:
 * - POST /upload-original       - Upload high-res original photo to R2 (for downloads)
 * - POST /upload-cover          - Upload watermark-free cover variant
 * - POST /upload                - Upload preview to R2 (legacy/direct route)
 * - POST /upload-watermark      - Upload user watermark PNG
 * - GET  /download/{path}       - Download for Select and Deliver galleries
 * - GET  /deliver-download/{path} - Download for Deliver/Transfer galleries
 * - GET  /image/{path}          - Serve image/video from R2 (with video range streaming)
 * - GET  /health                - Health check
 */

export interface Env {
  GALLERY_BUCKET: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

/**
 * Validate Supabase JWT token.
 * Calls Supabase Auth API (/auth/v1/user) directly for maximum reliability,
 * supporting HS256, RS256, and ES256 tokens uniformly.
 */
async function validateAuth(
  request: Request,
  env: Env
): Promise<{ userId: string; email: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (!res.ok) {
      console.warn(`Auth validation failed: HTTP ${res.status}`);
      return null;
    }

    const user = (await res.json()) as { id?: string; email?: string };
    if (!user?.id) return null;

    return { userId: user.id, email: user.email || '' };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Handle original file upload to R2 (for download).
 * Stores in originals/{galleryId}/{timestamp}-{randomId}.{ext}.
 * Returns the storageKey to be referenced in galeria_fotos.original_path.
 */
async function handleUploadOriginal(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await validateAuth(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const galleryId = formData.get('galleryId') as string;
    const originalFilename = formData.get('originalFilename') as string;

    if (!file || !galleryId) {
      return new Response(
        JSON.stringify({ error: 'file e galleryId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify gallery belongs to user via Supabase
    const galleryCheckRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/galerias?id=eq.${galleryId}&user_id=eq.${user.userId}&select=id`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const galleryCheck = (await galleryCheckRes.json()) as unknown[];
    if (!galleryCheck || galleryCheck.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Galeria não encontrada ou sem permissão' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${timestamp}-${randomId}.${extension}`;
    const storagePath = `originals/${galleryId}/${filename}`;

    const fileBuffer = await file.arrayBuffer();

    await env.GALLERY_BUCKET.put(storagePath, fileBuffer, {
      httpMetadata: { contentType: file.type || 'image/jpeg' },
      customMetadata: {
        originalFilename: originalFilename || file.name,
        uploadedAt: new Date().toISOString(),
        userId: user.userId,
        galleryId,
      },
    });

    console.log(`Original uploaded to R2: ${storagePath} (${fileBuffer.byteLength} bytes)`);

    return new Response(
      JSON.stringify({
        success: true,
        photo: {
          storageKey: storagePath,
          filename,
          originalFilename: originalFilename || file.name,
          fileSize: fileBuffer.byteLength,
          mimeType: file.type || 'image/jpeg',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload original error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro no upload do original' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle cover image upload (watermark-free, for gallery cover variants).
 * Stores in covers/{galleryId}/{photoId}.jpg and updates galeria_fotos.cover_path.
 */
async function handleUploadCover(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await validateAuth(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const galleryId = formData.get('galleryId') as string;
    const photoId = formData.get('photoId') as string;

    if (!file || !galleryId || !photoId) {
      return new Response(
        JSON.stringify({ error: 'file, galleryId e photoId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const coverPath = `covers/${galleryId}/${photoId}.jpg`;
    const fileBuffer = await file.arrayBuffer();

    await env.GALLERY_BUCKET.put(coverPath, fileBuffer, {
      httpMetadata: { contentType: 'image/jpeg' },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        userId: user.userId,
        type: 'cover',
      },
    });

    // Update photo record with cover_path in Supabase
    const updateRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/galeria_fotos?id=eq.${photoId}&galeria_id=eq.${galleryId}&user_id=eq.${user.userId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ cover_path: coverPath }),
      }
    );

    if (!updateRes.ok) {
      console.warn('Cover DB update warning:', await updateRes.text());
    }

    console.log(`Cover uploaded: ${coverPath} (${fileBuffer.byteLength} bytes)`);

    return new Response(
      JSON.stringify({ success: true, coverPath }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cover upload error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro no upload da cover' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle compressed preview upload (legacy direct route).
 */
async function handleUpload(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await validateAuth(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const galleryId = formData.get('galleryId') as string;
    const originalFilename = formData.get('originalFilename') as string;
    const width = parseInt(formData.get('width') as string) || 0;
    const height = parseInt(formData.get('height') as string) || 0;
    const originalFileSizeRaw = formData.get('originalFileSize') as string | null;
    const originalFileSize = originalFileSizeRaw ? parseInt(originalFileSizeRaw, 10) : null;

    if (!file || !galleryId) {
      return new Response(
        JSON.stringify({ error: 'file e galleryId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const photoId = crypto.randomUUID();
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${photoId}.${extension}`;
    const storagePath = `galleries/${galleryId}/${filename}`;

    const fileBuffer = await file.arrayBuffer();

    await env.GALLERY_BUCKET.put(storagePath, fileBuffer, {
      httpMetadata: { contentType: file.type || 'image/jpeg' },
      customMetadata: {
        originalFilename,
        uploadedAt: new Date().toISOString(),
        userId: user.userId,
        galleryId,
      },
    });

    const photoRecord = {
      galeria_id: galleryId,
      user_id: user.userId,
      filename,
      original_filename: originalFilename,
      storage_key: storagePath,
      original_path: storagePath,
      preview_path: storagePath,
      thumb_path: storagePath,
      file_size: fileBuffer.byteLength,
      original_file_size: originalFileSize,
      mime_type: file.type || 'image/jpeg',
      width,
      height,
      has_watermark: false,
      processing_status: 'ready',
    };

    const dbResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/galeria_fotos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: 'return=representation',
        },
        body: JSON.stringify(photoRecord),
      }
    );

    if (!dbResponse.ok) {
      const dbError = await dbResponse.text();
      console.error('DB insert failed:', dbError);
      await env.GALLERY_BUCKET.delete(storagePath);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar no banco de dados' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [savedPhoto] = (await dbResponse.json()) as Array<{ id: string }>;

    return new Response(
      JSON.stringify({
        success: true,
        photo: {
          id: savedPhoto.id,
          filename,
          originalFilename,
          storageKey: storagePath,
          originalPath: storagePath,
          previewPath: storagePath,
          thumbPath: storagePath,
          fileSize: fileBuffer.byteLength,
          mimeType: file.type || 'image/jpeg',
          width,
          height,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro no upload' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle watermark PNG upload.
 */
async function handleWatermarkUpload(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await validateAuth(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Arquivo obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!file.type.includes('png')) {
      return new Response(
        JSON.stringify({ error: 'Apenas arquivos PNG são permitidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Arquivo muito grande (máximo 2MB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const watermarkPath = `user-assets/${user.userId}/watermark.png`;
    const fileBuffer = await file.arrayBuffer();

    await env.GALLERY_BUCKET.put(watermarkPath, fileBuffer, {
      httpMetadata: { contentType: 'image/png' },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        userId: user.userId,
      },
    });

    return new Response(
      JSON.stringify({ success: true, path: watermarkPath, size: fileBuffer.byteLength }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Watermark upload error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro no upload da watermark' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle image and video serving from R2 with Range request support (video scrubbing).
 */
async function handleServe(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  try {
    const rangeHeader = request.headers.get('Range');
    const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(path);

    if (rangeHeader && isVideo) {
      const object = await env.GALLERY_BUCKET.get(path, { range: request.headers });

      if (!object) {
        return new Response('Not found', { status: 404, headers: corsHeaders });
      }

      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', object.httpMetadata?.contentType || 'video/mp4');
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Cache-Control', 'public, max-age=86400');
      headers.set('ETag', object.etag);

      if ('range' in object && object.range) {
        const range = object.range as { offset: number; length: number };
        const end = range.offset + range.length - 1;
        headers.set('Content-Range', `bytes ${range.offset}-${end}/${object.size}`);
        headers.set('Content-Length', range.length.toString());
        return new Response(object.body, { status: 206, headers });
      }

      if (object.size) headers.set('Content-Length', object.size.toString());
      return new Response(object.body, { headers });
    }

    const object = await env.GALLERY_BUCKET.get(path);

    if (!object) {
      return new Response('Not found', { status: 404, headers: corsHeaders });
    }

    const headers = new Headers(corsHeaders);
    const detectedType = object.httpMetadata?.contentType || (isVideo ? 'video/mp4' : 'image/jpeg');
    headers.set('Content-Type', detectedType);
    headers.set('ETag', object.etag);

    if (isVideo) {
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Cache-Control', 'public, max-age=86400');
      if (object.size) headers.set('Content-Length', object.size.toString());
    } else {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch === object.etag) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Serve error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
}

/**
 * Handle file download from R2 for Select and Deliver galleries.
 * Deliver galleries (tipo === 'entrega') are always downloadable.
 * Select galleries require finalized_at + allowDownload: true.
 */
async function handleDownload(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const requestedFilename = url.searchParams.get('filename') || path.split('/').pop() || 'photo.jpg';

    const pathParts = path.split('/');
    if (pathParts.length < 3) {
      return new Response(JSON.stringify({ error: 'Caminho inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const galleryId = pathParts[1];

    // Fetch gallery to verify permissions
    const galleryRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/galerias?id=eq.${galleryId}&select=id,tipo,finalized_at,configuracoes`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const galleries = (await galleryRes.json()) as Array<{
      id: string;
      tipo: string;
      finalized_at: string | null;
      configuracoes: Record<string, unknown> | null;
    }>;

    if (!galleries || galleries.length === 0) {
      return new Response(JSON.stringify({ error: 'Galeria não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gallery = galleries[0];
    const isDeliver = gallery.tipo === 'entrega';

    if (!isDeliver) {
      if (!gallery.finalized_at) {
        return new Response(JSON.stringify({ error: 'Galeria não finalizada' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const config = gallery.configuracoes;
      if (config?.allowDownload !== true) {
        return new Response(JSON.stringify({ error: 'Download não permitido' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Verify photo belongs to gallery (check both original_path and storage_key)
    const photoRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/galeria_fotos?galeria_id=eq.${galleryId}&or=(original_path.eq.${encodeURIComponent(path)},storage_key.eq.${encodeURIComponent(path)})&select=id`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const photos = (await photoRes.json()) as unknown[];

    if (!photos || photos.length === 0) {
      return new Response(JSON.stringify({ error: 'Foto não encontrada na galeria' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return await serveFileAsDownload(env, path, requestedFilename);
  } catch (error) {
    console.error('Download error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Falha no download' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle file download for Deliver galleries directly.
 */
async function handleDeliverDownload(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const requestedFilename = url.searchParams.get('filename') || path.split('/').pop() || 'file';

    const pathParts = path.split('/');
    if (pathParts.length < 3) {
      return new Response(JSON.stringify({ error: 'Caminho inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const galleryId = pathParts[1];

    const photoRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/galeria_fotos?galeria_id=eq.${galleryId}&or=(original_path.eq.${encodeURIComponent(path)},storage_key.eq.${encodeURIComponent(path)})&select=id`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const photos = (await photoRes.json()) as unknown[];

    if (!photos || photos.length === 0) {
      return new Response(JSON.stringify({ error: 'Arquivo não encontrado na galeria' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return await serveFileAsDownload(env, path, requestedFilename);
  } catch (error) {
    console.error('Deliver download error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Falha no download' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Fetch file from R2 and serve with Content-Disposition: attachment.
 */
async function serveFileAsDownload(
  env: Env,
  path: string,
  filename: string
): Promise<Response> {
  const object = await env.GALLERY_BUCKET.get(path);

  if (!object) {
    return new Response(JSON.stringify({ error: 'Arquivo não encontrado no storage' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
  headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  headers.set('Cache-Control', 'private, no-cache');
  if (object.size) {
    headers.set('Content-Length', object.size.toString());
  }

  return new Response(object.body, { headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route: POST /upload-original (high-res original file for download)
    if (request.method === 'POST' && url.pathname === '/upload-original') {
      return handleUploadOriginal(request, env);
    }

    // Route: POST /upload-cover (cover variant without watermark)
    if (request.method === 'POST' && url.pathname === '/upload-cover') {
      return handleUploadCover(request, env);
    }

    // Route: POST /upload (preview upload)
    if (request.method === 'POST' && url.pathname === '/upload') {
      return handleUpload(request, env);
    }

    // Route: POST /upload-watermark
    if (request.method === 'POST' && url.pathname === '/upload-watermark') {
      return handleWatermarkUpload(request, env);
    }

    // Route: GET /deliver-download/{path}
    if (request.method === 'GET' && url.pathname.startsWith('/deliver-download/')) {
      const downloadPath = url.pathname.replace('/deliver-download/', '');
      return handleDeliverDownload(request, env, decodeURIComponent(downloadPath));
    }

    // Route: GET /download/{path}
    if (request.method === 'GET' && url.pathname.startsWith('/download/')) {
      const downloadPath = url.pathname.replace('/download/', '');
      return handleDownload(request, env, decodeURIComponent(downloadPath));
    }

    // Route: GET /image/{path}
    if (request.method === 'GET' && url.pathname.startsWith('/image/')) {
      const imagePath = url.pathname.replace('/image/', '');
      return handleServe(request, env, imagePath);
    }

    // Route: GET /health
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          worker: 'gallery-upload',
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 404 for unknown routes
    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
};
