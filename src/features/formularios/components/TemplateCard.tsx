/**
 * TemplateCard — cartão de template para a aba "Biblioteca Lunari".
 *
 * Design:
 *  • Fundo branco/off-white, borda sutil.
 *  • Card com botão dourado "Usar modelo" SEMPRE visível (não precisa de hover).
 *  • Badge de categoria e tempo estimado.
 *  • Menu ••• em hover com ações: Visualizar, Duplicar.
 *  • Para system templates: menu mostra apenas "Duplicar" (não "Excluir" nem "Editar").
 *  • Paleta: dourado/preto/branco/off-white/cinzas.
 */
import { useState } from 'react';
import {
  MoreHorizontal,
  Eye,
  Copy,
  Clock,
  LayoutGrid,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { FormularioTemplate } from '@/types/formulario';
import { useFormularioTemplates } from '@/hooks/useFormularioTemplates';

interface TemplateCardProps {
  template: FormularioTemplate;
  /** Callback chamado ao clicar em "Usar modelo". */
  onUseTemplate: (template: FormularioTemplate) => void;
  isUsing?: boolean;
}

export function TemplateCard({ template, onUseTemplate, isUsing }: TemplateCardProps) {
  const { duplicateTemplate, isDuplicating } = useFormularioTemplates();
  const [menuOpen, setMenuOpen] = useState(false);

  const isSystem = template.is_system;

  const handleDuplicate = async () => {
    setMenuOpen(false);
    await duplicateTemplate(template);
  };

  return (
    <article
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4',
        'transition-all duration-200',
        'hover:border-border hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-[hsl(var(--accent-gold))]/40 focus-within:border-[hsl(var(--accent-gold))]/40'
      )}
    >
      {/* Linha superior: título + menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {template.nome}
          </h3>
          {template.descricao && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
              {template.descricao}
            </p>
          )}
        </div>

        {/* Menu ••• — visível em hover */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            asChild
            onClick={(e) => e.stopPropagation()}
            disabled={isDuplicating}
            aria-label="Ações do template"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(
                'shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                'data-[state=open]:opacity-100',
                'h-7 w-7'
              )}
            >
              {isDuplicating ? (
                <Loader2 size={14} className="animate-spin" strokeWidth={1.8} />
              ) : (
                <MoreHorizontal size={14} strokeWidth={1.8} />
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={() => setMenuOpen(false)}
              className="gap-2 text-xs py-2"
            >
              <Eye size={14} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDuplicate}
              className="gap-2 text-xs py-2"
            >
              <Copy size={14} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
              {isSystem ? 'Usar como base' : 'Duplicar'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Metadados: categoria + tempo + campos */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className="text-[10px] px-2 py-0 font-medium border-[hsl(var(--accent-gold))]/30 text-[hsl(var(--accent-gold))]"
        >
          {template.categoria}
        </Badge>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock size={11} strokeWidth={1.8} />
          ~{template.tempo_estimado} min
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <LayoutGrid size={11} strokeWidth={1.8} />
          {template.campos.length} campo{template.campos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* CTA dourado — SEMPRE visível */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onUseTemplate(template);
        }}
        disabled={isUsing}
        className="w-full gap-1.5 bg-[hsl(var(--accent-gold))] text-foreground hover:bg-[hsl(var(--accent-gold))]/90 h-8 text-xs font-medium shadow-sm"
        aria-label={`Usar template: ${template.nome}`}
      >
        {isUsing ? (
          <Loader2 size={13} className="animate-spin" strokeWidth={2} />
        ) : (
          <>Usar modelo</>
        )}
      </Button>
    </article>
  );
}

export function TemplateCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  );
}
