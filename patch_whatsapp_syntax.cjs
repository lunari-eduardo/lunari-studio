const fs = require('fs');
let content = fs.readFileSync('src/components/workflow/row/SessionClientCell.tsx', 'utf-8');

content = content.replace(
  /const whatsappUrl = whatsapp \? `https:\/\/wa\.me\/55\$\(\$\{whatsapp\.replace\(\/\\D\/g, ''\)\}\)` : null;/,
  "const whatsappUrl = whatsapp ? `https://wa.me/55${whatsapp.replace(/\\D/g, '')}` : null;"
);

// I might have missed the exact string. Let's just do a manual replace of the line.
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const whatsappUrl = whatsapp ?')) {
    lines[i] = "  const whatsappUrl = whatsapp ? `https://wa.me/55${whatsapp.replace(/\\D/g, '')}` : null;";
  }
}

fs.writeFileSync('src/components/workflow/row/SessionClientCell.tsx', lines.join('\n'));
