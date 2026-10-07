import re

path = r"d:\Users\Eduardo\Documents\00- LUNARI\00- Antigravity\lunari-studio\src\pages\Leads.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace UnderlineTabs to standard Tabs
content = re.sub(
    r'<UnderlineTabs defaultValue="ativos" className="flex flex-col w-full">.*?(<UnifiedLeadFilters.*?)</div>\s*</div>',
    r'''<Tabs defaultValue="ativos" className="flex flex-col w-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <TabsList className="flex items-center gap-2 bg-transparent border-none p-0 h-auto w-full lg:w-auto overflow-x-auto no-scrollbar justify-start">
              <TabsTrigger value="ativos" className="group h-9 px-3 rounded-md border border-input bg-background shadow-sm data-[state=active]:border-accent-gold data-[state=active]:bg-accent-gold/10 data-[state=active]:text-accent-gold text-muted-foreground hover:text-foreground transition-all">
                <Filter className="mr-2 h-4 w-4" /> Funil
                <span className="ml-2 bg-muted text-muted-foreground group-data-[state=active]:bg-accent-gold group-data-[state=active]:text-white px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-colors">
                  {ativosCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="ganhos" className="group h-9 px-3 rounded-md border border-input bg-background shadow-sm data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-500 text-muted-foreground hover:text-foreground transition-all">
                <CheckCircle className="mr-2 h-4 w-4" /> Ganhos
                <span className="ml-2 bg-muted text-muted-foreground group-data-[state=active]:bg-emerald-500 group-data-[state=active]:text-white px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-colors">
                  {ganhosCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="perdidos" className="group h-9 px-3 rounded-md border border-input bg-background shadow-sm data-[state=active]:border-destructive data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive text-muted-foreground hover:text-foreground transition-all">
                <XCircle className="mr-2 h-4 w-4" /> Perdidos
                <span className="ml-2 bg-muted text-muted-foreground group-data-[state=active]:bg-destructive group-data-[state=active]:text-white px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-colors">
                  {perdidosCount}
                </span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 lg:max-w-xl xl:max-w-3xl">
              \1</div>
          </div>''',
    content,
    flags=re.DOTALL
)

content = content.replace("UnderlineTabsContent", "TabsContent")
content = content.replace("</UnderlineTabs>", "</Tabs>")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
