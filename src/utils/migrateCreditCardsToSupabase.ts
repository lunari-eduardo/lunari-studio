/**
 * Função de migração única para mover cartões de crédito do localStorage para Supabase
 */

import { storage, STORAGE_KEYS } from '@/utils/localStorage';
import { SupabaseCreditCardsAdapter } from '@/adapters/SupabaseCreditCardsAdapter';

export async function migrateCreditCardsToSupabase(): Promise<{
  success: boolean;
  migrated: number;
  errors: number;
}> {
  try {
    console.log('🔄 Iniciando migração de cartões para Supabase...');
    
    // Buscar cartões do localStorage
    const localCards = storage.load(STORAGE_KEYS.CARDS, []);
    
    if (!localCards || localCards.length === 0) {
      console.log('✅ Nenhum cartão para migrar');
      return { success: true, migrated: 0, errors: 0 };
    }

    console.log(`📋 Encontrados ${localCards.length} cartões no localStorage`);

    let migrated = 0;
    let errors = 0;

    // Migrar cada cartão
    for (const card of localCards) {
      try {
        await SupabaseCreditCardsAdapter.createCard(
          card.nome,
          card.diaVencimento,
          card.diaFechamento
        );
        migrated++;
        console.log(`✅ Cartão migrado: ${card.nome}`);
      } catch (error) {
        errors++;
        console.error("%s", `❌ Erro ao migrar cartão ${card.nome}:`, error);
      }
    }

    // SEMPRE limpar localStorage após tentativa de migração
    // (melhor perder 1 cartão do que duplicar infinitamente)
    storage.remove(STORAGE_KEYS.CARDS);
    console.log('🗑️ localStorage limpo após tentativa de migração (prevenção de loop)');

    console.log(`✅ Migração concluída: ${migrated} sucesso, ${errors} erros`);

    return {
      success: errors === 0,
      migrated,
      errors
    };
  } catch (error) {
    console.error('❌ Erro fatal na migração:', error);
    return {
      success: false,
      migrated: 0,
      errors: 1
    };
  }
}
