import { useState, useMemo } from "react";
import LeadsKanban from "@/components/leads/LeadsKanban";
import LeadMetricsCards from "@/components/leads/LeadMetricsCards";
import UnifiedLeadFilters from "@/components/leads/UnifiedLeadFilters";
import LeadHistoryGrid from "@/components/leads/LeadHistoryGrid";
import { useAppContext } from "@/contexts/AppContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
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
  const [showMetrics, setShowMetrics] = useState(!isMobile);
  const [kanbanCreateOpen, setKanbanCreateOpen] = useState(false);

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
    <div className="h-[calc(100vh-4rem)] flex flex-col pl-2 md:pl-4">
      <div
        className={cn(
          "flex-shrink-0 px-2 transition-all duration-300",
          isMobile ? "pt-2 pb-1" : "pt-3",
        )}
      >
        {/* Header da página com subtítulo de pipeline */}
        <div className={cn("flex items-center justify-between mb-3", isMobile ? "mb-2" : "")}>
          <div>
            <h1 className={cn("font-semibold text-lunar-text tracking-tight", isMobile ? "text-base" : "text-lg")}>
              Leads
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {ativosCount} {ativosCount === 1 ? "lead" : "leads"} no pipeline
            </p>
          </div>

          {/* Botão de métricas (apenas mobile) */}
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMetrics(!showMetrics)}
              className="h-8 px-2 text-muted-foreground"
            >
              <BarChart3 className="h-4 w-4" />
              {showMetrics ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          )}
        </div>

        <div className="flex flex-col xl:flex-row xl:items-start gap-4 mb-2">
          {(!isMobile || showMetrics) && (
            <div className="flex-1 min-w-0 transition-all duration-300 animate-in slide-in-from-top-2">
              <LeadMetricsCards periodFilter={periodFilter} isMobile={isMobile} isCollapsed={isMobile && !showMetrics} />
            </div>
          )}
        </div>

        <Tabs defaultValue="ativos" className="flex flex-col">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2">
            <TabsList className="w-full lg:w-auto grid grid-cols-3">
              <TabsTrigger value="ativos" className="relative">
                Funil
                <span className="ml-2 bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded-full text-[10px]">
                  {ativosCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="ganhos">
                Histórico Ganhos
                <span className="ml-2 bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full text-[10px]">
                  {ganhosCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="perdidos">
                Histórico Perdidos
                <span className="ml-2 bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full text-[10px]">
                  {perdidosCount}
                </span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 lg:max-w-xl xl:max-w-3xl">
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
          </div>
          
          <div className="h-[calc(100vh-14rem)] lg:h-[calc(100vh-12rem)] flex flex-col -mx-2 px-2">
            <TabsContent value="ativos" className="flex-1 overflow-hidden min-h-0 m-0 p-0 outline-none">
              <LeadsKanban
                periodFilter={periodFilter}
                searchTerm={searchTerm}
                originFilter={originFilter}
                isMobile={isMobile}
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
