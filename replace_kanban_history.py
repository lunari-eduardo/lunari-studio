import sys

with open('D:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/components/leads/LeadsKanban.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const handleStatusChange = (lead: Lead, newStatus: string) => {', 'const handleMoveToHistory = (lead: Lead) => {\n    updateLead(lead.id, {\n      arquivado: true,\n      statusTimestamp: new Date().toISOString(),\n    });\n    toast({\n      title: "Movido para Histórico",\n      description: ${lead.nome} foi movido para o histórico.,\n    });\n  };\n\n  const handleStatusChange = (lead: Lead, newStatus: string) => {')

content = content.replace('onViewAppointment={() => {', 'onMoveToHistory={() => handleMoveToHistory(lead)}\n              onViewAppointment={() => {')

with open('D:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/components/leads/LeadsKanban.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
