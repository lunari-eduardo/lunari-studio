import re
import os

file_path = 'src/components/conversas/context/ChatContextPanel.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add useCategorias import
if "import { useCategorias }" not in content:
    content = content.replace("import { useLeads }", "import { useLeads } from '@/hooks/useLeads';\nimport { useCategorias } from '@/hooks/useCategorias';")

# Replace hook usage and template context
hook_start_str = "const { atualizarCliente } = useClientesRealtime();"
if hook_start_str in content:
    hook_add = hook_start_str + "\n  const { categorias } = useCategorias();\n  const categoryNames = (categorias || []).map(c => c.nome);\n  const commercialIntent = useCommercialIntent(messages, categoryNames);"
    content = content.replace(hook_start_str, hook_add)

# Find TemplatesListTab and replace suggestedCategory
old_template_tab = "suggestedCategory={templateContext.category}"
if old_template_tab in content:
    new_template_tab = "suggestedCategory={commercialIntent.detected && commercialIntent.service ? commercialIntent.service : templateContext.category}"
    content = content.replace(old_template_tab, new_template_tab)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('ChatContextPanel.tsx modificado com sucesso.')
