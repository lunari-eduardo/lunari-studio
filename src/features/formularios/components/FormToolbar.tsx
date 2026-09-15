/**
 * FormToolbar — barra de filtro da página de formulários.
 *
 * Filtros:
 *  • Busca textual (local, client-side).
 *  • Categoria — derivada dos templates/formulários do banco, sem hardcode.
 *
 * Princípio: nenhuma categoria fictícia. As opções vêm do que o usuário
 * realmente tem no banco (templates via `useFormularioTemplates()`).
 *
 * A ação "+ Novo formulário" foi movida para um card CTA na grid
 * (sem duplicação header/toolbar).
 */
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

/** Valor literal "todas" + qualquer string livre (categoria do banco). */
export type CategoryFilter = 'todas' | string;

interface FormToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  categoryFilter: CategoryFilter;
  onCategoryFilterChange: (v: CategoryFilter) => void;
  /** Lista de categorias disponíveis (derivada do banco). Vazio = sem select. */
  availableCategories: string[];
  /** Label customizado do chip default. Default: "Todas as categorias". */
  allLabel?: string;
}

export function FormToolbar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
  allLabel = 'Todas as categorias',
}: FormToolbarProps) {
  const [focused, setFocused] = useState(false);

  /** Ordenar alfabeticamente para previsibilidade. */
  const categories = useMemo(
    () => [...availableCategories].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [availableCategories]
  );

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

      {/* Filtro de categoria — só renderiza se houver categorias disponíveis */}
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
