import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Filter,
  Calendar,
  RotateCcw,
  Sparkles,
  Users,
  CreditCard,
  Cake,
  CheckCircle2,
} from 'lucide-react';
import { ClientAdvancedFilters, PeriodoFilter, StatusFilter } from '../types';

interface ClientesFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ClientAdvancedFilters;
  onApplyFilters: (filters: ClientAdvancedFilters) => void;
  onClearFilters: () => void;
  availableCategories?: string[];
}

const DEFAULT_CATEGORIAS = [
  'Gestante',
  'Newborn',
  'Família',
  'Acompanhamento',
  'Infantil',
  'Smash the Cake',
  'Casal',
  'Formatura',
  'Feminino',
  'Sessão de Marca',
];

export const ClientesFilterDrawer: React.FC<ClientesFilterDrawerProps> = ({
  open,
  onOpenChange,
  filters,
  onApplyFilters,
  onClearFilters,
  availableCategories = DEFAULT_CATEGORIAS,
}) => {
  // Estado local para permitir edição sem aplicar imediatamente até clicar em Aplicar
  const [localFilters, setLocalFilters] = useState<ClientAdvancedFilters>(filters);

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    onClearFilters();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md w-full p-0 bg-background border-border/40">
        {/* Header */}
        <SheetHeader className="p-6 border-b border-border/20">
          <div className="flex items-center gap-2 text-accent-gold">
            <Filter className="h-4 w-4" />
            <SheetTitle className="text-base font-semibold text-foreground">
              Filtros Avançados
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Refine a listagem de clientes combinando múltiplos critérios.
          </SheetDescription>
        </SheetHeader>

        {/* Form Body com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Período */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Período da Sessão
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'todos', label: 'Todos os períodos' },
                { id: 'mes_atual', label: 'Este mês' },
                { id: 'ano_atual', label: 'Este ano' },
                { id: 'custom', label: 'Personalizado' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      periodo: item.id as PeriodoFilter,
                    }))
                  }
                  className={`text-xs px-3 py-2 rounded-lg border text-left font-medium transition-all ${
                    localFilters.periodo === item.id
                      ? 'border-accent-gold/60 bg-accent-gold/10 text-foreground font-semibold'
                      : 'border-border/30 bg-card/60 text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {localFilters.periodo === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Data Inicial</Label>
                  <Input
                    type="date"
                    value={localFilters.dataInicio}
                    onChange={(e) =>
                      setLocalFilters((prev) => ({ ...prev, dataInicio: e.target.value }))
                    }
                    className="h-8 text-xs bg-card/60 border-border/30"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Data Final</Label>
                  <Input
                    type="date"
                    value={localFilters.dataFim}
                    onChange={(e) =>
                      setLocalFilters((prev) => ({ ...prev, dataFim: e.target.value }))
                    }
                    className="h-8 text-xs bg-card/60 border-border/30"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Categoria */}
          <div className="space-y-3 border-t border-border/20 pt-5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Categoria de Ensaio
            </Label>
            <Select
              value={localFilters.categoria || 'todas'}
              onValueChange={(val) =>
                setLocalFilters((prev) => ({ ...prev, categoria: val }))
              }
            >
              <SelectTrigger className="h-9 text-xs bg-card/60 border-border/30">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Status do Cliente */}
          <div className="space-y-3 border-t border-border/20 pt-5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Status do Cliente
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'ativo', label: 'Ativos' },
                { id: 'novo', label: 'Novos' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      status: item.id as StatusFilter,
                    }))
                  }
                  className={`text-xs px-3 py-2 rounded-lg border text-center font-medium transition-all ${
                    localFilters.status === item.id
                      ? 'border-accent-gold/60 bg-accent-gold/10 text-foreground font-semibold'
                      : 'border-border/30 bg-card/60 text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Filtros Especiais Rápidos */}
          <div className="space-y-4 border-t border-border/20 pt-5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Critérios Rápidos
            </Label>

            <div className="space-y-3">
              {/* Possui Sessões */}
              <div className="flex items-center justify-between rounded-xl border border-border/20 bg-card/40 p-3 hover:bg-card/70 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Possui sessões
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Clientes que já realizaram pelo menos 1 sessão
                  </p>
                </div>
                <Switch
                  checked={localFilters.possuiSessoes}
                  onCheckedChange={(checked) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      possuiSessoes: checked,
                      semSessoes: checked ? false : prev.semSessoes,
                    }))
                  }
                />
              </div>

              {/* Com Valor a Receber */}
              <div className="flex items-center justify-between rounded-xl border border-border/20 bg-card/40 p-3 hover:bg-card/70 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-accent-gold" />
                    Com valor a receber
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Clientes com saldo devedor ou pagamentos pendentes
                  </p>
                </div>
                <Switch
                  checked={localFilters.comValorAReceber}
                  onCheckedChange={(checked) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      comValorAReceber: checked,
                    }))
                  }
                />
              </div>

              {/* Sem Sessões */}
              <div className="flex items-center justify-between rounded-xl border border-border/20 bg-card/40 p-3 hover:bg-card/70 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-foreground">Sem sessões</span>
                  <p className="text-[11px] text-muted-foreground">
                    Contatos cadastrados que nunca agendaram
                  </p>
                </div>
                <Switch
                  checked={localFilters.semSessoes}
                  onCheckedChange={(checked) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      semSessoes: checked,
                      possuiSessoes: checked ? false : prev.possuiSessoes,
                    }))
                  }
                />
              </div>

              {/* Aniversariantes */}
              <div className="flex items-center justify-between rounded-xl border border-border/20 bg-card/40 p-3 hover:bg-card/70 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Cake className="h-3.5 w-3.5 text-rose-400" />
                    Aniversariantes do mês
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Clientes ou filhos que comemoram neste mês
                  </p>
                </div>
                <Switch
                  checked={localFilters.aniversariantes}
                  onCheckedChange={(checked) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      aniversariantes: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <SheetFooter className="p-4 border-t border-border/20 bg-card/40 flex-row gap-2 justify-end sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="flex-1 text-xs gap-1.5 border-border/30 hover:bg-muted/40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className="flex-1 text-xs gap-1.5 bg-accent-gold hover:bg-accent-gold/90 text-zinc-950 font-semibold shadow-sm"
          >
            Aplicar filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
