import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar, Search, MapPin } from 'lucide-react';
import type { PeriodType } from '@/hooks/useLeadMetrics';
import { cn } from '@/lib/utils';

export interface UnifiedLeadFiltersProps {
  periodType: PeriodType;
  onPeriodChange: (periodType: PeriodType) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  originFilter: string;
  onOriginChange: (origin: string) => void;
  origins: Array<{
    id: string;
    nome: string;
  }>;
  isMobile?: boolean;
}
const PERIOD_OPTIONS = [{
  value: 'last_7_days' as PeriodType,
  label: 'Últimos 7 dias'
}, {
  value: 'last_30_days' as PeriodType,
  label: 'Últimos 30 dias' 
}, {
  value: 'last_60_days' as PeriodType,
  label: 'Últimos 90 dias'
}, {
  value: 'current_year' as PeriodType,
  label: 'Ano Atual'
}, {
  value: 'january_2025' as PeriodType,
  label: 'Janeiro 2025'
}, {
  value: 'february_2025' as PeriodType,
  label: 'Fevereiro 2025'
}, {
  value: 'march_2025' as PeriodType,
  label: 'Março 2025'
}, {
  value: 'april_2025' as PeriodType,
  label: 'Abril 2025'
}, {
  value: 'may_2025' as PeriodType,
  label: 'Maio 2025'
}, {
  value: 'june_2025' as PeriodType,
  label: 'Junho 2025'
}, {
  value: 'july_2025' as PeriodType,
  label: 'Julho 2025'
}, {
  value: 'august_2025' as PeriodType,
  label: 'Agosto 2025'
}, {
  value: 'september_2025' as PeriodType,
  label: 'Setembro 2025'
}, {
  value: 'october_2025' as PeriodType,
  label: 'Outubro 2025'
}, {
  value: 'november_2025' as PeriodType,
  label: 'Novembro 2025'
}, {
  value: 'december_2025' as PeriodType,
  label: 'Dezembro 2025'
}, {
  value: 'previous_year' as PeriodType,
  label: 'Ano Anterior'
},   {
  value: 'all_time' as PeriodType,
  label: 'Histórico Completo'
}];
export default function UnifiedLeadFilters({
  periodType,
  onPeriodChange,
  searchTerm,
  onSearchChange,
  originFilter,
  onOriginChange,
  origins,
  isMobile = false
}: UnifiedLeadFiltersProps) {
  // Encontrar nomes amigáveis para as pílulas
  const activePeriodLabel = PERIOD_OPTIONS.find(p => p.value === periodType)?.label;
  const activeOriginLabel = originFilter !== 'all' ? originFilter : null;
  const hasActiveFilters = periodType !== 'last_60_days' || searchTerm !== '' || originFilter !== 'all';

  const clearFilters = () => {
    onPeriodChange('last_60_days');
    onSearchChange('');
    onOriginChange('all');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className={cn("flex flex-wrap items-center justify-end gap-2", isMobile ? "w-full" : "w-auto")}>
        {/* Search Filter Minimalista */}
        <div className="relative flex items-center w-full md:w-64">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Buscar leads..." 
            value={searchTerm} 
            onChange={e => onSearchChange(e.target.value)} 
            className="pl-8 h-9 text-sm bg-transparent border-border/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 rounded-lg w-full transition-all" 
          />
          <div className="absolute right-2.5 flex items-center pointer-events-none">
            <span className="text-[10px] text-muted-foreground font-medium px-1 rounded-sm border border-border/50 bg-background/50">⌘K</span>
          </div>
        </div>
        
        {/* Period Filter Minimalista */}
        <Select value={periodType} onValueChange={onPeriodChange}>
          <SelectTrigger className="h-9 text-sm w-[140px] bg-transparent border-border/60 hover:bg-muted/40 transition-colors focus:ring-0 focus:ring-offset-0 rounded-lg">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value} className="text-sm">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Origin Filter Minimalista */}
        <Select value={originFilter} onValueChange={onOriginChange}>
          <SelectTrigger className="h-9 text-sm w-[120px] bg-transparent border-border/60 hover:bg-muted/40 transition-colors focus:ring-0 focus:ring-offset-0 rounded-lg">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Origem" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">Todas as origens</SelectItem>
            {origins.map(origem => (
              <SelectItem key={origem.id} value={origem.nome} className="text-sm">
                {origem.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pílulas de Filtros Ativos (Chips) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-end gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {periodType !== 'last_60_days' && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted/40 border border-border/30 text-[10px] text-muted-foreground">
              <span>{activePeriodLabel}</span>
              <button onClick={() => onPeriodChange('last_60_days')} className="hover:text-foreground transition-colors ml-1">×</button>
            </div>
          )}
          {activeOriginLabel && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted/40 border border-border/30 text-[10px] text-muted-foreground">
              <span>{activeOriginLabel}</span>
              <button onClick={() => onOriginChange('all')} className="hover:text-foreground transition-colors ml-1">×</button>
            </div>
          )}
          {searchTerm && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted/40 border border-border/30 text-[10px] text-muted-foreground">
              <span>Busca: "{searchTerm}"</span>
              <button onClick={() => onSearchChange('')} className="hover:text-foreground transition-colors ml-1">×</button>
            </div>
          )}
          
          <button 
            onClick={clearFilters}
            className="text-[10px] text-lunar-accent hover:text-lunar-accent/80 font-medium ml-1 transition-colors px-1"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}
