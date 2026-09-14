/**
 * FormToolbar — barra de filtro e ação da página de formulários.
 *
 * Filtros:
 *  • Busca textual por título (local, client-side)
 *  • Status de envio: Todos | Rascunho | Enviado | Respondido
 *
 * Ação:
 *  • Botão "+ Novo formulário" (preto) → abre o modal de criação via SendBriefingModal
 *    ou navegação para editor. Por ora, abre SendBriefingModal que requer cliente —
 *    fallback: toast indicando que vá pelo caminho "Comercial → Briefing".
 */
import { useState, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type StatusFilter = 'todos' | 'rascunho' | 'enviado' | 'respondido';

interface FormToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  onNewForm: () => void;
  isCreating?: boolean;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'respondido', label: 'Respondido' },
];

export function FormToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onNewForm,
  isCreating,
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

      {/* Filtro de status */}
      <Select
        value={statusFilter}
        onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}
      >
        <SelectTrigger
          className="h-9 w-36 bg-background border-border/70 text-sm"
          aria-label="Filtrar por status"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Ação principal */}
      <Button
        onClick={onNewForm}
        disabled={isCreating}
        className="h-9 gap-1.5 bg-foreground text-background hover:bg-foreground/90 shrink-0"
        aria-label="Criar novo formulário"
      >
        <Plus size={14} strokeWidth={2} aria-hidden />
        Novo formulário
      </Button>
    </div>
  );
}
