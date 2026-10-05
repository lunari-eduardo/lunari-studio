
const fs = require('fs');
let content = fs.readFileSync('src/components/conversas/chat/ChatListSidebar.tsx', 'utf8');
content = content.replace(
  '<div className=\"px-3 pb-2 flex items-center gap-1.5 min-w-0\">',
  '<div className=\"px-3 pb-2 flex items-center gap-1.5 w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]\">'
);
// Fix the ChatListItem missing prop
content = content.replace(
  'leadStatus={getLeadStatusForChat(c)}',
  'leadStatus={getLeadStatusForChat(c)}\n                todasEtiquetas={etiquetas}'
);
fs.writeFileSync('src/components/conversas/chat/ChatListSidebar.tsx', content, 'utf8');

