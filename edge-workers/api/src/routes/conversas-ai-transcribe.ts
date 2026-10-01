import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';

async function decryptToken(encryptedPayload: string, fallbackSecret: string): Promise<string> {
  if (!encryptedPayload.startsWith('enc:v1:')) {
    return encryptedPayload;
  }
  const parts = encryptedPayload.split(':');
  if (parts.length !== 4) return encryptedPayload;
  const base64Iv = parts[2];
  const base64Ciphertext = parts[3];

  const keyMaterial = new TextEncoder().encode(fallbackSecret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyMaterial);
  const key = await crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, ['decrypt']);

  const iv = Uint8Array.from(atob(base64Iv), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(base64Ciphertext), c => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

export async function conversasAiTranscribeRoute(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Missing auth header' }, 401);

    const { message_id } = await c.req.json().catch(() => ({}));
    if (!message_id) return c.json({ error: 'message_id is required' }, 400);

    const supabaseUrl = c.env.SUPABASE_URL;
    const supabaseKey = c.env.SUPABASE_ANON_KEY;
    const serviceRole = c.env.SUPABASE_SERVICE_ROLE_KEY;

    // Create a client with the user's JWT to enforce RLS
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return c.json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    // 1. Fetch message and verify ownership
    const { data: msgData, error: msgErr } = await userClient
      .from('conversas_mensagens')
      .select('id, type, media_url, media_mime_type')
      .eq('id', message_id)
      .maybeSingle();

    if (msgErr || !msgData) return c.json({ error: 'Message not found' }, 404);
    if (msgData.type !== 'audio' || !msgData.media_url) {
      return c.json({ error: 'Message is not an audio with valid url' }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRole);

    // 2. Fetch AI settings and keys
    const { data: settingsData } = await adminClient
      .from('app_settings')
      .select('key, value')
      .in('key', ['conversas_ai_model', 'conversas_ai_enabled']);

    let isEnabled = false;
    let targetModel = 'gemini-1.5-flash';
    if (settingsData) {
      const en = settingsData.find(s => s.key === 'conversas_ai_enabled')?.value;
      if (en === 'true' || en === true) isEnabled = true;
      const md = settingsData.find(s => s.key === 'conversas_ai_model')?.value;
      if (md && typeof md === 'string') targetModel = md;
    }

    if (!isEnabled) {
      return c.json({ error: 'Transcrição desativada nas configurações.' }, 403);
    }

    // Try to get conversas_gemini first, fallback to gemini
    const { data: keysData } = await adminClient
      .from('assistant_provider_keys')
      .select('provider_name, api_key')
      .in('provider_name', ['conversas_gemini', 'gemini']);

    let encKey = keysData?.find(k => k.provider_name === 'conversas_gemini')?.api_key;
    if (!encKey) {
      encKey = keysData?.find(k => k.provider_name === 'gemini')?.api_key;
    }

    if (!encKey) {
      return c.json({ error: 'Nenhuma chave Gemini configurada no cofre.' }, 500);
    }

    const rawApiKey = await decryptToken(encKey, serviceRole);
    if (!rawApiKey) return c.json({ error: 'Falha ao descriptografar chave.' }, 500);

    // 3. Download the audio file
    const audioRes = await fetch(msgData.media_url);
    if (!audioRes.ok) {
      return c.json({ error: 'Failed to fetch audio from source.' }, 500);
    }
    const audioBuffer = await audioRes.arrayBuffer();
    
    // OTIMIZAÇÃO CRÍTICA: Conversão em chunks (Evita Error 502 Bad Gateway de Timeout de CPU no Cloudflare)
    let binary = '';
    const bytes = new Uint8Array(audioBuffer);
    const chunkSize = 0x8000; // 32KB chunk (seguro para a call stack)
    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    const base64Audio = btoa(binary);

    // 4. Send to Gemini for transcription
    const startMs = Date.now();
    const systemPrompt = `Você é um transcritor de áudio avançado em português do Brasil (Norma Culta).
Regras estritas de processamento:
1. Realize a transcrição verbatim adaptada (limpa).
2. Pontue e formate o texto corretamente de acordo com a norma culta.
3. OMITA totalmente vícios de linguagem, hesitações e ruídos vocais (como "humm", "ééé", "né", "tipo assim", "ah").
4. Inclua marcadores de tempo (timestamps) a cada troca de assunto ou a cada bloco de ~30 a 60 segundos no formato [mm:ss].
5. NÃO gere nenhum título, não use formatação markdown (como #, **, etc) e não gere resumos.

Retorne APENAS o texto puro da transcrição com os timestamps.
Exemplo de saída:
[00:00] Oi, eu queria saber quais os valores para ensaio de newborn.
[00:15] E também se vocês têm disponibilidade para o próximo sábado.`;
    
    const mimeType = (msgData.media_mime_type?.includes('audio') ? msgData.media_mime_type : 'audio/ogg').split(';')[0];

    // Forçar modelo para o solicitado se necessário ou manter o targetModel dinâmico,
    // mas vamos sobrescrever o default para o que o usuário exigiu, caso não venha da DB
    if (!targetModel || targetModel.includes("1.5")) {
      targetModel = "gemini-3.5-flash-lite";
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${rawApiKey.trim()}`;
    
    // Estrutura do payload (com thinkingConfig pedido pelo usuário)
    const payload: any = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          parts: [
            { inlineData: { mimeType: mimeType, data: base64Audio } },
            { text: "Transcreva este áudio seguindo as regras." }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    };

    let geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // AUTO-CORREÇÃO: Alguns modelos Lite na API v1beta estrita rejeitam campos de "Thinking" (HTTP 400).
    // O SDK moderno lida com isso silenciando, mas no REST cru nós fazemos o fallback automático.
    if (geminiRes.status === 400) {
       delete payload.generationConfig.thinkingConfig;
       geminiRes = await fetch(geminiUrl, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
       });
    }

    const durationSec = (Date.now() - startMs) / 1000;
    const jsonResult = await geminiRes.json();

    if (!geminiRes.ok) {
      // Log failure
      await adminClient.from('conversas_ai_logs').insert({
        user_id: userId,
        message_id: msgData.id,
        provider: 'gemini',
        model_used: targetModel,
        duration_sec: durationSec,
        success: false,
        error_message: JSON.stringify(jsonResult.error || 'Unknown API error')
      });
      return c.json({ error: 'Falha na IA do Google', details: jsonResult.error }, 502);
    }

    const text = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return c.json({ error: 'Nenhum texto retornado pela IA' }, 500);
    }

    const cleanTranscript = text.trim();

    // 5. Update message with transcription
    const { error: updateError } = await adminClient
      .from('conversas_mensagens')
      .update({ audio_transcript: cleanTranscript })
      .eq('id', msgData.id);

    if (updateError) {
      console.error('Falha ao salvar transcrição no banco:', updateError);
      // Log failure in ai logs as well but don't crash
      await adminClient.from('conversas_ai_logs').insert({
        user_id: userId,
        message_id: msgData.id,
        provider: 'gemini',
        model_used: targetModel,
        duration_sec: durationSec,
        success: false,
        error_message: 'Update DB Error: ' + updateError.message
      });
      // Retorna 200 com a transcrição (para não desperdiçar o token gasto), 
      // mas injeta o erro do DB para o front-end avisar.
      return c.json({ transcript: cleanTranscript, warning: `Não salvo no DB: ${updateError.message}` });
    }

    // 6. Log success
    await adminClient.from('conversas_ai_logs').insert({
      user_id: userId,
      message_id: msgData.id,
      provider: 'gemini',
      model_used: targetModel,
      duration_sec: durationSec,
      success: true,
    });

    return c.json({ transcript: cleanTranscript });

  } catch (error: any) {
    console.error('AI Transcription Error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
}
