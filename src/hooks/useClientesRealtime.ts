/**
 * Hook for real-time client management with Supabase
 * Replaces localStorage-based client system with real-time database
 */

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { 
  ClienteSupabase, 
  ClienteCompleto 
} from '@/types/cliente-supabase';

import { useClientesState } from './clientes/useClientesState';
import { useClientesMutations } from './clientes/useClientesMutations';
import { useFamiliaMutations } from './clientes/useFamiliaMutations';

export function useClientesRealtime() {
  const {
    clientes, setClientes,
    familia, setFamilia,
    documentos,
    isLoading
  } = useClientesState();

  const {
    adicionarCliente,
    atualizarCliente,
    removerCliente,
    verificarClienteTemDados
  } = useClientesMutations(setClientes);

  const {
    adicionarFamilia,
    atualizarFamilia,
    removerFamilia
  } = useFamiliaMutations(setFamilia);

  // ============= SYNC FAMÍLIA COMPLETA =============
  
  const syncFamiliaData = useCallback(async (
    clienteId: string,
    conjuge: { nome?: string; dataNascimento?: string },
    filhos: Array<{ id: string; nome?: string; dataNascimento?: string }>
  ) => {
    try {
      const familiaAtual = familia.filter(f => f.cliente_id === clienteId);
      const conjugeAtual = familiaAtual.find(f => f.tipo === 'conjuge');
      const filhosAtuais = familiaAtual.filter(f => f.tipo === 'filho');

      // Sincronizar Cônjuge
      if (conjuge?.nome?.trim()) {
        if (conjugeAtual) {
          await atualizarFamilia(conjugeAtual.id, {
            nome: conjuge.nome,
            data_nascimento: conjuge.dataNascimento || null
          });
        } else {
          await adicionarFamilia(clienteId, {
            tipo: 'conjuge',
            nome: conjuge.nome,
            data_nascimento: conjuge.dataNascimento || null
          });
        }
      } else if (conjugeAtual) {
        await removerFamilia(conjugeAtual.id);
      }

      // Sincronizar Filhos
      const filhosSupabaseIds = filhosAtuais.map(f => f.id);
      const filhosParaManter = filhos.filter(f => filhosSupabaseIds.includes(f.id) && f.nome?.trim());
      const filhosParaCriar = filhos.filter(f => !filhosSupabaseIds.includes(f.id) && f.nome?.trim());
      const filhosParaDeletar = filhosAtuais.filter(f => !filhos.some(filho => filho.id === f.id && filho.nome?.trim()));

      for (const filho of filhosParaManter) {
        await atualizarFamilia(filho.id, {
          nome: filho.nome,
          data_nascimento: filho.dataNascimento || null
        });
      }
      for (const filho of filhosParaCriar) {
        await adicionarFamilia(clienteId, {
          tipo: 'filho',
          nome: filho.nome!,
          data_nascimento: filho.dataNascimento || null
        });
      }
      for (const filho of filhosParaDeletar) {
        await removerFamilia(filho.id);
      }
    } catch (error) {
      console.error('Erro ao sincronizar família:', error);
      throw error;
    }
  }, [familia, adicionarFamilia, atualizarFamilia, removerFamilia]);

  // ============= ATUALIZAR CLIENTE COMPLETO =============
  
  const atualizarClienteCompleto = useCallback(async (
    id: string, 
    dadosCliente: any
  ) => {
    try {
      const { conjuge, filhos, ...dadosBasicos } = dadosCliente;

      const FIELD_MAP: Record<string, keyof ClienteSupabase> = {
        nome: 'nome', email: 'email', telefone: 'telefone', whatsapp: 'whatsapp',
        endereco: 'endereco', observacoes: 'observacoes', origem: 'origem',
        dataNascimento: 'data_nascimento', data_nascimento: 'data_nascimento',
        cpf_cnpj: 'cpf_cnpj', cep: 'cep', endereco_numero: 'endereco_numero',
        endereco_complemento: 'endereco_complemento', bairro: 'bairro',
        cidade: 'cidade', uf: 'uf',
      };

      const updateData: Partial<ClienteSupabase> = {};
      for (const [key, col] of Object.entries(FIELD_MAP)) {
        if (key in dadosBasicos) {
          const v = (dadosBasicos as any)[key];
          if (col === 'nome' && (v === null || v === undefined || v === '')) continue;
          (updateData as any)[col] = v === '' ? null : v;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await atualizarCliente(id, updateData);
      }

      if (conjuge !== undefined || filhos !== undefined) {
        await syncFamiliaData(
          id,
          conjuge || { nome: '', dataNascimento: '' },
          filhos || []
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar cliente completo:', error);
      toast.error('Erro ao atualizar cliente');
      throw error;
    }
  }, [atualizarCliente, syncFamiliaData]);

  const adicionarClienteCompleto = useCallback(async (
    dadosCliente: any
  ) => {
    try {
      const { conjuge, filhos, ...dadosBasicos } = dadosCliente;
      
      const FIELD_MAP: Record<string, keyof ClienteSupabase> = {
        nome: 'nome', email: 'email', telefone: 'telefone', whatsapp: 'whatsapp',
        endereco: 'endereco', observacoes: 'observacoes', origem: 'origem',
        dataNascimento: 'data_nascimento', data_nascimento: 'data_nascimento',
        cpf_cnpj: 'cpf_cnpj', cep: 'cep', endereco_numero: 'endereco_numero',
        endereco_complemento: 'endereco_complemento', bairro: 'bairro',
        cidade: 'cidade', uf: 'uf',
      };

      const insertData: any = {};
      for (const [key, col] of Object.entries(FIELD_MAP)) {
        if (key in dadosBasicos) {
          const v = (dadosBasicos as any)[key];
          if (col === 'nome' && (v === null || v === undefined || v === '')) continue;
          insertData[col] = v === '' ? null : v;
        }
      }

      const novoCliente = await adicionarCliente(insertData);

      if (conjuge !== undefined || filhos !== undefined) {
        await syncFamiliaData(
          novoCliente.id,
          conjuge || { nome: '', dataNascimento: '' },
          filhos || []
        );
      }
      return novoCliente;
    } catch (error) {
      console.error('Erro ao adicionar cliente completo:', error);
      toast.error('Erro ao adicionar cliente');
      throw error;
    }
  }, [adicionarCliente, syncFamiliaData]);

  // ============= MIGRATION HELPER =============
  
  const migrarLocalStorageClientes = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');
      const user = session.user;

      const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      if (localClientes.length === 0) return;

      const clientesToInsert = localClientes.map((cliente: any) => ({
        id: cliente.id,
        user_id: user.id,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        whatsapp: cliente.whatsapp,
        endereco: cliente.endereco,
        observacoes: cliente.observacoes,
        origem: cliente.origem,
        data_nascimento: cliente.dataNascimento
      }));

      const { error } = await supabase.from('clientes').insert(clientesToInsert);
      if (error) throw error;

      for (const cliente of localClientes) {
        if (cliente.conjuge?.nome) {
          await adicionarFamilia(cliente.id, {
            tipo: 'conjuge', nome: cliente.conjuge.nome, data_nascimento: cliente.conjuge.dataNascimento
          });
        }
        if (cliente.filhos?.length > 0) {
          for (const filho of cliente.filhos) {
            if (filho.nome) {
              await adicionarFamilia(cliente.id, {
                tipo: 'filho', nome: filho.nome, data_nascimento: filho.dataNascimento
              });
            }
          }
        }
      }

      localStorage.removeItem('clientes');
      toast.success(`${localClientes.length} clientes migrados com sucesso!`);
    } catch (error) {
      console.error('Erro migrando clientes:', error);
      toast.error('Erro na migração dos clientes');
    }
  }, [adicionarFamilia]);

  // ============= COMPUTED VALUES =============
  
  const clientesCompletos = useMemo((): ClienteCompleto[] => {
    return clientes.map(cliente => ({
      ...cliente,
      familia: familia.filter(f => f.cliente_id === cliente.id),
      documentos: documentos.filter(d => d.cliente_id === cliente.id)
    }));
  }, [clientes, familia, documentos]);

  const getClienteById = useCallback((id: string): ClienteCompleto | undefined => {
    return clientesCompletos.find(c => c.id === id);
  }, [clientesCompletos]);

  const getClienteByNome = useCallback((nome: string): ClienteCompleto | undefined => {
    if (!nome?.trim()) return undefined;
    const nomeNormalizado = nome.trim().toLowerCase();
    return clientesCompletos.find(c => c.nome?.toLowerCase().trim() === nomeNormalizado);
  }, [clientesCompletos]);

  const searchClientes = useCallback((termo: string): ClienteCompleto[] => {
    if (!termo.trim()) return clientesCompletos;
    const termoBusca = termo.toLowerCase();
    return clientesCompletos.filter(cliente => 
      cliente.nome?.toLowerCase().includes(termoBusca) ||
      cliente.email?.toLowerCase().includes(termoBusca) ||
      cliente.telefone?.includes(termoBusca) ||
      cliente.whatsapp?.includes(termoBusca)
    );
  }, [clientesCompletos]);

  return {
    clientes: clientesCompletos,
    isLoading,
    
    adicionarCliente,
    adicionarClienteCompleto,
    atualizarCliente,
    removerCliente,
    atualizarClienteCompleto,
    verificarClienteTemDados,
    
    adicionarFamilia,
    atualizarFamilia,
    removerFamilia,
    
    getClienteById,
    getClienteByNome,
    searchClientes,
    
    migrarLocalStorageClientes
  };
}