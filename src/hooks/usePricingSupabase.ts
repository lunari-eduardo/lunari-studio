/**
 * Hook for managing pricing data with Supabase integration
 * Provides real-time updates and automatic migration
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PricingConfigurationService } from '@/services/PricingConfigurationService';
import { pricingMigrationService } from '@/services/PricingMigrationService';
import { toast } from 'sonner';
import type { ConfiguracaoPrecificacao, TabelaPrecos } from '@/types/pricing';
import { getUserLocal } from '@/lib/auth/getUserLocal';

export function usePricingSupabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [configuration, setConfiguration] = useState<ConfiguracaoPrecificacao>({ modelo: 'fixo' });
  const [globalTable, setGlobalTable] = useState<TabelaPrecos | null>(null);

  // Initialize Supabase adapter and handle migration
  const initializeSystem = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check authentication
      const { data: user } = await getUserLocal();
      if (!user.user) {
        console.log('❌ User not authenticated, using local storage');
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }

      // Initialize Supabase adapter
      await PricingConfigurationService.initializeSupabaseAdapter();

      // Handle migration if needed
      if (pricingMigrationService.isMigrationNeeded()) {
        console.log('🔄 Migration needed, starting automatic migration...');
        const migrationSuccess = await pricingMigrationService.executeMigration();
        
        if (migrationSuccess) {
          console.log('✅ Migration completed successfully');
          // Clean up local data after successful migration
          setTimeout(() => {
            pricingMigrationService.cleanupLocalData();
          }, 5000);
        } else {
          console.error('❌ Migration failed, falling back to localStorage');
          setIsInitialized(true);
          setIsLoading(false);
          return;
        }
      }

      // Load initial data from Supabase
      await loadInitialData();
      
      setIsInitialized(true);
      console.log('✅ Pricing Supabase system initialized');
    } catch (error) {
      console.error('❌ Error initializing pricing Supabase system:', error);
      toast.error('Erro ao conectar com o banco de dados. Usando dados locais.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load initial data from Supabase
  const loadInitialData = useCallback(async () => {
    try {
      const adapter = PricingConfigurationService['adapter'];
      
      if (adapter && 'loadConfigurationAsync' in adapter) {
        // Load configuration
        const config = await (adapter as any).loadConfigurationAsync();
        setConfiguration(config);

        // Load global table
        const table = await (adapter as any).loadGlobalTableAsync();
        setGlobalTable(table);
      }
    } catch (error) {
      console.error('Error loading initial pricing data:', error);
    }
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    if (!isInitialized) return;

    const setupRealtimeListeners = async () => {
      const { data: user } = await getUserLocal();
      if (!user.user) return;

      // Listen to configuration changes
      const modeloChannel = supabase
        .channel('pricing-modelo-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'modelo_de_preco',
            filter: `user_id=eq.${user.user.id}`
          },
          async (payload) => {
            console.log('🔄 Pricing model changed:', payload);
            await loadInitialData();
            toast.success('Configuração de preços atualizada!');
          }
        )
        .subscribe();

      // Listen to pricing tables changes
      const tabelasChannel = supabase
        .channel('pricing-tables-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tabelas_precos',
            filter: `user_id=eq.${user.user.id}`
          },
          async (payload) => {
            console.log('🔄 Pricing table changed:', payload);
            await loadInitialData();
            toast.success('Tabela de preços atualizada!');
          }
        )
        .subscribe();

      // Cleanup on unmount
      return () => {
        supabase.removeChannel(modeloChannel);
        supabase.removeChannel(tabelasChannel);
      };
    };

    const cleanup = setupRealtimeListeners();
    
    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [isInitialized, loadInitialData]);

  // Initialize on mount
  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  // Utility functions
  const refreshData = useCallback(async () => {
    if (isInitialized) {
      await loadInitialData();
    }
  }, [isInitialized, loadInitialData]);

  const resetMigration = useCallback(() => {
    pricingMigrationService.resetMigrationStatus();
    toast.success('Status de migração resetado. Recarregue a página.');
  }, []);

  return {
    isInitialized,
    isLoading,
    configuration,
    globalTable,
    refreshData,
    resetMigration,
    migrationService: pricingMigrationService
  };
}