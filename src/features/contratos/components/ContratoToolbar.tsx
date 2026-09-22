import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type CategoryFilter = 'todas' | string;

interface ContratoToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: CategoryFilter;
  onCategoryFilterChange: (v: CategoryFilter) => void;
  availableCategories: string[];
  allLabel?: string;
  placeholder?: string;
}

export function ContratoToolbar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
  allLabel = 'Todas as categorias',
  placeholder = 'Buscar modelos de contrato...',
}: ContratoToolbarProps) {
  const [focused, setFocused] = useState(false);

  const categories = useMemo(
    () => [...availableCategories].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [availableCategories]
  );

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      role="toolbar"
      aria-label="Filtros de modelos de contrato"
    >
      {/* Busca textual */}
      <div className="relative flex-1 min-w-44 max-w-72">
        <Search
          size={14}
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-150 pointer-events-none',
            focused ? 'text-foreground' : 'text-muted-foreground'
          )}
          strokeWidth={1.8}
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="pl-8 h-9 bg-background border-border/70 text-sm"
          aria-label="Buscar modelos"
        />
      </div>

      {/* Filtro de categoria por Select */}
      {categories.length > 0 && (
        <Select
          value={categoryFilter}
          onValueChange={(v) => onCategoryFilterChange(v as CategoryFilter)}
        >
          <SelectTrigger
            className="h-9 w-48 bg-background border-border/70 text-sm"
            aria-label="Filtrar por categoria"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">{allLabel}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
