import re
import os

file_path = 'src/components/conversas/context/ChatContextPanel.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { useCategorias } from '@/hooks/useCategorias'; from '@/hooks/useLeads';", "import { useCategorias } from '@/hooks/useCategorias';")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Corrigido import.')
