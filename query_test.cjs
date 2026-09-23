const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
let SUPABASE_URL = '', SUPABASE_ANON_KEY = '';
for (const line of env.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim().replace(/\"/g, '');
  if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) SUPABASE_ANON_KEY = line.split('=')[1].trim().replace(/\"/g, '');
}
import('@supabase/supabase-js').then(({ createClient }) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  supabase.from('cobrancas').select('id, valor, status, provedor, mp_payment_id, provider_transaction_id').eq('provedor', 'mercadopago').order('created_at', { ascending: false }).limit(5).then(res => console.log(JSON.stringify(res.data, null, 2)));
});
