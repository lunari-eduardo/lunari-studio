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

export async function conversasClassifyLeadRoute(c: Context) {
  try {
    const { messages, categories } = await c.req.json().catch(() => ({}));

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ has_intent: false, category: null });
    }

    const availableCategories: string[] = Array.isArray(categories) ? categories : [];

    const conversationText = messages
      .slice(-10)
      .map((m: any) => `${m.role === 'user' ? 'Cliente' : 'Fotógrafo'}: ${m.content}`)
      .join('\n');

    const categoriesInstruction = availableCategories.length > 0
      ? `As categorias cadastradas neste estúdio de fotografia são: [${availableCategories.join(', ')}].
Se o cliente tiver interesse em alguma delas, retorne EXATAMENTE o nome correspondente dessa lista no campo "category".`
      : `Exemplos de categorias: Gestante, Newborn, Casamento, Ensaio Feminino, Aniversário, Infantil, Família, Corporativo, Formatura.`;

    const systemPrompt = `Você é a Lua, assistente de inteligência comercial do Lunari Studio para fotógrafos profissionais.
Sua função é analisar as mensagens de uma conversa de WhatsApp entre um cliente potencial e o estúdio de fotografia.
Você deve detectar se o cliente demonstra real intenção comercial de contratação (orçamento, disponibilidade de datas, valores, pacotes de fotos) e identificar a categoria de ensaio pretendida.
${categoriesInstruction}

Retorne exclusivamente um JSON no seguinte formato:
{
  "has_intent": boolean,
  "category": string | null
}`;

    let geminiError = '';
    // 1. Tenta usar o Google Gemini oficial da Lua configurado no banco Supabase
    try {
      const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: keyRow } = await supabase
        .from('assistant_provider_keys')
        .select('api_key')
        .eq('provider_name', 'gemini')
        .maybeSingle();

      if (keyRow?.api_key) {
        const rawApiKey = await decryptToken(keyRow.api_key, c.env.SUPABASE_SERVICE_ROLE_KEY);
        if (rawApiKey && typeof rawApiKey === 'string' && rawApiKey.trim().length > 15) {
          const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash'];
          
          for (const model of candidateModels) {
            try {
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${rawApiKey.trim()}`;
              const geminiRes = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        { text: systemPrompt },
                        { text: `Conversa recente:\n${conversationText}` }
                      ]
                    }
                  ],
                  generationConfig: {
                    responseMimeType: 'application/json'
                  }
                })
              });

              if (geminiRes.ok) {
                const geminiData: any = await geminiRes.json();
                const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  const cleanedText = text.replace(/```(?:json)?\s*([\s\S]*?)```/, '$1').trim();
                  const parsed = JSON.parse(cleanedText);
                  return c.json({
                    has_intent: !!parsed.has_intent,
                    category: parsed.category || null
                  });
                }
              } else {
                console.warn(`[conversas-classify-lead] Gemini ${model} retornou status:`, geminiRes.status);
              }
            } catch (modelErr) {
              console.warn(`[conversas-classify-lead] Erro ao chamar modelo ${model}:`, modelErr);
            }
          }
        }
      }
    } catch (geminiErr: any) {
      geminiError = geminiErr?.message || String(geminiErr);
      console.warn('[conversas-classify-lead] Erro ao chamar Google Gemini, tentando fallback:', geminiErr);
    }

    // 2. Fallback resiliente: Cloudflare Workers AI
    if (c.env.AI) {
      try {
        const response = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            { role: 'system', content: 'You are an AI that outputs exclusively raw JSON objects without markdown wrappers.' },
            { role: 'user', content: `${systemPrompt}\n\nConversa:\n${conversationText}\n\nJSON:` }
          ]
        });

        let resultStr = '';
        if (typeof response === 'string') {
          resultStr = response;
        } else if (response && 'response' in response) {
          resultStr = (response as any).response;
        }

        const jsonMatch = resultStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return c.json({
            has_intent: !!parsed.has_intent,
            category: parsed.category || null
          });
        }
      } catch (cfAiErr) {
        console.warn('[conversas-classify-lead] Cloudflare Workers AI falhou:', cfAiErr);
      }
    }

    // 3. Fallback Heurístico (Resiliência Máxima por Palavras-Chave de Intenção e Categorias)
    const lowerConv = conversationText.toLowerCase();
    const intentKeywords = ['quanto', 'valor', 'preco', 'preço', 'pacote', 'orcamento', 'orçamento', 'data', 'agend', 'ensaio', 'foto'];
    const hasIntentKeyword = intentKeywords.some(kw => lowerConv.includes(kw));

    let detectedCategory: string | null = null;
    for (const cat of availableCategories) {
      if (lowerConv.includes(cat.toLowerCase().trim())) {
        detectedCategory = cat;
        break;
      }
    }

    if (detectedCategory || hasIntentKeyword) {
      return c.json({
        has_intent: true,
        category: detectedCategory
      });
    }

    return c.json({ has_intent: false, category: null });
  } catch (error: any) {
    console.error('[conversas-classify-lead] Error:', error);
    return c.json({ has_intent: false, category: null }, 200);
  }
}
