import sys
with open('D:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/components/leads/LeadsKanban.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# 1. Add import
if 'shouldLeadBeInHistory' not in content:
    content = content.replace('import { convertPeriodTypeToFilter, filterLeadsByPeriod } from "@/utils/leadFilters";', 'import { convertPeriodTypeToFilter, filterLeadsByPeriod, shouldLeadBeInHistory } from "@/utils/leadFilters";')

# 2. Fix filtered
content = re.sub(
    r'return filtered\.filter\(lead => \{\s*const statusDef = statuses\.find\(s => s\.key === lead\.status\);\s*if \(\!statusDef\) return true;\s*return \!statusDef\.isConverted && \!statusDef\.isLost;\s*\}\);',
    'return filtered.filter(lead => { return !shouldLeadBeInHistory(lead, statuses); });',
    content,
    flags=re.MULTILINE
)

# 3. Fix grouped
content = re.sub(
    r'activeStatuses\.forEach\(\(s\) => \{',
    'statuses.forEach((s) => {',
    content
)
content = content.replace('[filteredLeads, activeStatuses]', '[filteredLeads, statuses]')

# 4. Fix map
content = content.replace('{activeStatuses.map((status) => (', '{statuses.map((status) => (')

# 5. Fix moveToHistory action
if 'handleMoveToHistory' not in content:
    content = content.replace('const handleStatusChange = (lead: Lead, newStatus: string) => {', 'const handleMoveToHistory = (lead: Lead) => {\n    updateLead(lead.id, {\n      arquivado: true,\n      statusTimestamp: new Date().toISOString(),\n    });\n    toast({\n      title: "Movido para Histórico",\n      description: `${lead.nome} foi movido para o histórico.`,\n    });\n  };\n\n  const handleStatusChange = (lead: Lead, newStatus: string) => {')

    content = content.replace('onViewAppointment={() => {', 'onMoveToHistory={() => handleMoveToHistory(lead)}\n              onViewAppointment={() => {')

with open('D:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/components/leads/LeadsKanban.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
