/**
 * Hook centralizado para gerenciar dados financeiros no Supabase
 * Implementa Realtime subscriptions para sincronização multi-dispositivo
 * Inclui auto-atualização de status de transações vencidas
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { onTableChange } from '@/shared/realtime/onTableChange';
import { 
  SupabaseFinancialItemsAdapter,
  ItemFinanceiroSupabase 
} from '@/adapters/SupabaseFinancialItemsAdapter';
import {
  SupabaseFinancialTransactionsAdapter,
  FinancialTransactionDB
} from '@/adapters/SupabaseFinancialTransactionsAdapter';
import {
  SupabaseCreditCardsAdapter,
  CreditCardDB
} from '@/adapters/SupabaseCreditCardsAdapter';
import {
  SupabaseRecurringBlueprintsAdapter,
  RecurringBlueprintDB
} from '@/adapters/SupabaseRecurringBlueprintsAdapter';
import { GrupoPrincipal } from '@/types/financas';
import { toast } from '@/hooks/use-toast';

// Intervalo de verificação periódica: 1 hora
const STATUS_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export interface UseFinancialDataReturn {
  // Data
  itensFinanceiros: ItemFinanceiroSupabase[];
  transacoes: FinancialTransactionDB[];
  cartoes: CreditCardDB[];
  blueprints: RecurringBlueprintDB[];
  
  // Loading states
  loadingItems: boolean;
  loadingTransactions: boolean;
  loadingCards: boolean;
  loadingBlueprints: boolean;
  
  // CRUD - Financial Items
  adicionarItemFinanceiro: (nome: string, grupo: GrupoPrincipal) => Promise<void>;
  atualizarItemFinanceiro: (id: string, updates: { nome?: string; ativo?: boolean }) => Promise<void>;
  removerItemFinanceiro: (id: string) => Promise<void>;
  
  // CRUD - Transactions
  criarTransacao: (transaction: Omit<FinancialTransactionDB, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  criarTransacoes: (transactions: Array<Omit<FinancialTransactionDB, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  atualizarTransacao: (id: string, updates: Partial<FinancialTransactionDB>) => Promise<void>;
  marcarComoPago: (id: string) => Promise<void>;
  removerTransacao: (id: string) => Promise<void>;
  
  // CRUD - Credit Cards
  adicionarCartao: (nome: string, diaVencimento: number, diaFechamento: number) => Promise<void>;
  atualizarCartao: (id: string, updates: Partial<Pick<CreditCardDB, 'nome' | 'dia_vencimento' | 'dia_fechamento' | 'ativo'>>) => Promise<void>;
  removerCartao: (id: string) => Promise<void>;
  
  // CRUD - Blueprints
  criarBlueprint: (blueprint: Omit<RecurringBlueprintDB, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  atualizarBlueprint: (id: string, updates: Partial<RecurringBlueprintDB>) => Promise<void>;
  removerBlueprint: (id: string) => Promise<void>;
  
  // Utilities
  refetch: () => Promise<void>;
}

export function useFinancialData(): UseFinancialDataReturn {
  
  // ============= ESTADO =============
  const [itensFinanceiros, setItensFinanceiros] = useState<ItemFinanceiroSupabase[]>([]);
  const [transacoes, setTransacoes] = useState<FinancialTransactionDB[]>([]);
  const [cartoes, setCartoes] = useState<CreditCardDB[]>([]);
  const [blueprints, setBlueprints] = useState<RecurringBlueprintDB[]>([]);
  
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingBlueprints, setLoadingBlueprints] = useState(true);
  
  // ============= CARREGAMENTO INICIAL =============
  
  const loadItems = useCallback(async () => {
    try {
      setLoadingItems(true);
      const data = await SupabaseFinancialItemsAdapter.getAllItems();
      setItensFinanceiros(data);
    } catch (error) {
      console.error('Erro ao carregar itens financeiros:', error);
      toast({
        title: 'Erro ao carregar itens',
        description: 'Não foi possível carregar os itens financeiros.',
        variant: 'destructive'
      });
    } finally {
      setLoadingItems(false);
    }
  }, []);
  
  const loadTransactions = useCallback(async () => {
    try {
      setLoadingTransactions(true);
      const data = await SupabaseFinancialTransactionsAdapter.getAllTransactions();
      setTransacoes(data);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      toast({
        title: 'Erro ao carregar transações',
        description: 'Não foi possível carregar as transações financeiras.',
        variant: 'destructive'
      });
    } finally {
      setLoadingTransactions(false);
    }
  }, []);
  
  const loadCards = useCallback(async () => {
    try {
      setLoadingCards(true);
      const data = await SupabaseCreditCardsAdapter.getAllCards();
      setCartoes(data);
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
      toast({
        title: 'Erro ao carregar cartões',
        description: 'Não foi possível carregar os cartões de crédito.',
        variant: 'destructive'
      });
    } finally {
      setLoadingCards(false);
    }
  }, []);
  
  const loadBlueprints = useCallback(async () => {
    try {
      setLoadingBlueprints(true);
      const data = await SupabaseRecurringBlueprintsAdapter.getAllBlueprints();
      setBlueprints(data);
    } catch (error) {
      console.error('Erro ao carregar blueprints:', error);
      toast({
        title: 'Erro ao carregar despesas recorrentes',
        description: 'Não foi possível carregar os modelos de despesas recorrentes.',
        variant: 'destructive'
      });
    } finally {
      setLoadingBlueprints(false);
    }
  }, []);
  
  // Flag para evitar múltiplas execuções simultâneas da atualização de status
  const isUpdatingStatus = useRef(false);
  
  // Carregar tudo na montagem (com atualização de status primeiro)
  useEffect(() => {
    const initializeData = async () => {
      // 1. Atualizar status de transações vencidas ANTES de carregar dados
      // Sempre tenta atualizar no carregamento (não usa flag persistente)
      if (!isUpdatingStatus.current) {
        isUpdatingStatus.current = true;
        try {
          console.log('🔄 Verificando transações vencidas para atualizar...');
          const updated = await SupabaseFinancialTransactionsAdapter.updateStatusByDate();
          
          if (updated > 0) {
            console.log(`📅 ${updated} transações atualizadas para 'Faturado'`);
            toast({
              title: 'Transações atualizadas',
              description: `${updated} ${updated === 1 ? 'transação foi atualizada' : 'transações foram atualizadas'} para "Faturado".`,
            });
          } else {
            console.log('✅ Nenhuma transação vencida para atualizar');
          }
        } catch (error) {
          console.error('Erro ao atualizar status por data:', error);
        } finally {
          isUpdatingStatus.current = false;
        }
      }
      
      // 2. Carregar dados já atualizados
      await Promise.all([
        loadItems(),
        loadTransactions(),
        loadCards(),
        loadBlueprints()
      ]);
    };
    
    initializeData();
  }, [loadItems, loadTransactions, loadCards, loadBlueprints]);
  
  // Verificação periódica para transações que vencem enquanto app está aberto
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const updated = await SupabaseFinancialTransactionsAdapter.updateStatusByDate();
        
        if (updated > 0) {
          console.log(`📅 Verificação periódica: ${updated} transações atualizadas para 'Faturado'`);
          toast({
            title: 'Transações atualizadas',
            description: `${updated} ${updated === 1 ? 'transação venceu' : 'transações venceram'} e ${updated === 1 ? 'foi atualizada' : 'foram atualizadas'} para "Faturado".`,
          });
          // Recarregar para refletir mudanças
          loadTransactions();
        }
      } catch (error) {
        console.error('Erro na verificação periódica de status:', error);
      }
    }, STATUS_CHECK_INTERVAL_MS);
    
    return () => clearInterval(intervalId);
  }, [loadTransactions]);
  
  // ============= REALTIME SUBSCRIPTIONS =============
  
  // Canal compartilhado por tabela, filtrado por user_id e com debounce:
  // criar 24 parcelas = 1 refetch (antes: 24 refetches completos por aba).
  useEffect(() => {
    const offs = [
      onTableChange('fin_items_master', loadItems),
      onTableChange('fin_transactions', loadTransactions),
      onTableChange('fin_credit_cards', loadCards),
      onTableChange('fin_recurring_blueprints', loadBlueprints),
    ];
    return () => offs.forEach((off) => off());
  }, [loadItems, loadTransactions, loadCards, loadBlueprints]);
  
  // ============= CRUD - FINANCIAL ITEMS =============
  
  const adicionarItemFinanceiro = useCallback(async (nome: string, grupo: GrupoPrincipal) => {
    try {
      await SupabaseFinancialItemsAdapter.createItem(nome, grupo);
      // Realtime vai atualizar automaticamente
      toast({
        title: 'Item adicionado',
        description: `${nome} foi adicionado com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast({
        title: 'Erro ao adicionar item',
        description: 'Não foi possível adicionar o item financeiro.',
        variant: 'destructive'
      });
    }
  }, []);
  
  const atualizarItemFinanceiro = useCallback(async (id: string, updates: { nome?: string; ativo?: boolean }) => {
    try {
      await SupabaseFinancialItemsAdapter.updateItem(id, updates);
      // Realtime vai atualizar automaticamente
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast({
        title: 'Erro ao atualizar item',
        description: 'Não foi possível atualizar o item financeiro.',
        variant: 'destructive'
      });
    }
  }, []);
  
  const removerItemFinanceiro = useCallback(async (id: string) => {
    try {
      await SupabaseFinancialItemsAdapter.deleteItem(id);
      // Realtime vai atualizar automaticamente
      toast({
        title: 'Item removido',
        description: 'Item financeiro removido com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast({
        title: 'Erro ao remover item',
        description: 'Não foi possível remover o item financeiro.',
        variant: 'destructive'
      });
    }
  }, []);
  
  // ============= CRUD - TRANSACTIONS =============
  
  const criarTransacao = useCallback(async (transaction: Omit<FinancialTransactionDB, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      await SupabaseFinancialTransactionsAdapter.createTransaction(transaction);
      // Realtime vai atualizar automaticamente
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      toast({
        title: 'Erro ao criar transação',
        description: 'Não foi possível criar a transação.',
        variant: 'destructive'
      });
    }
  }, []);
  
  const criarTransacoes = useCallback(async (transactions: Array<Omit<FinancialTransactionDB, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      await SupabaseFinancialTransactionsAdapter.createMultipleTransactions(transactions);
      // Realtime vai atualizar automaticamente
    } catch (error) {
      console.error('Erro ao criar transações:', error);
      toast({
        title: 'Erro ao criar transações',
        description: 'Não foi possível criar as transações.',
        variant: 'destructive'
      });
    }
  }, []);
  
  const atualizarTransacao = useCallback(async (id: string, updates: Partial<FinancialTransactionDB>) => {
    try {
      await SupabaseFinancialTransactionsAdapter.updateTransaction(id, updates);
      // Realtime vai atualizar automaticamente
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      toast({
        title: 'Erro ao atualizar transação',
        description: 'Não foi possível atualizar a transação.',
        variant: 'destructive'
      });
    }
  }, []);
  
  const marcarComoPago = useCallback(async (id: string) => {
    try {
      await SupabaseFinancialTransactionsAdapter.markAsPaid(id);
      // Realtime vai atualizar automaticamente
      toast({
        title: 'Pagamento registrado',
        description: 'Transação marcada como paga.'
      });
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      toast({
        title: 'Erro ao marcar pagamento',
        description: 'Não foi possível registrar o pagamento.',
        variant: 'destructive'
      });
    }
  }, []);
  
  const removerTransacao = useCallback(async (id: string) => {
    try {
      await SupabaseFinancialTransactionsAdapter.deleteTransaction(id);
      // Realtime vai atualizar automaticamente
      toast({
        title: 'Transação removida',
        description: 'Transação removida com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao remover transação:', error);
      toast({
        title: 'Erro ao remover transação',
        description: 'Não foi possível remover a transação.',
        variant: 'destructive'
      });
    }
  }, []);
  
  // ============= CRUD - CREDIT CARDS =============
  
  const adicionarCartao = useCallback(async (nome: string, diaVencimento: number, diaFechamento: number) => {
    try {
      await SupabaseCreditCardsAdapter.createCard(nome, diaVencimento, diaFechamento);
      // Realtime vai atualizar automaticamente
      toast({
        title: 'Cartão adicionado',
        description: `${nome} foi adicionado com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao adicionar cartão:', error);
      toast({
        title: 'Erro ao adicionar cartão',
        description: 'Não foi possível adicionar o cartão de crédito.',
        variant: 'destructive'
      });
    }
  }, []);
  
  const atualizarCartao = useCallback(async (id: string, updates: Partial<Pick<CreditCardDB, 'nome' | 'dia_vencimento' | 'dia_fechamento' | 'ativo'>>) => {
    try {
      await SupabaseCreditCardsAdapter.updateCard(id, updates);
      // Realtime vai atualizar automaticamente
    } catch (error) {
      console.error('Erro ao atualizar cartão:', error);
      toast({
        title: 'Erro ao atualizar cartão',
        description: 'Não foi possível atualizar o cartão de crédito.',
        variant: 'destructive'
      });
    }
  }, []);
  
  const removerCartao = useCallback(async (id: string) => {
    try {
      await SupabaseCreditCardsAdapter.deleteCard(id);
      // Realtime vai atualizar automaticamente
      toast({
        title: 'Cartão removido',
        description: 'Cartão de crédito removido com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao remover cartão:', error);
      toast({
        title: 'Erro ao remover cartão',
        description: 'Não foi possível remover o cartão de crédito.',
        variant: 'destructive'
      });
    }
  }, []);
  
  // ============= CRUD - BLUEPRINTS =============
  
  const criarBlueprint = useCallback(async (blueprint: Omit<RecurringBlueprintDB, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      await SupabaseRecurringBlueprintsAdapter.createBlueprint(blueprint);
      // Realtime vai atualizar automaticamente
    } catch (error) {
      console.error('Erro ao criar blueprint:', error);
      toast({
        title: 'Erro ao criar despesa recorrente',
        description: 'Não foi possível criar o modelo de despesa recorrente.',
        variant: 'destructive'
      });
    }
  }, []);
  
  const atualizarBlueprint = useCallback(async (id: string, updates: Partial<RecurringBlueprintDB>) => {
    try {
      await SupabaseRecurringBlueprintsAdapter.updateBlueprint(id, updates);
      // Realtime vai atualizar automaticamente
    } catch (error) {
      console.error('Erro ao atualizar blueprint:', error);
      toast({
        title: 'Erro ao atualizar despesa recorrente',
        description: 'Não foi possível atualizar o modelo de despesa recorrente.',
        variant: 'destructive'
      });
    }
  }, []);
  
  const removerBlueprint = useCallback(async (id: string) => {
    try {
      await SupabaseRecurringBlueprintsAdapter.deleteBlueprint(id);
      // Realtime vai atualizar automaticamente
      toast({
        title: 'Despesa recorrente removida',
        description: 'Modelo de despesa recorrente removido com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao remover blueprint:', error);
      toast({
        title: 'Erro ao remover despesa recorrente',
        description: 'Não foi possível remover o modelo de despesa recorrente.',
        variant: 'destructive'
      });
    }
  }, []);
  
  // ============= REFETCH =============
  
  const refetch = useCallback(async () => {
    await Promise.all([
      loadItems(),
      loadTransactions(),
      loadCards(),
      loadBlueprints()
    ]);
  }, [loadItems, loadTransactions, loadCards, loadBlueprints]);
  
  // ============= RETURN =============
  
  return {
    // Data
    itensFinanceiros,
    transacoes,
    cartoes,
    blueprints,
    
    // Loading states
    loadingItems,
    loadingTransactions,
    loadingCards,
    loadingBlueprints,
    
    // CRUD - Financial Items
    adicionarItemFinanceiro,
    atualizarItemFinanceiro,
    removerItemFinanceiro,
    
    // CRUD - Transactions
    criarTransacao,
    criarTransacoes,
    atualizarTransacao,
    marcarComoPago,
    removerTransacao,
    
    // CRUD - Credit Cards
    adicionarCartao,
    atualizarCartao,
    removerCartao,
    
    // CRUD - Blueprints
    criarBlueprint,
    atualizarBlueprint,
    removerBlueprint,
    
    // Utilities
    refetch
  };
}
