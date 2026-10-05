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
import { convertPeriodTypeToFilter, filterLeadsByPeriod, sortLeadsByLastModified } from "@/utils/leadFilters";

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

  const handlePeriodChange = (periodType: PeriodType) => {
    setPeriodFilter({ periodType });
  };

  const { ativosCount, ganhosCount, perdidosCount, ganhosList, perdidosList } = useMemo(() => {
    // Aplica a busca textual primeiro
    const searched = leads.filter((lead) => {
      const matchesSearch =
        !searchTerm.trim() ||
        lead.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.telefone?.includes(searchTerm);
      const matchesOrigem = originFilter === "all" || lead.origem === originFilter;
      return matchesSearch && matchesOrigem;
    });

    // Filtra todos (a lgica de perodo em filterLeadsByPeriod ignora o filtro de data para leads ativos)
    const filterObj = convertPeriodTypeToFilter(periodFilter.periodType);
    const filteredByPeriod = filterLeadsByPeriod(searched, filterObj, statuses);

    // Separa em Ativos, Ganhos e Perdidos
    const active = filteredByPeriod.filter(lead => {
      const statusDef = statuses.find(s => s.key === lead.status);
      return statusDef ? !statusDef.isConverted && !statusDef.isLost : true;
    });

    const ganhos = filteredByPeriod.filter(lead => {
      const statusDef = statuses.find(s => s.key === lead.status);
      return statusDef ? statusDef.isConverted : lead.status === 'fechado' || lead.status === 'ganho';
    });

    const perdidos = filteredByPeriod.filter(lead => {
      const statusDef = statuses.find(s => s.key === lead.status);
      return statusDef ? statusDef.isLost : lead.status === 'perdido';
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
      {isMobile && (
        <div className="flex-shrink-0 px-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMetrics(!showMetrics)}
            className="w-full justify-between text-sm font-medium border-lunar-border/60 hover:border-lunar-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>MǸtricas</span>
            </div>
            {showMetrics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      )}

      <div
        className={cn(
          "flex-shrink-0 px-2 space-y-2 transition-all duration-300",
          isMobile ? (showMetrics ? "pt-2 pb-1" : "pt-1") : "pt-3 space-y-3",
        )}
      >
        {(!isMobile || showMetrics) && (
          <div
            className={cn("transition-all duration-300", isMobile && showMetrics && "animate-in slide-in-from-top-2")}
          >
            <LeadMetricsCards periodFilter={periodFilter} isMobile={isMobile} isCollapsed={isMobile && !showMetrics} />
          </div>
        )}

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

      <div className="flex-1 overflow-hidden min-h-0 flex flex-col mt-2 px-2">
        <Tabs defaultValue="ativos" className="h-full flex flex-col">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-3">
            <TabsTrigger value="ativos" className="relative">
              Ativos
              <span className="ml-2 bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded-full text-[10px]">
                {ativosCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="ganhos">
              Ganhos
              <span className="ml-2 bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full text-[10px]">
                {ganhosCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="perdidos">
              Perdidos
              <span className="ml-2 bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full text-[10px]">
                {perdidosCount}
              </span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="ativos" className="flex-1 overflow-hidden min-h-0 mt-2 p-0 outline-none">
            <LeadsKanban
              periodFilter={periodFilter}
              searchTerm={searchTerm}
              originFilter={originFilter}
              isMobile={isMobile}
            />
          </TabsContent>
          
          <TabsContent value="ganhos" className="flex-1 overflow-y-auto min-h-0 mt-4 p-0 outline-none custom-scrollbar">
            <LeadHistoryGrid leads={ganhosList} />
          </TabsContent>
          
          <TabsContent value="perdidos" className="flex-1 overflow-y-auto min-h-0 mt-4 p-0 outline-none custom-scrollbar">
            <LeadHistoryGrid leads={perdidosList} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
