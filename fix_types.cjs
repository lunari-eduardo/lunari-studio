const fs = require('fs');
const json = JSON.parse(fs.readFileSync('C:/Users/Eduardo/.gemini/antigravity/brain/9503e9a0-988c-4bad-a6c1-c6cae4035ef4/.system_generated/steps/401/output.txt', 'utf8'));
fs.writeFileSync('D:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/integrations/supabase/types.ts', json.types, 'utf8');
console.log('Types fixed');
