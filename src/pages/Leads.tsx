import { useState, useMemo } from "react";
import LeadsKanban from "@/components/leads/LeadsKanban";
import LeadMetricsCards from "@/components/leads/LeadMetricsCards";
import UnifiedLeadFilters from "@/components/leads/UnifiedLeadFilters";
import LeadHistoryGrid from "@/components/leads/LeadHistoryGrid";
import { useAppContext } from "@/contexts/AppContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronDown, ChevronUp, Filter, CheckCircle, XCircle, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { PeriodFilter, PeriodType } from "@/hooks/useLeadMetrics";
import { useLeads } from "@/hooks/useLeads";
import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { convertPeriodTypeToFilter, filterLeadsByPeriod, sortLeadsByLastModified, shouldLeadBeInHistory } from "@/utils/leadFilters";

export default function Leads() {
  const { origens } = useAppContext();
  const isMobile = useIsMobile();
  const { leads } = useLeads();
  const { statuses } = useLeadStatuses();

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>({
    periodType: "last_60_days",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [originFilter, setOriginFilter] = useState("all");
  const [showMetrics, setShowMetrics] = useState(true);
  const [kanbanCreateOpen, setKanbanCreateOpen] = useState(false);
  const [kanbanConfigOpen, setKanbanConfigOpen] = useState(false);

  const handlePeriodChange = (periodType: PeriodType) => {
    setPeriodFilter({ periodType });
  };

  const { ativosCount, ganhosCount, perdidosCount, ganhosList, perdidosList } = useMemo(() => {
    const searched = leads.filter((lead) => {
      const matchesSearch =
        !searchTerm.trim() ||
        lead.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.telefone?.includes(searchTerm);
      const matchesOrigem = originFilter === "all" || lead.origem === originFilter;
      return matchesSearch && matchesOrigem;
    });

    const filterObj = convertPeriodTypeToFilter(periodFilter.periodType);
    const filteredByPeriod = filterLeadsByPeriod(searched, filterObj, statuses);

    const active: any[] = [];
    const ganhos: any[] = [];
    const perdidos: any[] = [];

    filteredByPeriod.forEach(lead => {
      const shouldBeInHistory = shouldLeadBeInHistory(lead, statuses);
      if (!shouldBeInHistory) {
        active.push(lead);
      } else {
        const statusDef = statuses.find(s => s.key === lead.status);
        const isGanho = statusDef ? statusDef.isConverted : lead.status === 'fechado' || lead.status === 'ganho';
        if (isGanho) {
          ganhos.push(lead);
        } else {
          perdidos.push(lead);
        }
      }
    });

    return {
      ativosCount: active.length,
      ganhosCount: ganhos.length,
      perdidosCount: perdidos.length,
      ganhosList: sortLeadsByLastModified(ganhos),
      perdidosList: sortLeadsByLastModified(perdidos),
    };
  }, [leads, searchTerm, originFilter, periodFilter, statuses]);

  return (
    <div className="w-full px-4 md:px-6 h-[calc(100vh-4rem)] flex flex-col">
      <div
        className={cn(
          "flex-shrink-0 transition-all duration-300",
          isMobile ? "pt-2 pb-1" : "pt-3",
        )}
      >
        {/* Header da página com subtítulo de pipeline */}
        <div className={cn("flex items-center justify-between mb-4", isMobile ? "mb-2" : "")}>
          <div>
            <h1 className={cn("font-medium text-foreground tracking-tight", isMobile ? "text-base" : "text-xl")}>
              Leads
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {ativosCount} {ativosCount === 1 ? "lead" : "leads"} no pipeline
            </p>
          </div>

          {/* Botão de métricas */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMetrics(!showMetrics)}
            className="h-8 px-2 text-muted-foreground hover:text-foreground transition-colors bg-muted/20 hover:bg-muted/40"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline-block ml-2 text-xs font-medium">
              {showMetrics ? "Ocultar Métricas" : "Mostrar Métricas"}
            </span>
            {showMetrics ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-start gap-4 mb-4">
          {(!isMobile || showMetrics) && showMetrics && (
            <div className="flex-1 min-w-0 transition-all duration-300 animate-in slide-in-from-top-2">
              <LeadMetricsCards periodFilter={periodFilter} isMobile={isMobile} isCollapsed={isMobile && !showMetrics} />
            </div>
          )}
        </div>

        <Tabs defaultValue="ativos" className="flex flex-col w-full">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-4">
            <TabsList className="flex items-center gap-2 bg-transparent border-none p-0 py-1 h-auto w-full xl:w-auto overflow-x-auto no-scrollbar justify-start">
              <TabsTrigger value="ativos" className="group h-9 px-3.5 rounded-full border border-border/50 bg-background shadow-sm data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 text-muted-foreground hover:text-foreground transition-all text-[13px]">
                <Filter className="mr-2 h-3.5 w-3.5" /> Funil
                <span className="ml-2 bg-muted text-muted-foreground group-data-[state=active]:bg-blue-500 group-data-[state=active]:text-white px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors">
                  {ativosCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="ganhos" className="group h-9 px-3.5 rounded-full border border-border/50 bg-background shadow-sm data-[state=active]:border-emerald-200 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600 text-muted-foreground hover:text-foreground transition-all text-[13px]">
                <CheckCircle className="mr-2 h-3.5 w-3.5 group-data-[state=inactive]:text-emerald-500" /> Ganhos
                <span className="ml-2 bg-muted text-muted-foreground group-data-[state=active]:bg-emerald-500 group-data-[state=active]:text-white px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors">
                  {ganhosCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="perdidos" className="group h-9 px-3.5 rounded-full border border-border/50 bg-background shadow-sm data-[state=active]:border-red-200 data-[state=active]:bg-red-50 data-[state=active]:text-red-600 text-muted-foreground hover:text-foreground transition-all text-[13px]">
                <XCircle className="mr-2 h-3.5 w-3.5 group-data-[state=inactive]:text-red-500" /> Perdidos
                <span className="ml-2 bg-muted text-muted-foreground group-data-[state=active]:bg-red-500 group-data-[state=active]:text-white px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors">
                  {perdidosCount}
                </span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 xl:max-w-4xl pb-1">
              <div className="flex-1 min-w-0">
                <UnifiedLeadFilters
                  periodType={periodFilter.periodType}
                  onPeriodChange={handlePeriodChange}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  originFilter={originFilter}
                  onOriginChange={setOriginFilter}
                  origins={origens}
                  isMobile={isMobile}
                />
              </div>
              
              <div className="flex items-center gap-2 mt-2 sm:mt-0 justify-end flex-shrink-0">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setKanbanConfigOpen(true)}
                  title="Configurar Follow-up"
                  className="h-9 w-9 rounded-full bg-background border border-border/50 shadow-sm text-muted-foreground hover:text-foreground transition-all"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setKanbanCreateOpen(true)}
                  className="h-9 px-4 gap-1.5 text-[13px] font-semibold shadow-sm bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-lunar-accent dark:text-zinc-900 dark:hover:bg-[#C5A028] rounded-full transition-all"
                >
                  + {isMobile ? "Novo" : "Novo Lead"}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="h-[calc(100vh-14rem)] lg:h-[calc(100vh-12rem)] flex flex-col">
            <TabsContent value="ativos" className="flex-1 overflow-hidden min-h-0 m-0 p-0 outline-none">
              <LeadsKanban
                periodFilter={periodFilter}
                searchTerm={searchTerm}
                originFilter={originFilter}
                isMobile={isMobile}
                hideHeader={true}
                createModalOpen={kanbanCreateOpen}
                setCreateModalOpen={setKanbanCreateOpen}
                configModalOpen={kanbanConfigOpen}
                setConfigModalOpen={setKanbanConfigOpen}
              />
            </TabsContent>
            
            <TabsContent value="ganhos" className="flex-1 overflow-y-auto min-h-0 m-0 p-0 outline-none custom-scrollbar">
              <LeadHistoryGrid leads={ganhosList} />
            </TabsContent>
            
            <TabsContent value="perdidos" className="flex-1 overflow-y-auto min-h-0 m-0 p-0 outline-none custom-scrollbar">
              <LeadHistoryGrid leads={perdidosList} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
