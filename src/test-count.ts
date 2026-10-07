import { supabase } from '@/integrations/supabase/client';

export async function testCount() {
  const { data, count, error } = await supabase.from('v_crm_clientes_resumo').select('*', { count: 'estimated', head: true });
  console.log('Estimated count:', count, error);
}
