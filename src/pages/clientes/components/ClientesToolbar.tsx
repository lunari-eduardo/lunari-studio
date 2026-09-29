import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  SlidersHorizontal,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  X,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  ClientAdvancedFilters,
  SortConfig,
  SortKey,
  ViewMode,
} from '../types';

interface ClientesToolbarProps {
  totalCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;
  activeFiltersCount: number;
  onOpenFilterDrawer: () => void;
  onNewClient: () => void;
  filters: ClientAdvancedFilters;
  onRemoveFilter: (key: keyof ClientAdvancedFilters) => void;
  onClearFilters: () => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  selectedCount?: number;
}

export const ClientesToolbar: React.FC<ClientesToolbarProps> = ({
  totalCount,
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  sortConfig,
  onSortChange,
  activeFiltersCount,
  onOpenFilterDrawer,
  onNewClient,
  filters,
  onRemoveFilter,
  onClearFilters,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  selectedCount = 0,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Atalho ⌘K / Ctrl+K para focar no campo de busca
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mapeia valor do select de ordenação
  const sortValue = `${sortConfig.key}_${sortConfig.direction}`;

  const handleSortSelect = (val: string) => {
    const [key, direction] = val.split('_') as [SortKey, 'asc' | 'desc'];
    onSortChange({ key, direction });
  };

  // Rótulos para os chips
  const getPeriodoLabel = (p: string) => {
    switch (p) {
      case 'mes_atual':
        return 'Este mês';
      case 'ano_atual':
        return 'Este ano';
      case 'custom':
        return 'Personalizado';
      default:
        return '';
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'ativo':
        return 'Ativos';
      case 'novo':
        return 'Novos';
      default:
        return '';
    }
  };

  const hasActiveChips =
    filters.periodo !== 'todos' ||
    (filters.categoria && filters.categoria !== 'todas') ||
    filters.status !== 'todos' ||
    filters.possuiSessoes ||
    filters.comValorAReceber ||
    filters.semSessoes ||
    filters.aniversariantes;

  const currentDisplayCount = Math.min(pageSize, totalCount);

  return (
    <div className="space-y-3">
      {/* 1. Toolbar Principal Sticky */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-1 pb-3 border-b border-border/20 transition-all">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Campo de Busca Grande */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nome, e-mail, telefone ou WhatsApp..."
              className="h-10 pl-10 pr-20 bg-card/60 border-border/40 text-sm focus-visible:ring-accent-gold/40 rounded-xl"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                title="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 pointer-events-none text-2xs text-muted-foreground/60 border border-border/40 rounded px-1.5 py-0.5 bg-muted/20">
                <span>⌘</span>
                <span>K</span>
              </div>
            )}
          </div>

          {/* Controles de Visão, Filtros e Novo Cliente */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Alternador Cards / Tabela */}
            <div className="flex items-center rounded-xl border border-border/40 bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => onViewModeChange('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'cards'
                    ? 'bg-background text-foreground font-semibold shadow-xs border border-border/40 dark:bg-zinc-800 dark:border-transparent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-background text-foreground font-semibold shadow-xs border border-border/40 dark:bg-zinc-800 dark:border-transparent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
                title="Visualização em Tabela"
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tabela</span>
              </button>
            </div>

            {/* Botão Filtros com Badge */}
            <Button
              type="button"
              variant="outline"
              onClick={onOpenFilterDrawer}
              className={`h-10 text-xs gap-1.5 border-border/40 rounded-xl transition-all ${
                activeFiltersCount > 0
                  ? 'border-accent-gold/50 bg-accent-gold/15 text-zinc-900 dark:text-accent-gold hover:bg-accent-gold/25 font-semibold'
                  : 'bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-gold px-1 text-2xs font-bold text-zinc-950">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            {/* Botão + Novo Cliente */}
            <Button
              type="button"
              onClick={onNewClient}
              className="h-10 gap-1.5 text-xs font-semibold rounded-xl bg-accent-gold hover:bg-accent-gold/90 text-zinc-950 shadow-xs active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 text-zinc-950" />
              <span className="text-zinc-950 font-semibold">Novo Cliente</span>
            </Button>
          </div>
        </div>

        {/* Linha de Chips de Filtros Ativos + Ordenação */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5">
          {/* Chips Ativos */}
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.periodo !== 'todos' && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/80 px-2.5 py-1 text-xs text-foreground">
                <Calendar className="h-3 w-3 text-accent-gold" />
                {getPeriodoLabel(filters.periodo)}
                <button
                  type="button"
                  onClick={() => onRemoveFilter('periodo')}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.categoria && filters.categoria !== 'todas' && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/80 px-2.5 py-1 text-xs text-foreground">
                <Clock className="h-3 w-3 text-accent-gold" />
                {filters.categoria}
                <button
                  type="button"
                  onClick={() => onRemoveFilter('categoria')}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.status !== 'todos' && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/80 px-2.5 py-1 text-xs text-foreground">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                {getStatusLabel(filters.status)}
                <button
                  type="button"
                  onClick={() => onRemoveFilter('status')}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.possuiSessoes && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/80 px-2.5 py-1 text-xs text-foreground">
                Possui sessões
                <button
                  type="button"
                  onClick={() => onRemoveFilter('possuiSessoes')}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.comValorAReceber && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/80 px-2.5 py-1 text-xs text-foreground">
                Com valor a receber
                <button
                  type="button"
                  onClick={() => onRemoveFilter('comValorAReceber')}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.semSessoes && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/80 px-2.5 py-1 text-xs text-foreground">
                Sem sessões
                <button
                  type="button"
                  onClick={() => onRemoveFilter('semSessoes')}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.aniversariantes && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/80 px-2.5 py-1 text-xs text-foreground">
                Aniversariantes
                <button
                  type="button"
                  onClick={() => onRemoveFilter('aniversariantes')}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {hasActiveChips && (
              <button
                type="button"
                onClick={onClearFilters}
                className="text-xs text-accent-gold hover:underline font-medium ml-1.5"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Ordenar por (Dropdown alinhado à direita) */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Ordenar por
            </span>
            <Select value={sortValue} onValueChange={handleSortSelect}>
              <SelectTrigger className="h-8 text-xs w-[170px] border-border/40 bg-card/60 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="created_at_desc">Mais recentes</SelectItem>
                <SelectItem value="created_at_asc">Mais antigos</SelectItem>
                <SelectItem value="nome_asc">Nome (A–Z)</SelectItem>
                <SelectItem value="nome_desc">Nome (Z–A)</SelectItem>
                <SelectItem value="total_faturado_desc">Maior faturamento</SelectItem>
                <SelectItem value="a_receber_desc">Maior a receber</SelectItem>
                <SelectItem value="sessoes_count_desc">Mais sessões</SelectItem>
                <SelectItem value="ultima_sessao_data_desc">Última sessão recente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Sub-barra informativa logo antes dos cards/tabela */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        {viewMode === 'cards' ? (
          <>
            <div>
              <span className="font-medium text-foreground">{currentDisplayCount}</span> de{' '}
              <span className="font-medium text-foreground">{totalCount}</span> clientes
            </div>
            <div className="flex items-center gap-2">
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange(currentPage - 1)}
                  className="h-7 w-7 rounded-md p-0 disabled:opacity-30"
                  title="Página anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                  className="h-7 w-7 rounded-md p-0 disabled:opacity-30"
                  title="Próxima página"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span>{selectedCount} selecionados</span>
            </div>
            <div className="text-2xs text-muted-foreground/60">
              Pressione Shift para selecionar múltiplos
            </div>
          </>
        )}
      </div>
    </div>
  );
};
