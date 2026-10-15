/**
 * Hook for unified client history showing appointments, sessions, and transactions
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getUserLocal } from '@/lib/auth/getUserLocal';

export interface UnifiedHistoryItem {
  id: string;
  type: 'appointment' | 'session' | 'transaction';
  data: string;
  hora?: string;
  titulo: string;
  descricao?: string;
  status: string;
  valor?: number;
  sessionId?: string;
  packageId?: string;
  pacoteNome?: string;
  categoria?: string;
}

export function useUnifiedClientHistory(clienteId: string) {
  const [history, setHistory] = useState<UnifiedHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!clienteId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await getUserLocal();
      if (!user) throw new Error('User not authenticated');

      // Load appointments, sessions, and transactions in parallel
      const [appointmentsData, sessionsData, transactionsData] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            *,
            pacotes (nome, categorias(nome))
          `)
          .eq('cliente_id', clienteId)
          .eq('user_id', user.id),
        
        supabase
          .from('clientes_sessoes')
          .select(`
            *,
            appointments (package_id),
            pacotes (nome, categorias(nome))
          `)
          .eq('cliente_id', clienteId)
          .eq('user_id', user.id),
        
        supabase
          .from('clientes_transacoes')
          .select('*')
          .eq('cliente_id', clienteId)
          .eq('user_id', user.id)
      ]);

      if (appointmentsData.error) throw appointmentsData.error;
      if (sessionsData.error) throw sessionsData.error;
      if (transactionsData.error) throw transactionsData.error;

      const historyItems: UnifiedHistoryItem[] = [];

      // Add appointments
      if (appointmentsData.data) {
        appointmentsData.data.forEach(appointment => {
          const pacote = (appointment as any).pacotes;
          historyItems.push({
            id: appointment.id,
            type: 'appointment',
            data: appointment.date,
            hora: appointment.time,
            titulo: appointment.title,
            descricao: appointment.description || '',
            status: appointment.status,
            sessionId: appointment.session_id,
            packageId: appointment.package_id,
            pacoteNome: pacote?.nome,
            categoria: pacote?.categorias?.nome
          });
        });
      }

      // Add sessions
      if (sessionsData.data) {
        sessionsData.data.forEach(session => {
          const appointment = (session as any).appointments;
          const pacote = (session as any).pacotes;
          
          historyItems.push({
            id: session.id,
            type: 'session',
            data: session.data_sessao,
            hora: session.hora_sessao,
            titulo: `Sessão - ${session.categoria}`,
            descricao: session.descricao || '',
            status: session.status,
            valor: session.valor_total,
            sessionId: session.session_id,
            packageId: appointment?.package_id,
            pacoteNome: pacote?.nome || session.pacote,
            categoria: session.categoria
          });
        });
      }

      // Add transactions
      if (transactionsData.data) {
        transactionsData.data.forEach(transaction => {
          historyItems.push({
            id: transaction.id,
            type: 'transaction',
            data: transaction.data_transacao,
            titulo: `${transaction.tipo} - ${transaction.descricao || 'Pagamento'}`,
            descricao: transaction.descricao || '',
            status: 'concluido',
            valor: transaction.valor,
            sessionId: transaction.session_id
          });
        });
      }

      // Sort by date (newest first)
      historyItems.sort((a, b) => {
        const dateA = new Date(a.data);
        const dateB = new Date(b.data);
        return dateB.getTime() - dateA.getTime();
      });

      setHistory(historyItems);
      setError(null);

    } catch (error) {
      console.error('❌ Error loading unified client history:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      toast.error('Erro ao carregar histórico do cliente');
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!clienteId) return;

    // Um canal com 3 bindings (antes: 3 canais, e o cleanup do async era descartado
    // pelo useEffect — canais vazavam a cada troca de cliente). RLS já isola o usuário.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; loadHistory(); }, 400);
    };
    const filter = `cliente_id=eq.${clienteId}`;
    const channel = supabase
      .channel(`client_history_${clienteId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes_sessoes', filter }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes_transacoes', filter }, reload)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [clienteId, loadHistory]);

  // Load initial data
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    error,
    refetch: loadHistory
  };
}