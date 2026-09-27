import { useEffect, useState, useId } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { 
  ClienteSupabase, 
  ClienteFamilia, 
  ClienteDocumento 
} from '@/types/cliente-supabase';

export function useClientesState() {
  const [clientes, setClientes] = useState<ClienteSupabase[]>([]);
  const [familia, setFamilia] = useState<ClienteFamilia[]>([]);
  const [documentos, setDocumentos] = useState<ClienteDocumento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const instanceId = useId();

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const userId = session.user.id;

        const [clientesData, familiaData, documentosData] = await Promise.all([
          supabase.from('clientes').select('*').eq('user_id', userId),
          supabase.from('clientes_familia').select('*').eq('user_id', userId),
          supabase.from('clientes_documentos').select('*').eq('user_id', userId)
        ]);

        if (clientesData.error) throw clientesData.error;
        if (familiaData.error) throw familiaData.error;
        if (documentosData.error) throw documentosData.error;

        setClientes(clientesData.data || []);
        setFamilia((familiaData.data || []) as ClienteFamilia[]);
        setDocumentos(documentosData.data || []);
        
      } catch (error) {
        console.error('Erro ao carregar dados dos clientes:', error);
        toast.error('Erro ao carregar dados dos clientes');
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []);

  useEffect(() => {
    let clientesChannel: any = null;
    let familiaChannel: any = null;
    let documentosChannel: any = null;

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      clientesChannel = supabase
        .channel(`clientes_changes_${userId}_${instanceId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clientes', filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setClientes(prev => [...prev, payload.new as ClienteSupabase]);
            } else if (payload.eventType === 'UPDATE') {
              setClientes(prev => prev.map(c => 
                c.id === payload.new.id ? payload.new as ClienteSupabase : c
              ));
            } else if (payload.eventType === 'DELETE') {
              setClientes(prev => prev.filter(c => c.id !== payload.old.id));
            }
          }
        ).subscribe();

      familiaChannel = supabase
        .channel(`familia_changes_${userId}_${instanceId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clientes_familia', filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setFamilia(prev => [...prev, payload.new as ClienteFamilia]);
            } else if (payload.eventType === 'UPDATE') {
              setFamilia(prev => prev.map(f => 
                f.id === payload.new.id ? payload.new as ClienteFamilia : f
              ));
            } else if (payload.eventType === 'DELETE') {
              setFamilia(prev => prev.filter(f => f.id !== payload.old.id));
            }
          }
        ).subscribe();

      documentosChannel = supabase
        .channel(`documentos_changes_${userId}_${instanceId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'clientes_documentos', filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setDocumentos(prev => [...prev, payload.new as ClienteDocumento]);
            } else if (payload.eventType === 'UPDATE') {
              setDocumentos(prev => prev.map(d => 
                d.id === payload.new.id ? payload.new as ClienteDocumento : d
              ));
            } else if (payload.eventType === 'DELETE') {
              setDocumentos(prev => prev.filter(d => d.id !== payload.old.id));
            }
          }
        ).subscribe();
    };

    setupRealtime();

    return () => {
      if (clientesChannel) supabase.removeChannel(clientesChannel);
      if (familiaChannel) supabase.removeChannel(familiaChannel);
      if (documentosChannel) supabase.removeChannel(documentosChannel);
    };
  }, [instanceId]);

  return {
    clientes,
    setClientes,
    familia,
    setFamilia,
    documentos,
    setDocumentos,
    isLoading
  };
}
