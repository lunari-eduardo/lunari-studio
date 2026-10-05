import sys

with open('D:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/utils/leadFilters.ts', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r'console\.warn.*', 'console.warn(\"%s\", \"[LeadFilters] Data inválida para lead \" + lead.id);', content)

with open('D:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/utils/leadFilters.ts', 'w', encoding='utf-8') as f:
    f.write(content)
