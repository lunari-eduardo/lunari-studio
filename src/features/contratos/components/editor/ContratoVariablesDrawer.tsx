import { useState, useMemo } from 'react';
import { Search, Sparkles, Check, Plus, Code2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VARIAVEIS_DISPONIVEIS, type ContratoVariavelDef } from '@/utils/contratoVariables';
import { cn } from '@/lib/utils';

interface ContratoVariablesDrawerProps {
  conteudoHtml?: string;
  onInsertVariable: (key: string) => void;
  className?: string;
}

export function ContratoVariablesDrawer({
  conteudoHtml = '',
  onInsertVariable,
  className,
}: ContratoVariablesDrawerProps) {
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'auto' | 'editavel'>('todos');

  // Identifica variáveis já presentes no texto do contrato
  const usedKeys = useMemo(() => {
    const set = new Set<string>();
    const matches = conteudoHtml.matchAll(/\{\{([^}]+)\}\}/g);
    for (const match of matches) {
      if (match[1]) set.add(match[1].trim());
    }
    return set;
  }, [conteudoHtml]);

  const filteredVars = useMemo(() => {
    const q = search.trim().toLowerCase();
    return VARIAVEIS_DISPONIVEIS.filter((v) => {
      // Exclui legadas a menos que buscadas especificamente
      if (v.tipo === 'legacy' && !q) return false;

      const matchSearch =
        !q ||
        v.key.toLowerCase().includes(q) ||
        v.label.toLowerCase().includes(q) ||
        (v.exemplo && v.exemplo.toLowerCase().includes(q));

      const matchTipo =
        filterTipo === 'todos' ||
        (filterTipo === 'auto' && v.tipo === 'auto') ||
        (filterTipo === 'editavel' && v.tipo === 'editavel');

      return matchSearch && matchTipo;
    });
  }, [search, filterTipo]);

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-card/60 border border-border/70 rounded-xl overflow-hidden shadow-sm',
        className
      )}
    >
      {/* Header do Drawer */}
      <div className="p-3 border-b border-border/50 bg-muted/20 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Code2 size={15} className="text-[hsl(var(--accent-gold))]" />
            <span>Variáveis Dinâmicas</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {usedKeys.size} em uso
          </span>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome ou exemplo..."
            className="h-7 pl-7 pr-2 text-xs bg-background border-border/60"
          />
        </div>

        {/* Filtros em pílulas */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterTipo('todos')}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
              filterTipo === 'todos'
                ? 'bg-primary/20 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            Todas ({VARIAVEIS_DISPONIVEIS.filter((v) => v.tipo !== 'legacy').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTipo('auto')}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1',
              filterTipo === 'auto'
                ? 'bg-primary/20 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Sistema
          </button>
          <button
            type="button"
            onClick={() => setFilterTipo('editavel')}
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1',
              filterTipo === 'editavel'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Editáveis
          </button>
        </div>
      </div>

      {/* Lista de Variáveis */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1 pr-1.5">
          {filteredVars.map((v) => {
            const isUsed = usedKeys.has(v.key);
            const isAuto = v.tipo === 'auto';

            return (
              <button
                key={v.key}
                type="button"
                // Evita roubar o foco do contentEditable para preservar a seleção
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onInsertVariable(v.key)}
                className={cn(
                  'w-full text-left p-2 rounded-lg border transition-all duration-150 group flex flex-col gap-1',
                  isUsed
                    ? 'border-border/50 bg-card/40 hover:border-border hover:bg-card'
                    : 'border-transparent hover:border-border/60 hover:bg-muted/40'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      'font-mono text-[11px] px-1.5 py-0.5 rounded font-medium inline-block',
                      isAuto
                        ? 'bg-primary/10 text-primary'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    )}
                  >
                    {`{{${v.key}}}`}
                  </span>

                  {isUsed ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
                      <Check size={10} /> Em uso
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      <Plus size={10} /> Inserir
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate pr-1">{v.label}</span>
                  {v.exemplo && (
                    <span className="text-[10px] text-muted-foreground/70 shrink-0 italic">
                      ex: {v.exemplo}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {filteredVars.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nenhuma variável encontrada para "{search}".
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
