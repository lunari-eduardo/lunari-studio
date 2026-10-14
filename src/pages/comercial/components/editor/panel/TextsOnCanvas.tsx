import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FOCUS_RING } from './panelStyles';

interface TextsOnCanvasProps {
  /** Quantos textos o formulário recolhido guarda. */
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Os campos de texto (com a ajuda de IA de sempre). */
  children: React.ReactNode;
}

/**
 * Textos curtos que a arte já edita no lugar (duplo clique): o painel não os repete por padrão,
 * mas o formulário continua a um clique — é o caminho de quem usa teclado ou toque e o da ajuda de IA.
 */
export function TextsOnCanvas({ count, open, onOpenChange, children }: TextsOnCanvasProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="space-y-3">
      <p className="text-xs leading-snug text-muted-foreground">
        Edite estes textos direto na arte: duplo clique (ou duplo toque) no texto.
      </p>
      <CollapsibleTrigger
        className={cn(
          'group flex h-9 w-full items-center justify-between rounded-xl border border-border/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/40',
          FOCUS_RING
        )}
      >
        <span>Editar como formulário</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {count}
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}
