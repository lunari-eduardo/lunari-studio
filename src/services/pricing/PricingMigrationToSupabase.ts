/**
 * Serviço de Migração de localStorage para Supabase
 * Executa migração one-time dos dados de precificação
 */

import { supabase } from '@/integrations/supabase/client';
import { storage, STORAGE_KEYS } from '@/utils/localStorage';
import type { EstruturaCustosFixos, PadraoHoras, MetasPrecificacao, EstadoCalculadora } from '@/types/precificacao';

const MIGRATION_KEY = 'lunari_pricing_supabase_migrated_v2';

export class PricingMigrationToSupabase {
  
  static async needsMigration(): Promise<boolean> {
    try {
      // Verificar se já migrou
      const migrated = localStorage.getItem(MIGRATION_KEY);
      if (migrated === 'true') return false;
      
      // Verificar se há dados no localStorage para migrar
      const hasLocalData = this.hasLocalStorageData();
      if (!hasLocalData) {
        localStorage.setItem(MIGRATION_KEY, 'true');
        return false;
      }
      
      // Verificar se usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      // Verificar se já tem dados no Supabase
      const { data: supabaseData } = await supabase
        .from('pricing_configuracoes')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // Se já tem dados no Supabase, não precisa migrar
      if (supabaseData) {
        localStorage.setItem(MIGRATION_KEY, 'true');
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('Erro ao verificar necessidade de migração:', error);
      return false;
    }
  }
  
  private static hasLocalStorageData(): boolean {
    const keys = [
      STORAGE_KEYS.PRICING_FIXED_COSTS,
      STORAGE_KEYS.PRICING_HOUR_DEFAULTS,
      STORAGE_KEYS.PRICING_GOALS,
      STORAGE_KEYS.PRICING_CALCULATOR_STATE
    ];
    
    return keys.some(key => {
      try {
        const data = localStorage.getItem(key);
        return data && data !== 'null' && data !== '{}' && data !== '[]';
      } catch {
        return false;
      }
    });
  }
  
  static async executeMigration(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Iniciando migração de pricing para Supabase...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, message: 'Usuário não autenticado' };
      }
      
      const userId = user.id;
      
      // 1. Migrar estrutura de custos
      await this.migrateEstruturaCustos(userId);
      
      // 2. Migrar padrão de horas e metas (para pricing_configuracoes)
      await this.migrateConfiguracoes(userId);
      
      // 3. Migrar estado da calculadora
      await this.migrateCalculadora(userId);
      
      // Marcar como migrado
      localStorage.setItem(MIGRATION_KEY, 'true');
      
      console.log('✅ Migração concluída com sucesso!');
      return { success: true, message: 'Dados migrados com sucesso para Supabase' };
      
    } catch (error) {
      console.error('❌ Erro na migração:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro desconhecido na migração' 
      };
    }
  }
  
  private static async migrateEstruturaCustos(userId: string): Promise<void> {
    const localData = storage.load<EstruturaCustosFixos>(STORAGE_KEYS.PRICING_FIXED_COSTS, null);
    if (!localData) return;
    
    console.log('  📦 Migrando estrutura de custos...');
    
    // Migrar gastos pessoais
    if (localData.gastosPessoais?.length > 0) {
      for (const gasto of localData.gastosPessoais) {
        await supabase.from('pricing_gastos_pessoais').insert({
          id: gasto.id,
          user_id: userId,
          descricao: gasto.descricao,
          valor: gasto.valor
        });
      }
      console.log(`    ✓ ${localData.gastosPessoais.length} gastos pessoais migrados`);
    }
    
    // Migrar custos de estúdio
    if (localData.custosEstudio?.length > 0) {
      for (const custo of localData.custosEstudio) {
        await supabase.from('pricing_custos_estudio').insert({
          id: custo.id,
          user_id: userId,
          descricao: custo.descricao,
          valor: custo.valor,
          origem: 'manual'
        });
      }
      console.log(`    ✓ ${localData.custosEstudio.length} custos de estúdio migrados`);
    }
    
    // Migrar equipamentos
    if (localData.equipamentos?.length > 0) {
      for (const eq of localData.equipamentos) {
        await supabase.from('pricing_equipamentos').insert({
          id: eq.id,
          user_id: userId,
          nome: eq.nome,
          valor_pago: eq.valorPago,
          data_compra: eq.dataCompra || new Date().toISOString().split('T')[0],
          vida_util: eq.vidaUtil || 5
        });
      }
      console.log(`    ✓ ${localData.equipamentos.length} equipamentos migrados`);
    }
  }
  
  private static async migrateConfiguracoes(userId: string): Promise<void> {
    const estrutura = storage.load<EstruturaCustosFixos>(STORAGE_KEYS.PRICING_FIXED_COSTS, null);
    const horas = storage.load<PadraoHoras>(STORAGE_KEYS.PRICING_HOUR_DEFAULTS, null);
    const metas = storage.load<MetasPrecificacao>(STORAGE_KEYS.PRICING_GOALS, null);
    
    console.log('  ⚙️ Migrando configurações...');
    
    const config = {
      user_id: userId,
      percentual_pro_labore: estrutura?.percentualProLabore || 30,
      horas_disponiveis: horas?.horasDisponiveis || 8,
      dias_trabalhados: horas?.diasTrabalhados || 5,
      margem_lucro_desejada: metas?.margemLucroDesejada || 30,
      ano_meta: metas?.ano || new Date().getFullYear(),
      meta_faturamento_anual: metas?.metaFaturamentoAnual || 0,
      meta_lucro_anual: metas?.metaLucroAnual || 0
    };
    
    await supabase.from('pricing_configuracoes').upsert(config, { onConflict: 'user_id' });
    console.log('    ✓ Configurações migradas');
  }
  
  private static async migrateCalculadora(userId: string): Promise<void> {
    const calculadora = storage.load<EstadoCalculadora>(STORAGE_KEYS.PRICING_CALCULATOR_STATE, null);
    if (!calculadora) return;
    
    console.log('  🧮 Migrando estado da calculadora...');
    
    const insertData = {
      user_id: userId,
      nome: calculadora.nome || 'Estado migrado',
      horas_estimadas: calculadora.horasEstimadas || 0,
      markup: calculadora.markup || 2,
      produtos: JSON.stringify(calculadora.produtos || []),
      custos_extras: JSON.stringify(calculadora.custosExtras || []),
      custo_total_calculado: calculadora.custoTotalCalculado || 0,
      preco_final_calculado: calculadora.precoFinalCalculado || 0,
      lucratividade: calculadora.lucratividade || 0,
      is_default: true
    };
    
    await supabase.from('pricing_calculadora_estados').insert(insertData);
    
    console.log('    ✓ Estado da calculadora migrado');
  }
  
  static async clearLocalStorageAfterMigration(): Promise<void> {
    console.log('🧹 Limpando localStorage após migração...');
    
    const keysToRemove = [
      STORAGE_KEYS.PRICING_FIXED_COSTS,
      STORAGE_KEYS.PRICING_HOUR_DEFAULTS,
      STORAGE_KEYS.PRICING_GOALS,
      STORAGE_KEYS.PRICING_CALCULATOR_STATE
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn("%s", `Não foi possível remover ${key}:`, e);
      }
    });
    
    console.log('✓ localStorage de pricing limpo');
  }
}
