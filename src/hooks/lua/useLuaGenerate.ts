import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LuaGenerateOptions {
  prompt: string;
  chatId?: string;
  recentMessages?: Array<{ direction: string; content: string }>;
  etapa?: string;
}

interface LuaGenerateResult {
  reply: string;
  dna_version: number;
}

/**
 * Hook para gerar rascunhos de resposta usando a Lua AI.
 * 
 * Chama a Supabase Edge Function `lua-generate-reply` que:
 * - Usa o mesmo provedor/modelo/chave configurados no painel admin
 * - Monta contexto com DNA + Conhecimento do Estúdio + Modelos ativos
 * - Registra auditoria em lua_generation_audit
 * - NUNCA envia mensagem para o cliente
 */
export function useLuaGenerate() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(async (options: LuaGenerateOptions): Promise<string | null> => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada. Faça login novamente.');
        return null;
      }

      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lua-generate-reply`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: options.prompt,
          chat_id: options.chatId ?? null,
          recent_messages: options.recentMessages ?? [],
          etapa: options.etapa ?? null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        const errorMsg = errorData.error || `Erro ${response.status}`;
        
        if (response.status === 429) {
          toast.error('Limite de requisições atingido. Tente novamente em alguns segundos.');
        } else if (response.status === 401) {
          toast.error('Sessão expirada. Faça login novamente.');
        } else {
          toast.error('Erro ao gerar resposta: ' + errorMsg);
        }
        return null;
      }

      const data: LuaGenerateResult = await response.json();
      return data.reply;
    } catch (err: any) {
      console.error('[useLuaGenerate] Falha:', err);
      toast.error('Falha de conexão ao gerar resposta.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generate, isGenerating };
}
