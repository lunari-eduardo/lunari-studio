import re
with open('d:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/components/conversas/context/cards/RelationshipSummaryCard.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("state === 'LEAD'", "state === 'OPEN_OPPORTUNITY'")

button_html = """        <div className="rounded-xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/10 to-transparent p-3 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#D4AF37]" />
              <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">Oportunidade de Venda</span>
            </div>
          </div>
          <Button onClick={onCreateLead} className="w-full h-9 text-[11px] font-semibold bg-[#C9A87C] hover:bg-[#b89567] text-white rounded-lg shadow-sm transition-all">
            <Target className="h-3.5 w-3.5 mr-1.5" />
            Iniciar Nova Negociação
          </Button>
        </div>"""

find_client = """      return (
        <div className="flex flex-col gap-2">
          <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">"""

replace_client = f"""      return (
        <div className="flex flex-col gap-2">
{button_html}
          <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1A1A1A] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">"""

text = text.replace(find_client, replace_client)

with open('d:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/components/conversas/context/cards/RelationshipSummaryCard.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Phase 3 - RelationshipSummaryCard Refactored")
