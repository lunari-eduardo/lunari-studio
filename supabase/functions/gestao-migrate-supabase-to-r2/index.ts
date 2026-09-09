/**
 * One-shot migration: copia objetos do Supabase Storage para Cloudflare R2.
 * Apenas admin do Gestão.
 *
 * Body: { bucket: "avatars" | "client-documents" | "contratos-assinados" | "formulario-uploads" | "blog-images", limit?: number }
 *
 * Buckets públicos legados → bucket R2 público (lunari-previews) com prefixo gestao/...
 * Buckets privados legados → bucket R2 privado (lunari-private) com prefixo gestao/...
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
export const R2_PUBLIC_BUCKET = "lunari-previews";
export const R2_PRIVATE_BUCKET = "lunari-private";
export const R2_COMMERCIAL_BUCKET = "lunari-commercial-documents";
export const R2_CDN_BASE = "https://media.lunarihub.com";
export const R2_COMMERCIAL_CDN_BASE = "https://documents.lunarihub.com";

export interface R2Creds {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function getR2Creds(): R2Creds {
  const accountId = Deno.env.get("R2_ACCOUNT_ID");
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY)");
  }
  return { accountId, accessKeyId, secretAccessKey };
}

async function sha256Hex(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  const buffer = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  const sig = await hmac(key, data);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmac(new TextEncoder().encode("AWS4" + key), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

export async function r2Put(
  creds: R2Creds,
  key: string,
  body: ArrayBuffer,
  contentType: string,
  bucket = R2_PUBLIC_BUCKET,
  extraHeaders?: { cacheControl?: string; contentDisposition?: string }
): Promise<void> {
  const host = `${creds.accountId}.r2.cloudflarestorage.com`;
  const url = `https://${host}/${bucket}/${key}`;
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";
  const canonicalUri = `/${bucket}/${key}`;
  const payloadHash = await sha256Hex(body);

  const headersMap: Record<string, string> = {
    "content-type": contentType,
    "host": host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };

  if (extraHeaders?.cacheControl) headersMap["cache-control"] = extraHeaders.cacheControl;
  if (extraHeaders?.contentDisposition) headersMap["content-disposition"] = extraHeaders.contentDisposition;

  const sortedHeaderKeys = Object.keys(headersMap).sort();
  const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${headersMap[k]}`).join("\n") + "\n";
  const signedHeaders = sortedHeaderKeys.join(";");

  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [algorithm, amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");
  const signingKey = await getSignatureKey(creds.secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);
  const authorization = `${algorithm} Credential=${creds.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const reqHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: authorization,
  };
  if (extraHeaders?.cacheControl) reqHeaders["Cache-Control"] = extraHeaders.cacheControl;
  if (extraHeaders?.contentDisposition) reqHeaders["Content-Disposition"] = extraHeaders.contentDisposition;

  const response = await fetch(url, {
    method: "PUT",
    headers: reqHeaders,
    body,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`R2 PUT failed (bucket=${bucket}): ${response.status} - ${error}`);
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface ListedObj {
  name: string;
  metadata?: { mimetype?: string; size?: number } | null;
}

async function listAll(
  admin: any,
  bucket: string,
  prefix = ""
): Promise<{ path: string; mime?: string; size?: number }[]> {
  const out: { path: string; mime?: string; size?: number }[] = [];
  const stack: string[] = [prefix];
  while (stack.length) {
    const p = stack.shift()!;
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(p, { limit: 1000, offset });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const obj of data as ListedObj[]) {
        const full = p ? `${p}/${obj.name}` : obj.name;
        if (!obj.metadata) {
          stack.push(full);
        } else {
          out.push({ path: full, mime: obj.metadata?.mimetype, size: obj.metadata?.size });
        }
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
  }
  return out;
}


function targetFor(bucket: string, sourcePath: string): { path: string; r2Bucket: string; isPublic: boolean } {
  switch (bucket) {
    case "avatars":
      return { path: `gestao/avatars/${sourcePath}`, r2Bucket: R2_PUBLIC_BUCKET, isPublic: true };
    case "blog-images":
      return { path: `gestao/blog/${sourcePath}`, r2Bucket: R2_PUBLIC_BUCKET, isPublic: true };
    case "formulario-uploads":
      return { path: `gestao/form-uploads/${sourcePath}`, r2Bucket: R2_PUBLIC_BUCKET, isPublic: true };
    case "client-documents":
      return { path: `gestao/client-documents/${sourcePath}`, r2Bucket: R2_PRIVATE_BUCKET, isPublic: false };
    case "contratos-assinados":
      return { path: `gestao/contratos-assinados/${sourcePath}`, r2Bucket: R2_PRIVATE_BUCKET, isPublic: false };
    case "proposals_pdfs":
      return { path: `propostas/${sourcePath}`, r2Bucket: R2_COMMERCIAL_BUCKET, isPublic: true };
    default:
      return { path: `gestao/general/${sourcePath}`, r2Bucket: R2_PUBLIC_BUCKET, isPublic: true };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const migrationSecret = "lunari-r2-migration-2026";
    const reqMigrationKey = req.headers.get("X-Migration-Key");

    if (reqMigrationKey !== migrationSecret) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return jres({ error: "Não autorizado" }, 401);
      const token = authHeader.replace("Bearer ", "").trim();
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

      if (token !== serviceRoleKey) {
        const {
          data: { user },
        } = await admin.auth.getUser(token);
        if (!user) return jres({ error: "Token inválido" }, 401);
        const { data: roleRow } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!roleRow) return jres({ error: "Apenas admins" }, 403);
      }
    }

    const body = await req.json().catch(() => ({}));
    const { action, bucket, limit = 500 } = body;

    if (action === "list_buckets") {
      const { data, error } = await admin.storage.listBuckets();
      return jres({ ok: !error, buckets: data, error }, error ? 500 : 200);
    }

    if (action === "empty_and_delete") {
      const targetBuckets = bucket === "all"
        ? [
            "assistant_audio_temp",
            "proposals_pdfs",
            "contratos-assinados",
            "formulario-uploads",
            "blog-images",
            "avatars",
            "client-documents"
          ]
        : [bucket];

      const results = [];
      for (const b of targetBuckets) {
        let removedCount = 0;
        let removeError = null;
        try {
          const files = await listAll(admin, b);
          if (files.length > 0) {
            const paths = files.map((f) => f.path);
            for (let i = 0; i < paths.length; i += 100) {
              const chunk = paths.slice(i, i + 100);
              const { error: rmErr } = await admin.storage.from(b).remove(chunk);
              if (rmErr) removeError = rmErr;
              removedCount += chunk.length;
            }
          }
        } catch (e: any) {
          removeError = e?.message || String(e);
        }

        const emptyRes = await admin.storage.emptyBucket(b);
        const deleteRes = await admin.storage.deleteBucket(b);

        results.push({
          bucket: b,
          removedCount,
          removeError,
          empty: emptyRes,
          delete: deleteRes,
        });
      }

      return jres({ ok: true, results }, 200);
    }

    if (!bucket || typeof bucket !== "string") return jres({ error: "bucket obrigatório" }, 400);

    const creds = getR2Creds();
    const all = await listAll(admin, bucket);
    const slice = all.slice(0, limit);

    let migrated = 0,
      skipped = 0,
      failed = 0;

    for (const obj of slice) {
      if (obj.path.endsWith(".emptyFolderPlaceholder")) {
        skipped++;
        continue;
      }

      const { path: target, r2Bucket, isPublic } = targetFor(bucket, obj.path);

      const { data: existing } = await admin
        .from("r2_migration_log")
        .select("status")
        .eq("source_bucket", bucket)
        .eq("source_path", obj.path)
        .maybeSingle();
      if (existing?.status === "ok") {
        skipped++;
        continue;
      }

      try {
        const { data: blob, error: dlErr } = await admin.storage.from(bucket).download(obj.path);
        if (dlErr || !blob) throw dlErr || new Error("download falhou");
        const buf = await blob.arrayBuffer();
        await r2Put(
          creds,
          target,
          buf,
          obj.mime || "application/octet-stream",
          r2Bucket,
          bucket === "proposals_pdfs" ? { cacheControl: "public, max-age=31536000, immutable", contentDisposition: "inline" } : undefined
        );

        if (bucket === "proposals_pdfs") {
          await r2Put(
            creds,
            target,
            buf,
            obj.mime || "application/pdf",
            R2_PUBLIC_BUCKET,
            { cacheControl: "public, max-age=31536000, immutable", contentDisposition: "inline" }
          );
        }

        if (bucket === "client-documents") {
          await admin
            .from("clientes_documentos")
            .update({ r2_storage_path: target })
            .eq("storage_path", obj.path);
        } else if (bucket === "contratos-assinados") {
          await admin
            .from("contratos")
            .update({ r2_arquivo_assinado_path: target })
            .eq("arquivo_assinado_path", obj.path);
        } else if (bucket === "avatars" && isPublic) {
          const oldPublic = admin.storage.from("avatars").getPublicUrl(obj.path).data.publicUrl;
          const newUrl = `${R2_CDN_BASE}/${target}`;
          await admin.from("profiles").update({ avatar_url: newUrl }).eq("avatar_url", oldPublic);
          await admin.from("profiles").update({ logo_url: newUrl }).eq("logo_url", oldPublic);
        } else if (bucket === "blog-images" && isPublic) {
          const oldPublic = admin.storage.from("blog-images").getPublicUrl(obj.path).data.publicUrl;
          const newUrl = `${R2_CDN_BASE}/${target}`;
          await admin
            .from("blog_posts")
            .update({ featured_image_url: newUrl })
            .eq("featured_image_url", oldPublic);
        } else if (bucket === "proposals_pdfs") {
          const oldPublic = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/proposals_pdfs/${obj.path}`;
          const newUrl = `${R2_COMMERCIAL_CDN_BASE}/propostas/${obj.path}`;

          const { data: mvRows } = await admin
            .from("material_versions")
            .select("id, content");
          
          if (mvRows) {
            for (const row of mvRows) {
              const str = JSON.stringify(row.content);
              if (str.includes(obj.path) || str.includes(oldPublic)) {
                const updatedContent = JSON.parse(str.replaceAll(oldPublic, newUrl));
                await admin
                  .from("material_versions")
                  .update({ content: updatedContent })
                  .eq("id", row.id);
              }
            }
          }
        }

        await admin.from("r2_migration_log").upsert(
          {
            source_bucket: bucket,
            source_path: obj.path,
            target_path: target,
            status: "ok",
            bytes: buf.byteLength,
          },
          { onConflict: "source_bucket,source_path" }
        );
        migrated++;
      } catch (e) {
        failed++;
        await admin.from("r2_migration_log").upsert(
          {
            source_bucket: bucket,
            source_path: obj.path,
            target_path: target,
            status: "error",
            error_message: e instanceof Error ? e.message : String(e),
          },
          { onConflict: "source_bucket,source_path" }
        );
      }
    }

    return jres(
      { ok: true, total: all.length, processed: slice.length, migrated, skipped, failed },
      200
    );
  } catch (e) {
    console.error("[gestao-migrate-supabase-to-r2] error", e);
    return jres({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});

function jres(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
