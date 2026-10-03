/**
 * Hook para busca e gerenciamento de contatos do WhatsApp.
 *
 * Fornece:
 * - Busca de contato por telefone normalizado
 * - Lista de todos os contatos
 * - Vinculação de contato a cliente/lead existente
 */

import { useEffect, useCallback, useState, useId } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Contato, ContatoUpdate } from '@/modules/conversas/types';
import { normalizeBrPhone } from '@/lib/phone';

const DEBUG = false;

// Re-export para manter compatibilidade com código que já importava deste hook.
export { normalizeBrPhone };

export interface UseConversasContatosReturn {
  contatos: Contato[];
  isLoading: boolean;

  /** Busca contato por phone_normalized exato */
  getContatoByPhone: (phoneNormalized: string) => Contato | undefined;

  /** Busca contato mais próximo (fallback sem +) */
  getContatoByPhoneRaw: (phoneRaw: string) => Contato | undefined;

  /** Atualiza nome e tipo do contato */
  updateContato: (contatoId: string, updates: ContatoUpdate) => Promise<void>;

  /** Vincula contato a um cliente do CRM */
  linkToCliente: (contatoId: string, clienteId: string) => Promise<void>;

  /** Desvincula contato de qualquer CRM */
  unlinkCliente: (contatoId: string) => Promise<void>;
}

export function useConversasContatos(): UseConversasContatosReturn {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hookId = useId();

  // ─── Load initial data ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const userId = session.user.id;

        const { data, error } = await supabase
          .from('conversas_contatos')
          .select('*, conversas_chats(contato_nome, ultima_mensagem_data)')
          .eq('user_id', userId)
          .order('ultima_mensagem_data', { ascending: false, nullsFirst: false })
          .limit(10000);

        if (error) throw error;
        
        const validContatos = (data ?? [])
          .filter((c: any) => {
            if (!c || c.nome === 'Você') return false;
            const digits = (c.phone_normalized || c.phone_raw || '').replace(/\D/g, '');
            return digits.length >= 10 && digits.length <= 13;
          })
          .map((c: any) => {
            const chat = Array.isArray(c.conversas_chats) ? c.conversas_chats[0] : c.conversas_chats;
            const resolvedName = c.nome?.trim() || chat?.contato_nome?.trim() || null;
            const resolvedDate = chat?.ultima_mensagem_data && (!c.ultima_mensagem_data || new Date(chat.ultima_mensagem_data) > new Date(c.ultima_mensagem_data))
              ? chat.ultima_mensagem_data
              : c.ultima_mensagem_data;

            return {
              ...c,
              nome: resolvedName,
              ultima_mensagem_data: resolvedDate,
            } as Contato;
          })
          .sort((a, b) => {
            const timeA = a.ultima_mensagem_data ? new Date(a.ultima_mensagem_data).getTime() : 0;
            const timeB = b.ultima_mensagem_data ? new Date(b.ultima_mensagem_data).getTime() : 0;
            return timeB - timeA;
          });

        if (!cancelled) setContatos(validContatos);
      } catch (err) {
        console.error('[ConversasContatos] Load error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  // ─── Realtime ──────────────────────────────────────────────────────────────

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      channel = supabase
        .channel(`conversas_contatos_${userId}_${hookId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversas_contatos',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (DEBUG) console.log('[ConversasContatos] Change:', payload.eventType, payload);
            if (payload.eventType === 'INSERT') {
              const newC = payload.new as Contato;
              const digits = (newC.phone_normalized || newC.phone_raw || '').replace(/\D/g, '');
              if (newC.nome === 'Você' || digits.length < 10 || digits.length > 13) return;

              setContatos(prev => {
                if (prev.some(c => c.id === newC.id)) return prev;
                return [newC, ...prev].sort((a, b) => {
                  const timeA = a.ultima_mensagem_data ? new Date(a.ultima_mensagem_data).getTime() : 0;
                  const timeB = b.ultima_mensagem_data ? new Date(b.ultima_mensagem_data).getTime() : 0;
                  return timeB - timeA;
                });
              });
            } else if (payload.eventType === 'UPDATE') {
              const updC = payload.new as Contato;
              setContatos(prev =>
                prev
                  .map(c => (c.id === updC.id ? { ...c, ...updC } as Contato : c))
                  .sort((a, b) => {
                    const timeA = a.ultima_mensagem_data ? new Date(a.ultima_mensagem_data).getTime() : 0;
                    const timeB = b.ultima_mensagem_data ? new Date(b.ultima_mensagem_data).getTime() : 0;
                    return timeB - timeA;
                  }),
              );
            } else if (payload.eventType === 'DELETE') {
              setContatos(prev => prev.filter(c => c.id !== payload.old.id));
            }
          },
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [hookId]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getContatoByPhone = useCallback(
    (phoneNormalized: string): Contato | undefined => {
      return contatos.find(c => c.phone_normalized === phoneNormalized);
    },
    [contatos],
  );

  const getContatoByPhoneRaw = useCallback(
    (phoneRaw: string): Contato | undefined => {
      const normalized = normalizeBrPhone(phoneRaw)?.replace(/^\+/, '') ?? null;
      // Try exact match first
      if (normalized) {
        const exact = getContatoByPhone(normalized);
        if (exact) return exact;
        // Fallback: match without country code
        const digits = normalized.replace(/^55/, '');
        return contatos.find(c =>
          c.phone_normalized.endsWith(digits) ||
          c.phone_raw.replace(/\D/g, '').endsWith(digits),
        );
      }
      return undefined;
    },
    [contatos, getContatoByPhone],
  );

  const updateContato = useCallback(
    async (contatoId: string, updates: ContatoUpdate) => {
      setContatos(prev =>
        prev.map(c => (c.id === contatoId ? { ...c, ...updates } as Contato : c)),
      );

      const { error } = await supabase
        .from('conversas_contatos')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', contatoId);

      if (error) {
        console.error('[ConversasContatos] Update error:', error);
        throw error;
      }
    },
    [],
  );

  const linkToCliente = useCallback(
    async (contatoId: string, clienteId: string) => {
      await updateContato(contatoId, {
        tipo: 'cliente',
        cliente_id: clienteId,
        lead_id: null,
      });

      // Atualiza também o(s) chat(s) associado(s) a esse contato
      const { error } = await supabase
        .from('conversas_chats')
        .update({ cliente_id: clienteId, updated_at: new Date().toISOString() })
        .eq('contato_id', contatoId);

      if (error) {
        console.error('[ConversasContatos] Link chat error:', error);
      }
    },
    [updateContato],
  );

  const unlinkCliente = useCallback(
    async (contatoId: string) => {
      await updateContato(contatoId, {
        tipo: 'unknown',
        cliente_id: null,
        lead_id: null,
      });

      // Remove a vinculação também do(s) chat(s)
      const { error } = await supabase
        .from('conversas_chats')
        .update({ cliente_id: null, updated_at: new Date().toISOString() })
        .eq('contato_id', contatoId);

      if (error) {
        console.error('[ConversasContatos] Unlink chat error:', error);
      }
    },
    [updateContato],
  );

  return {
    contatos,
    isLoading,
    getContatoByPhone,
    getContatoByPhoneRaw,
    updateContato,
    linkToCliente,
    unlinkCliente,
  };
}
