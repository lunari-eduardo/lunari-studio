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

const DEBUG = false;

/** Converte telefone brasileiro para formato E.164 (apenas números + 55) */
export function normalizeBrPhone(phoneRaw: string): string {
  const digits = phoneRaw.replace(/\D/g, '');
  // Aceita: 11999999999, 5511999999999, +5511999999999
  if (digits.length === 11) return `55${digits}`;
  if (digits.length === 13 && digits.startsWith('55')) return digits;
  if (digits.length === 12 && digits.startsWith('55')) return `5${digits}`;
  if (digits.length === 10) return `55${digits}`;
  return digits;
}

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
          .select('*')
          .eq('user_id', userId)
          .order('ultima_mensagem_data', { ascending: false });

        if (error) throw error;
        if (!cancelled) setContatos(data ?? []);
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
              setContatos(prev => {
                if (prev.some(c => c.id === (payload.new as Contato).id)) return prev;
                return [...prev, payload.new as Contato];
              });
            } else if (payload.eventType === 'UPDATE') {
              setContatos(prev =>
                prev.map(c =>
                  c.id === payload.new.id ? { ...c, ...payload.new } as Contato : c,
                ),
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
      const normalized = normalizeBrPhone(phoneRaw);
      // Try exact match first
      const exact = getContatoByPhone(normalized);
      if (exact) return exact;
      // Fallback: match without country code
      const digits = normalized.replace(/^55/, '');
      return contatos.find(c =>
        c.phone_normalized.endsWith(digits) ||
        c.phone_raw.replace(/\D/g, '').endsWith(digits),
      );
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
