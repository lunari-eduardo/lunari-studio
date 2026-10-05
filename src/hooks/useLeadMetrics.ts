import { useMemo } from "react";
import { useLeads } from "./useLeads";
import { useLeadStatuses } from "./useLeadStatuses";
import { getLossReasons } from "@/config/motivosPerda";
import type { Lead } from "@/types/leads";
import { convertPeriodTypeToFilter, filterLeadsByPeriod, getValidTimestamp } from "@/utils/leadFilters";

export interface LeadMetrics {
  totalLeads: number;
  leadsEnviados: number;
  leadsFechados: number;
  leadsPerdidos: number;
  taxaConversao: number;
  topMotivoPerda: string | null;
}

export interface UseLeadMetricsResult extends LeadMetrics {
  metrics: LeadMetrics;
  topMotivoLabel: string | null;
  hasData: boolean;
}

export type PeriodType =
  | "current_year"
  | "last_7_days"
  | "last_30_days"
  | "last_60_days"
  | "last_90_days"
  | "january_2025"
  | "february_2025"
  | "march_2025"
  | "april_2025"
  | "may_2025"
  | "june_2025"
  | "july_2025"
  | "august_2025"
  | "september_2025"
  | "october_2025"
  | "november_2025"
  | "december_2025"
  | "previous_year"
  | "all_time";

export interface PeriodFilter {
  periodType: PeriodType;
}

export function useLeadMetrics(periodFilter?: PeriodFilter): UseLeadMetricsResult {
  const { leads } = useLeads();
  const { statuses } = useLeadStatuses();
  const lossReasons = getLossReasons();

  const filteredLeads = useMemo(() => {
    if (!periodFilter) {
      // Default to last_60_days
      const filter = convertPeriodTypeToFilter('last_60_days');
      return filterLeadsByPeriod(leads, filter, statuses);
    }

    const filter = convertPeriodTypeToFilter(periodFilter.periodType);
    return filterLeadsByPeriod(leads, filter, statuses);
  }, [leads, periodFilter, statuses]);

  const metrics = useMemo<LeadMetrics>(() => {
    const totalLeads = filteredLeads.length;

    const leadsEnviados = filteredLeads.filter((lead) => {
      return (
        lead.status === "orcamento_enviado" ||
        (lead.historicoStatus?.some((h) => h.status === "orcamento_enviado") ?? false)
      );
    }).length;

    const leadsFechados = filteredLeads.filter((lead) => {
      const statusDef = statuses.find(s => s.key === lead.status);
      const isConvertedNow = statusDef ? statusDef.isConverted : lead.status === 'fechado';
      return isConvertedNow || (lead.historicoStatus?.some((h) => h.status === "fechado") ?? false);
    }).length;

    const leadsPerdidos = filteredLeads.filter((lead) => {
      const statusDef = statuses.find(s => s.key === lead.status);
      const isLostNow = statusDef ? statusDef.isLost : lead.status === 'perdido';
      return isLostNow || (lead.historicoStatus?.some((h) => h.status === "perdido") ?? false);
    }).length;

    const taxaConversao = leadsEnviados > 0 ? (leadsFechados / leadsEnviados) * 100 : 0;

    const lostLeadsWithReason = filteredLeads.filter(
      (lead) => {
        const statusDef = statuses.find(s => s.key === lead.status);
        const isLostNow = statusDef ? statusDef.isLost : lead.status === 'perdido';
        return isLostNow && lead.motivoPerda;
      }
    );

    const reasonCounts = lostLeadsWithReason.reduce((acc: Record<string, number>, lead) => {
      if (lead.motivoPerda) {
        acc[lead.motivoPerda] = (acc[lead.motivoPerda] || 0) + 1;
      }
      return acc;
    }, {});

    let topMotivoPerda = null;
    let maxCount = 0;

    Object.entries(reasonCounts).forEach(([reason, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topMotivoPerda = reason;
      }
    });

    const topMotivoNome = lossReasons.find((r) => r.id === topMotivoPerda)?.label || topMotivoPerda;

    return {
      totalLeads,
      leadsEnviados,
      leadsFechados,
      leadsPerdidos,
      taxaConversao,
      topMotivoPerda: topMotivoNome,
    };
  }, [filteredLeads, lossReasons, statuses]);

  const topMotivoLabel = useMemo(() => {
    return metrics.topMotivoPerda;
  }, [metrics.topMotivoPerda]);

  return {
    metrics,
    topMotivoLabel,
    hasData: filteredLeads.length > 0,
    ...metrics,
  };
}
