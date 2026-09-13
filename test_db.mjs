import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('conversas_chats').select('contato_phone_normalized, unread_count, ultima_mensagem, status');
  console.log(data?.filter(c => c.contato_phone_normalized === '5551998287948'));
}
run();
