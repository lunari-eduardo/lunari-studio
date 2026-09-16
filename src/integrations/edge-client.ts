import { supabase } from '@/integrations/supabase/client';

const PREVIEWS_BASE = import.meta.env.VITE_EDGE_PREVIEWS_URL || 'https://lunari-edge-previews.eduardo22diehl.workers.dev';
const API_BASE = import.meta.env.VITE_EDGE_API_URL || 'https://lunari-edge-api.eduardo22diehl.workers.dev';

export interface EdgeInvokeOptions {
  body?: any;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export async function invokeEdgeWorker<T = any>(
  workerType: 'previews' | 'api',
  functionName: string,
  options: EdgeInvokeOptions = {}
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const baseUrl = workerType === 'previews' ? PREVIEWS_BASE : API_BASE;
    const url = `${baseUrl}/functions/v1/${functionName}`;
    const method = options.method || (options.body ? 'POST' : 'GET');

    const headers: Record<string, string> = {
      ...(options.headers || {}),
    };

    // Obter sessão atual para repassar Authorization se houver
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.access_token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
    }

    let bodyPayload: BodyInit | undefined = undefined;
    if (options.body instanceof FormData) {
      bodyPayload = options.body;
      // Fetch cuida do Content-Type multipart automaticamente
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      bodyPayload = JSON.stringify(options.body);
    }

    const res = await fetch(url, {
      method,
      headers,
      body: bodyPayload,
    });

    if (!res.ok) {
      const errText = await res.text();
      let parsedErr = errText;
      try {
        parsedErr = JSON.parse(errText).error || errText;
      } catch {}
      throw new Error(parsedErr || `Edge worker error: ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { data, error: null };
    } else {
      const text = await res.text();
      return { data: text as unknown as T, error: null };
    }
  } catch (err: any) {
    console.warn("%s", `[invokeEdgeWorker:${functionName}] Falha na chamada ao Cloudflare Worker:`, err);
    // Fallback gracioso para o Supabase Edge Functions caso ocorra falha de rede
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tlnjspsywycbudhewsfv.supabase.co';
      const fallbackUrl = `${supabaseUrl}/functions/v1/${functionName}`;
      
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const fallbackHeaders: Record<string, string> = {
        ...(options.headers || {}),
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      };
      if (token) {
        fallbackHeaders['Authorization'] = `Bearer ${token}`;
      }

      let fallbackBody: BodyInit | undefined = undefined;
      if (options.body instanceof FormData) {
        fallbackBody = options.body;
      } else if (options.body !== undefined) {
        fallbackHeaders['Content-Type'] = 'application/json';
        fallbackBody = JSON.stringify(options.body);
      }

      const fallbackRes = await fetch(fallbackUrl, {
        method: options.method || (options.body ? 'POST' : 'GET'),
        headers: fallbackHeaders,
        body: fallbackBody,
      });

      if (!fallbackRes.ok) {
        const errText = await fallbackRes.text();
        let parsedErr = errText;
        try {
          parsedErr = JSON.parse(errText).error || errText;
        } catch {}
        return { data: null, error: new Error(parsedErr || `Supabase function error: ${fallbackRes.status}`) };
      }

      const contentType = fallbackRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await fallbackRes.json();
        return { data, error: null };
      } else {
        const text = await fallbackRes.text();
        return { data: text as unknown as T, error: null };
      }
    } catch (supabaseErr: any) {
      return { data: null, error: err };
    }
  }
}
