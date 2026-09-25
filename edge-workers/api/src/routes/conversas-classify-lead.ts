import { Context } from 'hono';

export async function conversasClassifyLeadRoute(c: Context) {
  try {
    const { messages } = await c.req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: 'Messages array is required' }, 400);
    }

    const conversationText = messages
      .slice(-10)
      .map((m: any) => `${m.role === 'user' ? 'Cliente' : 'Fotógrafo'}: ${m.content}`)
      .join('\n');

    const prompt = `Você é um assistente de CRM para estúdios fotográficos.
Sua tarefa é analisar a conversa e identificar se o cliente demonstra intenção de contratar um ensaio.

Retorne APENAS um JSON válido com a seguinte estrutura:
{
  "has_intent": boolean,
  "category": string | null
}
- "has_intent": true se o cliente está buscando orçamento, data, perguntando de ensaio, etc.
- "category": a categoria fotográfica mencionada ou inferida (ex: "Gestante", "Newborn", "Casamento", "Aniversário", "Festa Infantil", "Smash the Cake", "Corporativo", "Família", "Formatura"). null se não estiver claro.

Conversa:
${conversationText}

JSON:`;

    const response = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are an AI that outputs exclusively raw JSON objects without markdown wrappers.' },
        { role: 'user', content: prompt }
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

    return c.json({ has_intent: false, category: null });
  } catch (error: any) {
    console.error('[conversas-classify-lead] Error:', error);
    return c.json({ has_intent: false, category: null }, 200); // Fail open gracefully
  }
}
