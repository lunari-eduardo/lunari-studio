import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, User, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConversasContatos } from '@/hooks/useConversasContatos';
import { DROPDOWN_PANEL, DROPDOWN_ITEM } from '@/lib/dialogTokens';
import { formatPhone } from '@/components/conversas/shared/format';

// Função para normalizar texto
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
};

interface ContactSearchComboboxProps {
  value?: string;
  onSelect: (contatoId: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ContactSearchCombobox({
  value,
  onSelect,
  placeholder = "Buscar contato do WhatsApp...",
  className
}: ContactSearchComboboxProps) {
  const { contatos, isLoading } = useConversasContatos();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContatos, setFilteredContatos] = useState<typeof contatos>([]);
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Considerar apenas contatos não vinculados a clientes
  const availableContatos = contatos.filter(c => !c.cliente_id);
  const selectedContato = contatos.find(c => c.id === value);

  useEffect(() => {
    if (!searchTerm.trim()) {
      // Por padrão mostrar os 30 mais recentes na ordem real do WhatsApp
      setFilteredContatos(availableContatos.slice(0, 30));
    } else {
      const normalizedSearch = normalizeText(searchTerm);
      const numericSearch = searchTerm.replace(/[^0-9]/g, '');
      const filtered = availableContatos.filter(contato => {
        const normalizedName = normalizeText(contato.nome || '');
        const normalizedPhone = (contato.phone_normalized || '').replace(/[^0-9]/g, '');
        const matchesPhone = numericSearch.length > 0 && normalizedPhone.includes(numericSearch);
        
        return normalizedName.includes(normalizedSearch) || matchesPhone;
      });
      setFilteredContatos(filtered.slice(0, 30));
    }
  }, [searchTerm, availableContatos]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (contatoId: string) => {
    onSelect(contatoId);
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

  const handleClear = () => {
    onSelect('');
    setSearchTerm('');
    setIsEditing(false);
    setIsOpen(false);
  };

  const displayValue = (isEditing || !selectedContato) 
    ? searchTerm 
    : (selectedContato.nome?.trim() || formatPhone(selectedContato.phone_normalized));

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={isLoading ? "Carregando contatos..." : placeholder}
          className="pr-12 text-xs"
          disabled={isLoading}
          autoComplete="off"
        />
        {selectedContato && !isEditing && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      {isOpen && (
        <div className={DROPDOWN_PANEL}>
          {filteredContatos.length > 0 ? (
            filteredContatos.map((contato) => (
              <div
                key={contato.id}
                onClick={() => handleSelect(contato.id)}
                className={DROPDOWN_ITEM}
              >
                <div className="flex items-center">
                  <MessageCircle className="h-3.5 w-3.5 mr-2.5 text-[#10B981] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-popover-foreground truncate text-xs">
                        {contato.nome?.trim() || formatPhone(contato.phone_normalized)}
                      </span>
                      {value === contato.id && (
                        <Check className="ml-2 h-3.5 w-3.5 text-lunar-success shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {formatPhone(contato.phone_normalized)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Nenhum contato encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
