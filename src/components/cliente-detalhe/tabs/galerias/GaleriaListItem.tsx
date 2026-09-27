import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Image as ImageIcon, 
  Copy, 
  Check, 
  ArrowUpRight, 
  MoreHorizontal, 
  Pencil, 
  Send, 
  RotateCcw, 
  Trash2 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/utils/financialUtils';
import { cn } from '@/lib/utils';
import { GaleriaItem } from './types';

interface GaleriaListItemProps {
  item: GaleriaItem;
  copiedToken: string | null;
  onCopyLink: (e: React.MouseEvent, token: string | null) => void;
  onOpenGallery: (item: GaleriaItem) => void;
  onEdit: (item: GaleriaItem) => void;
  onShare: (item: GaleriaItem) => void;
  onReactivate: (item: GaleriaItem) => void;
  onDelete: (item: GaleriaItem) => void;
}

export function GaleriaListItem({
  item,
  copiedToken,
  onCopyLink,
  onOpenGallery,
  onEdit,
  onShare,
  onReactivate,
  onDelete,
}: GaleriaListItemProps) {
  const isConfirmed = item.statusSelecao === 'selecao_completa' || item.status === 'selection_completed';
  const valorExtraFormatado = item.valorTotalVendido > 0 ? item.valorTotalVendido : item.valorExtras;

  return (
    <div
      onClick={() => onOpenGallery(item)}
      className="px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors cursor-pointer group"
    >
      {/* Esquerda: Miniatura + Nome + Pacote */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border border-border/20">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground truncate group-hover:text-accent-gold transition-colors">
              {item.sessionName}
            </span>
            {item.packageName && (
              <span className="text-[11px] text-muted-foreground/80 bg-muted/40 px-1.5 py-0.5 rounded">
                {item.packageName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs">
            {/* Status discreto */}
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                isConfirmed ? "bg-emerald-500" : "bg-amber-500"
              )} />
              <span className="text-muted-foreground text-[11px]">
                {item.tipo === 'entrega' ? 'Transfer' : isConfirmed ? 'Seleção Concluída' : 'Em Seleção'}
              </span>
            </div>

            {/* Fotos extras discretas se houver */}
            {item.extraCount > 0 && (
              <span className="text-[11px] text-amber-500/90 font-medium">
                +{item.extraCount} {item.extraCount === 1 ? 'extra' : 'extras'}
                {valorExtraFormatado > 0 && ` (${formatCurrency(valorExtraFormatado)})`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Direita: Ações */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
        {item.raw.status === 'archived' ? (
          <Badge variant="outline" className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted/30">
            Arquivada
          </Badge>
        ) : (
          <>
            {item.publicToken && (
              <button
                type="button"
                onClick={(e) => onCopyLink(e, item.publicToken)}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Copiar link da galeria"
              >
                {copiedToken === item.publicToken ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="hidden sm:inline text-[11px] text-emerald-500">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-[11px]">Link</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenGallery(item)}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors font-medium"
            >
              <span>Ver Galeria</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShare(item)}>
                  <Send className="h-3.5 w-3.5 mr-2" />
                  Compartilhar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReactivate(item)}>
                  <RotateCcw className="h-3.5 w-3.5 mr-2" />
                  Reativar prazo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(item)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}
