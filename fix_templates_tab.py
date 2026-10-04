import os

file_path = 'src/components/conversas/templates/TemplatesListTab.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("          Sugestões de mensagens", "          Templates")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Modificado TemplatesListTab.tsx')
