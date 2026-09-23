import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, Package as PackageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DROPDOWN_PANEL, DROPDOWN_ITEM } from '@/lib/dialogTokens';
import { formatCurrency } from '@/utils/currencyUtils';
import { useRealtimeConfiguration } from '@/hooks/useRealtimeConfiguration';

// Função para normalizar texto (remover acentos e caracteres especiais)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .replace(/[^a-z0-9\s]/g, ''); // Remove caracteres especiais
};

interface PackageOption {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface PackageSearchComboboxProps {
  value?: string;
  onSelect: (packageId: string, packageData?: any) => void;
  placeholder?: string;
  filtrarPorCategoria?: string;
  hidePrice?: boolean;
}

export default function PackageSearchCombobox({
  value,
  onSelect,
  placeholder = "Buscar pacote...",
  filtrarPorCategoria,
  hidePrice = false,
}: PackageSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const realtimeConfig = useRealtimeConfiguration();
  
  // Use real-time data from Supabase
  const pacotes = realtimeConfig.pacotes || [];
  const categorias = realtimeConfig.categorias || [];
  
  // Convert packages to the local PackageOption format with correct category conversion
  const availablePackages: PackageOption[] = pacotes.map((pacote: any) => {
    let categoria = 'Sem categoria';
    if (pacote.categorias?.nome) {
      categoria = pacote.categorias.nome;
    } else if (typeof pacote.categoria === 'string' && pacote.categoria.trim()) {
      categoria = pacote.categoria;
    } else if (pacote.categoria_id) {
      const categoriaConfig = categorias.find((cat: any) => cat.id === pacote.categoria_id);
      categoria = categoriaConfig?.nome || pacote.categoria_id;
    }
    
    return {
      id: pacote.id,
      name: pacote.nome,
      price: Number(pacote.valor_base ?? pacote.valor ?? pacote.valorVenda ?? 0),
      category: categoria,
    };
  });
  
  const [filteredPackages, setFilteredPackages] = useState<PackageOption[]>(availablePackages);
  const selectedPackage = availablePackages.find((pkg) => pkg.id === value);

  useEffect(() => {
    let filtered = availablePackages;
    
    // Filtrar por categoria se especificada
    if (filtrarPorCategoria) {
      filtered = filtered.filter((pkg) => pkg.category === filtrarPorCategoria);
    }
    
    // Filtrar por termo de busca
    if (searchTerm) {
      const normalizedSearch = normalizeText(searchTerm);
      filtered = filtered.filter((pkg) => {
        const normalizedName = normalizeText(pkg.name);
        const normalizedCategory = normalizeText(pkg.category);
        return (
          normalizedName.includes(normalizedSearch) ||
          normalizedCategory.includes(normalizedSearch)
        );
      });
    }
    
    setFilteredPackages(filtered);
  }, [searchTerm, pacotes, filtrarPorCategoria]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Agrupar pacotes por categoria
  const groupedPackages = filteredPackages.reduce((acc, pkg) => {
    const cat = pkg.category || 'Sem categoria';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(pkg);
    return acc;
  }, {} as Record<string, PackageOption[]>);

  const sortedCategories = Object.keys(groupedPackages).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  const handleSelect = (packageId: string) => {
    const pacoteSelecionado =
      pacotes.find((p: any) => p.id === packageId) ||
      availablePackages.find((p) => p.id === packageId);
    onSelect(packageId, pacoteSelecionado);
    setIsOpen(false);
    setSearchTerm('');
    setIsEditing(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setIsEditing(false);
      setSearchTerm('');
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect('', null);
    setSearchTerm('');
    setIsEditing(false);
    setIsOpen(false);
  };

  const displayValue = isEditing || !selectedPackage
    ? searchTerm
    : selectedPackage.name;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          id="package-search-input"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          title={selectedPackage?.name}
          className="h-10 rounded-lg pr-16 text-base sm:text-sm"
          aria-label="Buscar pacote"
          autoComplete="off"
        />
        {selectedPackage && !isEditing && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-8 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Limpar seleção"
            aria-label="Limpar pacote selecionado"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen((prev) => !prev);
            if (!isOpen) {
              setIsEditing(true);
              inputRef.current?.focus();
            } else {
              setIsEditing(false);
              setSearchTerm('');
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label={isOpen ? "Fechar opções de pacote" : "Abrir opções de pacote"}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </div>

      {isOpen && (
        <div className={DROPDOWN_PANEL}>
          {sortedCategories.length > 0 ? (
            sortedCategories.map((category) => (
              <div key={category}>
                <div className="px-3 py-1.5 dropdown-solid-header text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/20 bg-muted/40 sticky top-0 z-10 backdrop-blur-sm">
                  {category}
                </div>
                {groupedPackages[category].map((pkg) => {
                  const isSelected = value === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => handleSelect(pkg.id)}
                      className={cn(
                        DROPDOWN_ITEM,
                        "hover:bg-muted/50 transition-colors py-2 cursor-pointer",
                        isSelected && "bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <PackageIcon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isSelected
                              ? "text-accent-gold"
                              : "text-muted-foreground"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "font-medium truncate text-xs sm:text-sm",
                                isSelected
                                  ? "text-foreground font-semibold"
                                  : "text-foreground"
                              )}
                              title={pkg.name}
                            >
                              {pkg.name}
                            </span>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            )}
                          </div>
                          {!hidePrice && (
                            <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                              {formatCurrency(pkg.price || 0)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              Nenhum pacote encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
