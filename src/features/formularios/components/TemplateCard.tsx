/**
 * TemplateCard — cartão de template para a aba "Biblioteca Lunari".
 *
 * Design:
 *  • Fundo branco com sombra sutil em hover.
 *  • Imagem de capa no topo (placeholder gradiente quando não há imagem).
 *  • Badge de categoria dourado.
 *  • Título e descrição abaixo.
 *  • Rodapé com métricas: tempo estimado, número de campos.
 *  • Botão dourado "Usar modelo" sempre visível.
 *  • Menu ••• em hover com ações: Visualizar, Duplicar.
 *  • Paleta: dourado/preto/branco/off-white/cinzas.
 */
import { useState } from 'react';
import {
  MoreHorizontal,
  Eye,
  Copy,
  Trash2,
  Clock,
  LayoutGrid,
  Loader2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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

// Placeholder gradients para quando não houver imagem de capa
const COVER_GRADIENTS = [
  'from-amber-100/50 to-orange-100/50',
  'from-slate-100/50 to-zinc-100/50',
  'from-stone-100/50 to-neutral-100/50',
];

function getPlaceholderGradient(id: string): string {
  const index = id.charCodeAt(0) % COVER_GRADIENTS.length;
  return COVER_GRADIENTS[index];
}

interface TemplateCardProps {
  template: FormularioTemplate;
  /** Callback chamado ao clicar em "Usar modelo". */
  onUseTemplate: (template: FormularioTemplate) => void;
  /** Callback chamado ao clicar em "Visualizar". */
  onPreview?: (template: FormularioTemplate) => void;
  isUsing?: boolean;
}

export function TemplateCard({ template, onUseTemplate, onPreview, isUsing }: TemplateCardProps) {
  const { duplicateTemplate, deleteTemplate, isDuplicating, isDeleting } = useFormularioTemplates();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isSystem = template.is_system;
  const placeholderGradient = getPlaceholderGradient(template.id);
  const camposCount = template.campos?.length ?? 0;
  const tempoEstimado = template.tempo_estimado ?? 0;

  const handleDuplicate = async () => {
    setMenuOpen(false);
    await duplicateTemplate(template);
  };

  const handlePreview = () => {
    setMenuOpen(false);
    onPreview?.(template);
  };

  const handleDelete = async () => {
    setDeleteDialogOpen(false);
    setMenuOpen(false);
    await deleteTemplate(template.id);
  };

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden',
        'transition-all duration-200',
        'hover:border-border/80 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-[hsl(var(--accent-gold))]/40 focus-within:border-[hsl(var(--accent-gold))]/40'
      )}
    >
      {/* Imagem de capa (placeholder gradiente) */}
      <div
        className={cn(
          'relative h-32 w-full bg-gradient-to-br',
          placeholderGradient,
          'flex items-center justify-center'
        )}
      >
        {/* Placeholder icon */}
        <div className="opacity-30">
          <FileText size={40} strokeWidth={1} className="text-foreground/40" />
        </div>

        {/* Badge de sistema no canto superior esquerdo */}
        {isSystem && (
          <Badge
            variant="outline"
            className="absolute top-2 left-2 text-[9px] px-1.5 py-0 font-medium border-[hsl(var(--accent-gold))]/30 text-[hsl(var(--accent-gold))] bg-background/80 backdrop-blur-sm"
          >
            Lunari
          </Badge>
        )}

        {/* Menu ••• — visível em hover, canto superior direito */}
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
                'absolute top-2 right-2 shrink-0',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                'data-[state=open]:opacity-100',
                'h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background'
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
              onClick={handlePreview}
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
            {!isSystem && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2 text-xs py-2 text-destructive focus:text-destructive"
                >
                  <Trash2 size={14} strokeWidth={1.8} className="shrink-0" />
                  Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Conteúdo do card */}
      <div className="flex flex-col flex-1 gap-2 p-4">
        {/* Categoria badge */}
        <Badge
          variant="outline"
          className="self-start text-[10px] px-2 py-0 font-medium border-[hsl(var(--accent-gold))]/30 text-[hsl(var(--accent-gold))] bg-[hsl(var(--accent-gold))]/5"
        >
          {template.categoria}
        </Badge>

        {/* Título */}
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
          {template.nome}
        </h3>

        {/* Descrição */}
        {template.descricao && (
          <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
            {template.descricao}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Divisor */}
        <div className="border-t border-border/40 my-1" />

        {/* Rodapé: métricas */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {/* Tempo estimado */}
          {tempoEstimado > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={12} strokeWidth={1.8} />
              ~{tempoEstimado} min
            </span>
          )}

          {/* Número de campos */}
          <span className="flex items-center gap-1">
            <LayoutGrid size={12} strokeWidth={1.8} />
            {camposCount} campo{camposCount !== 1 ? 's' : ''}
          </span>

          {/* Spacer para empurrar o botão */}
          <div className="flex-1" />
        </div>

        {/* CTA dourado — SEMPRE visível */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onUseTemplate(template);
          }}
          disabled={isUsing}
          className="w-full gap-1.5 bg-[hsl(var(--accent-gold))] text-foreground hover:bg-[hsl(var(--accent-gold))]/90 h-8 text-xs font-medium shadow-sm mt-2"
          aria-label={`Usar template: ${template.nome}`}
        >
          {isUsing ? (
            <Loader2 size={13} className="animate-spin" strokeWidth={2} />
          ) : (
            <>Usar modelo</>
          )}
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              O template &quot;{template.nome}&quot; será removido permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

export function TemplateCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Placeholder da imagem */}
      <Skeleton className="h-32 w-full rounded-none" />

      {/* Conteúdo do card */}
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />

        <div className="flex-1" />
        <div className="border-t border-border/40 my-1 pt-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <Skeleton className="h-8 w-full rounded-lg mt-2" />
      </div>
    </div>
  );
}
