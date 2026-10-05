import { useState, useMemo, memo } from "react";
import { Check, ChevronsUpDown, Package, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRealtimeConfiguration } from '@/hooks/useRealtimeConfiguration';

interface PackageComboboxProps {
  value?: string;
  displayName?: string; // Nome a exibir (congelado)
  description?: string; // Usado na variante inline como 2Âª linha
  variant?: "default" | "inline";
  onValueChange: (packageData: {
    id: string; // Add ID to the interface
    nome: string;
    valor: string;
    valorFotoExtra: string;
    categoria: string;
    produtosIncluidos?: Array<{
      produtoId: string;
      quantidade: number;
    }>;
  }) => void;
  disabled?: boolean;
}

// FunÃ§Ã£o utilitÃ¡ria para buscar categoria por ID
const getCategoriaNameById = (categoriaId: string | number, configCategorias: any[]): string => {
  if (!categoriaId || !configCategorias.length) return '';
  
  const categoria = configCategorias.find((cat: any) => 
    cat.id === categoriaId || cat.id === String(categoriaId)
  );
  
  if (categoria) {
    return categoria.nome || String(categoriaId);
  }
  
  const index = parseInt(String(categoriaId)) - 1;
  if (index >= 0 && index < configCategorias.length) {
    return configCategorias[index].nome || String(categoriaId);
  }
  
  return String(categoriaId);
};

const WorkflowPackageComboboxComponent = ({
  value,
  displayName,
  description,
  variant = "default",
  onValueChange,
  disabled = false
}: PackageComboboxProps) => {
  const [open, setOpen] = useState(false);
  
  // CORREÃ‡ÃƒO: Usar real-time configuration (nÃ£o mais useConfiguration que causa loops)
  const { pacotes: rawPacotes, categorias, isLoadingPacotes } = useRealtimeConfiguration();
  
  // CORREÃ‡ÃƒO: Memoizar processamento de pacotes para evitar recalcular em cada render
  const pacotes = useMemo(() => {
    return rawPacotes.map((pacote: any) => {
      let categoria = pacote.categoria || '';
      if (pacote.categoria_id) {
        categoria = getCategoriaNameById(pacote.categoria_id, categorias);
      }

      return {
        id: pacote.id,
        nome: pacote.nome,
        valor: pacote.valor_base || pacote.valorVenda || pacote.valor || 0,
        categoria,
        valorFotoExtra: pacote.valor_foto_extra || pacote.valorFotoExtra || 35,
        fotosIncluidas: pacote.fotos_incluidas || pacote.fotosIncluidas || 0,
        produtosIncluidos: pacote.produtos_incluidos || pacote.produtosIncluidos || []
      };
    });
  }, [rawPacotes, categorias]);
  
  // FunÃ§Ã£o para limpar a seleÃ§Ã£o
  const handleClearPackage = () => {
    onValueChange({
      id: '',
      nome: '',
      valor: 'R$ 0,00',
      valorFotoExtra: 'R$ 0,00',
      categoria: '',
      produtosIncluidos: []
    });
    setOpen(false);
  };
  
  // CORREÃ‡ÃƒO: Memoizar seleÃ§Ã£o de pacote para evitar recalcular
  const selectedPackage = useMemo(() => {
    return pacotes.find(pkg => 
      pkg.id === value || 
      pkg.nome === value ||
      String(pkg.id) === String(value)
    );
  }, [pacotes, value]);

  const hasSelection = Boolean(displayName || selectedPackage?.nome);

  const commandContent = (
    <Command className="dropdown-solid">
      <CommandInput placeholder="Buscar pacote..." className="h-8 text-xs border-0 bg-transparent focus:ring-0" />
      <CommandList>
        <CommandEmpty className="text-xs py-2 text-muted-foreground">
          {isLoadingPacotes ? "Carregando pacotes..." : "Nenhum pacote encontrado."}
        </CommandEmpty>
        <CommandGroup>
          <CommandItem 
            value="nenhum-pacote"
            onSelect={handleClearPackage}
            className="text-xs hover:bg-foreground/[0.05] rounded cursor-pointer"
          >
            <Check className={cn("mr-2 h-3 w-3", !value ? "opacity-100" : "opacity-0")} />
            <span className="font-medium">Nenhum pacote</span>
          </CommandItem>
          {pacotes.map(pkg => (
            <CommandItem 
              key={pkg.id} 
              value={pkg.nome} 
              onSelect={(currentValue) => {
                const isSelected = pkg.id === value || pkg.nome === value || String(pkg.id) === String(value);
                if (!isSelected) {
                  onValueChange({
                    id: pkg.id,
                    nome: pkg.nome,
                    valor: `R$ ${(Number(pkg.valor) || 0).toFixed(2).replace(".", ",")}`,
                    valorFotoExtra: `R$ ${(Number(pkg.valorFotoExtra) || 35).toFixed(2).replace(".", ",")}`,
                    categoria: pkg.categoria,
                    produtosIncluidos: pkg.produtosIncluidos || []
                  });
                }
                setOpen(false);
              }}
              className="text-xs hover:bg-foreground/[0.05] rounded cursor-pointer"
            >
              <Check className={cn("mr-2 h-3 w-3", (pkg.id === value || pkg.nome === value || String(pkg.id) === String(value)) ? "opacity-100" : "opacity-0")} />
              <div className="flex flex-col">
                <span className="font-medium">{pkg.nome}</span>
                <span className="text-[10px] text-muted-foreground">
                  R$ {(Number(pkg.valor) || 0).toFixed(2).replace(".", ",")} • {pkg.categoria}
                </span>
                {pkg.fotosIncluidas > 0 && (
                  <span className="text-[10px] text-primary/80 font-medium">
                    ({pkg.fotosIncluidas} fotos)
                  </span>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (variant === "inline") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button 
            role="combobox" 
            aria-expanded={open} 
            disabled={disabled || isLoadingPacotes}
            className={cn(
              "flex items-center gap-2 h-10 w-full px-2 rounded-xl border bg-transparent text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/40 disabled:opacity-50 disabled:cursor-not-allowed",
              open ? "border-border bg-muted/20" : "border-border/60 hover:bg-muted/40",
              !hasSelection && "border-dashed"
            )}
          >
            <div className={cn("w-7 h-7 shrink-0 flex items-center justify-center rounded-lg", hasSelection ? "bg-muted/60" : "bg-transparent")}>
              <Package className={cn("h-3.5 w-3.5", hasSelection ? "text-muted-foreground" : "text-muted-foreground/50")} />
            </div>
            <div className="flex flex-col min-w-0 flex-1 justify-center">
              {hasSelection ? (
                <>
                  <span className="text-[13px] font-medium leading-none truncate">
                    {displayName || selectedPackage?.nome}
                  </span>
                  <span className={cn("text-[11px] text-muted-foreground truncate leading-none mt-1", !description && "opacity-0")}>
                    {description || "Personalizado"}
                  </span>
                </>
              ) : (
                <span className="text-xs italic text-muted-foreground truncate">
                  {isLoadingPacotes ? "Carregando..." : "Selecionar pacote"}
                </span>
              )}
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0 shadow-neumorphic border-0 dropdown-solid z-[9999]">
          {commandContent}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          role="combobox" 
          aria-expanded={open} 
          disabled={disabled || isLoadingPacotes}
          className="w-full justify-between h-8 text-xs font-normal border border-border/40 rounded-md bg-transparent hover:bg-card/60 dark:hover:bg-card/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className={cn("truncate", !hasSelection && "italic text-muted-foreground")}>
            {isLoadingPacotes
              ? "Carregando..."
              : hasSelection
                ? (displayName || selectedPackage?.nome)
                : "Selecione pacote"}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 shadow-neumorphic border-0 dropdown-solid z-[9999]">
        {commandContent}
      </PopoverContent>
    </Popover>
  );
};

// CORREÃ‡ÃƒO: Memoizar componente para evitar re-renders desnecessÃ¡rios
export const WorkflowPackageCombobox = memo(WorkflowPackageComboboxComponent);