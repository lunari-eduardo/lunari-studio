import type { PeriodType } from '@/hooks/useLeadMetrics';
import type { Lead, LeadStatusDef } from '@/types/leads';

export interface FilterResult {
  year?: number;
  month?: number;
  dateFrom?: Date;
  type: 'year' | 'month' | 'range' | 'all';
}

export function convertPeriodTypeToFilter(periodType: PeriodType): FilterResult {
  const currentYear = new Date().getFullYear();
  const now = new Date();
  
  switch (periodType) {
    case 'current_year':
      return { year: currentYear, month: undefined, type: 'year' };
    case 'last_7_days':
      return { 
        dateFrom: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), 
        type: 'range' 
      };
    case 'last_30_days':
      return { 
        dateFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), 
        type: 'range' 
      };
    case 'last_60_days':
      return { 
        dateFrom: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), 
        type: 'range' 
      };
    case 'last_90_days':
      return { 
        dateFrom: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), 
        type: 'range' 
      };
    case 'january_2025': return { year: 2025, month: 1, type: 'month' };
    case 'february_2025': return { year: 2025, month: 2, type: 'month' };
    case 'march_2025': return { year: 2025, month: 3, type: 'month' };
    case 'april_2025': return { year: 2025, month: 4, type: 'month' };
    case 'may_2025': return { year: 2025, month: 5, type: 'month' };
    case 'june_2025': return { year: 2025, month: 6, type: 'month' };
    case 'july_2025': return { year: 2025, month: 7, type: 'month' };
    case 'august_2025': return { year: 2025, month: 8, type: 'month' };
    case 'september_2025': return { year: 2025, month: 9, type: 'month' };
    case 'october_2025': return { year: 2025, month: 10, type: 'month' };
    case 'november_2025': return { year: 2025, month: 11, type: 'month' };
    case 'december_2025': return { year: 2025, month: 12, type: 'month' };
    case 'previous_year':
      return { year: currentYear - 1, month: undefined, type: 'year' };
    case 'all_time':
    default:
      return { type: 'all' };
  }
}

export function isLeadFinished(lead: Lead, statuses: LeadStatusDef[]): boolean {
  const statusDef = statuses.find((s) => s.key === lead.status);
  if (statusDef) {
    return !!(statusDef.isConverted || statusDef.isLost);
  }
  const lower = (lead.status || '').toLowerCase();
  return ['fechado', 'perdido', 'ganho', 'convertido', 'lost', 'won'].includes(lower);
}

export function shouldLeadBeInHistory(lead: Lead, statuses: LeadStatusDef[]): boolean {
  const finished = isLeadFinished(lead, statuses);
  if (!finished) return false;
  
  if (lead.arquivado) return true;

  const ts = getValidTimestamp(lead);
  const daysSince = (new Date().getTime() - ts.getTime()) / (1000 * 3600 * 24);
  return daysSince > 10;
}

export function filterLeadsByPeriod(leads: Lead[], filter: FilterResult, statuses: LeadStatusDef[] = []): Lead[] {
  return leads.filter(lead => {
    const shouldBeInHistory = shouldLeadBeInHistory(lead, statuses);
    if (!shouldBeInHistory) {
      return true; // Ignore period filter completely for active leads and leads < 10 days old
    }

    const leadDate = getValidTimestamp(lead);
    
    if (isNaN(leadDate.getTime())) {
      console.warn("%s", "[LeadFilters] Data inválida para lead " + lead.id);
      return false;
    }
    
    switch (filter.type) {
      case 'range':
        if (!filter.dateFrom) return false;
        return leadDate >= filter.dateFrom;
      case 'year':
        const leadYear = leadDate.getFullYear();
        return filter.year ? leadYear === filter.year : true;
      case 'month':
        if (!filter.year || !filter.month) return false;
        const leadMonth = leadDate.getMonth() + 1;
        const leadYear2 = leadDate.getFullYear();
        return leadMonth === filter.month && leadYear2 === filter.year;
      case 'all':
      default:
        return true;
    }
  });
}

export function getValidTimestamp(lead: Lead): Date {
  if (lead.perdidoEm) {
    const pDate = new Date(lead.perdidoEm);
    if (!isNaN(pDate.getTime())) return pDate;
  }
  if (lead.statusTimestamp) {
    const statusDate = new Date(lead.statusTimestamp);
    if (!isNaN(statusDate.getTime())) {
      return statusDate;
    }
  }
  if (lead.dataAtualizacao) {
    const updateDate = new Date(lead.dataAtualizacao);
    if (!isNaN(updateDate.getTime())) return updateDate;
  }
  
  const creationDate = new Date(lead.dataCriacao);
  if (!isNaN(creationDate.getTime())) {
    return creationDate;
  }
  
  return new Date();
}

export function sortLeadsByLastModified(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    const dateA = getValidTimestamp(a).getTime();
    const dateB = getValidTimestamp(b).getTime();
    return dateB - dateA;
  });
}

