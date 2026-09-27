import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente locais
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runReconciliation() {
  console.log('🔄 Iniciando rotina de reconciliação histórica de Contatos e Clientes...\n');

  try {
    // Chama a RPC criada na migração da Fase 3
    // Passamos p_user_id como null para varrer o banco inteiro de todos os fotógrafos
    const { data, error } = await supabase.rpc('reconcile_all_clientes_contacts', {
      p_user_id: null
    });

    if (error) {
      throw error;
    }

    console.log('✅ Reconciliação concluída com sucesso!\n');
    console.log('📊 Resultados:');
    console.log(`- Contatos órfãos vinculados com sucesso: ${data.linked_orphans}`);
    console.log(`- Contatos ignorados por ambiguidade (mais de 1 cliente com o mesmo número): ${data.ambiguous_skipped}`);
    console.log(`- Clientes forçados a tentar sincronização reversa: ${data.forced_crm_sync}`);
    
  } catch (err) {
    console.error('❌ Erro ao executar reconciliação:', err.message);
  }
}

runReconciliation();
