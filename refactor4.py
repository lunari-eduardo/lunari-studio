import re
with open('d:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/components/conversas/context/cards/SessionHistoryList.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_statement = "import { useState } from 'react';\nimport { CalendarDays, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';"

text = re.sub(r"import { CalendarDays, ExternalLink } from 'lucide-react';", import_statement, text)

# add useState
state_hook = """export function SessionHistoryList({ sessoes, onOpenWorkflow }: SessionHistoryListProps) {
  const [isOpen, setIsOpen] = useState(false);
"""
text = text.replace("export function SessionHistoryList({ sessoes, onOpenWorkflow }: SessionHistoryListProps) {", state_hook)

header = """    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between outline-none"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
            Histórico de Trabalhos ({sessoes.length})
          </span>
        </div>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
      </button>
      
      {isOpen && (
        <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">"""

text = re.sub(r'<div className="rounded-xl border.*?<div className="flex items-center gap-2 mb-3">.*?</span>\s*</div>', header, text, flags=re.DOTALL)

# Add closing div
text = text.replace('    </div>\n  );\n}', '        </div>\n      )}\n    </div>\n  );\n}')

with open('d:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/components/conversas/context/cards/SessionHistoryList.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Phase 4 - Accordion added")
