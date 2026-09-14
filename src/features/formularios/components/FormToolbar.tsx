/**
 * FormToolbar — barra de filtro da página de formulários.
 *
 * Filtros:
 *  • Busca textual por título (local, client-side)
 *  • Categoria: Todas | Gestantes | Posificado | Família | Casamentos | Novos
 *
 * A ação "+ Novo formulário" foi movida para um card CTA na grid.
 */
import { useState } from 'react';
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

export type CategoryFilter = 'todas' | 'gestantes' | 'posificado' | 'familia' | 'casamentos' | 'novos';

interface FormToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: CategoryFilter;
  onCategoryFilterChange: (v: CategoryFilter) => void;
}

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'todas', label: 'Todas as categorias' },
  { value: 'gestantes', label: 'Gestantes' },
  { value: 'posificado', label: 'Posificado' },
  { value: 'familia', label: 'Família' },
  { value: 'casamentos', label: 'Casamentos' },
  { value: 'novos', label: 'Novos' },
];

export function FormToolbar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
}: FormToolbarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      role="toolbar"
      aria-label="Filtros de formulários"
    >
      {/* Busca textual */}
      <div className="relative flex-1 min-w-40 max-w-72">
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
          placeholder="Buscar formulários..."
          className="pl-8 h-9 bg-background border-border/70 text-sm"
          aria-label="Buscar formulários"
        />
      </div>

      {/* Filtro de categoria */}
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
          {CATEGORY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
