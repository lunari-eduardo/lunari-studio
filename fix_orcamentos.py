import sys

with open('src/components/conversas/context/ChatContextPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("cobrancas,\n    vincularAmbos,", "cobrancas,\n    orcamentos,\n    vincularAmbos,")

with open('src/components/conversas/context/ChatContextPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
