import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ClientesPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const ClientesPagination: React.FC<ClientesPaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}) => {
  if (totalCount === 0) return null;

  // Cálculo dos limites exibidos (ex: 1–30 de 531)
  const from = Math.min((currentPage - 1) * pageSize + 1, totalCount);
  const to = Math.min(currentPage * pageSize, totalCount);

  // Gera os números de páginas com ellipsis (ex: 1, 2, 3, '...', 18)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Sempre inclui a primeira página
    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    // Páginas ao redor da atual
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    // Sempre inclui a última página
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-12 sm:pb-8 border-t border-border/20">
      {/* Texto de Exibição */}
      <div className="text-xs text-muted-foreground order-2 sm:order-1">
        Exibindo <span className="font-medium text-foreground">{from}–{to}</span> de{' '}
        <span className="font-medium text-foreground">{totalCount}</span> clientes
      </div>

      {/* Controles de Navegação Central */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Anterior */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 w-8 rounded-lg border-border/30 hover:bg-muted/40 disabled:opacity-30"
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Números das Páginas */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs text-muted-foreground select-none"
                >
                  …
                </span>
              );
            }

            const pageNum = p as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`h-8 min-w-[32px] px-2 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-accent-gold text-zinc-950 font-bold shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Próximo */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 w-8 rounded-lg border-border/30 hover:bg-muted/40 disabled:opacity-30"
          title="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Seletor de Quantidade por Página */}
      <div className="flex items-center gap-2 order-3">
        <Select
          value={String(pageSize)}
          onValueChange={(val) => onPageSizeChange(Number(val))}
        >
          <SelectTrigger className="h-8 text-xs w-[130px] border-border/30 bg-card/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="30">30 por página</SelectItem>
            <SelectItem value="50">50 por página</SelectItem>
            <SelectItem value="100">100 por página</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
