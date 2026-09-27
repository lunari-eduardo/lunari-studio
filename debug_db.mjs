import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/SUPABASE_URL="?([^"\n]+)"?/);
const keyMatch = env.match(/SUPABASE_PUBLISHABLE_KEY="?([^"\n]+)"?/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: clients } = await supabase.from('clientes').select('id, nome, telefone').ilike('nome', '%Vitória%');
  console.log('Clientes:', clients);
}
run();
