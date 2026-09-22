import { useState } from 'react';
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Star,
  Clock,
  Code2,
  Calendar,
  FileSignature,
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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ContratoTemplate } from '@/types/contrato';
import { countVariables, estimateReadingTime } from '../utils/contratoMetrics';
import { useContratoActions } from '../hooks/useContratoActions';

const COVER_GRADIENTS = [
  'from-amber-100/50 to-orange-100/50 dark:from-amber-950/30 dark:to-orange-950/20',
  'from-slate-100/50 to-zinc-100/50 dark:from-slate-900/40 dark:to-zinc-900/30',
  'from-stone-100/50 to-neutral-100/50 dark:from-stone-900/40 dark:to-neutral-900/30',
];

function getPlaceholderGradient(id: string): string {
  const index = id.charCodeAt(0) % COVER_GRADIENTS.length;
  return COVER_GRADIENTS[index];
}

interface ContratoCardProps {
  template: ContratoTemplate;
  onEdit: (template: ContratoTemplate) => void;
}

export function ContratoCard({ template, onEdit }: ContratoCardProps) {
  const { duplicateTemplate, setAsPadrao, deleteTemplate, isDuplicating, isSettingPadrao, isDeleting } =
    useContratoActions();

  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const placeholderGradient = getPlaceholderGradient(template.id);
  const totalVars = countVariables(template.conteudo);
  const readingTime = estimateReadingTime(template.conteudo);

  const handleDuplicate = async () => {
    setMenuOpen(false);
    await duplicateTemplate(template);
  };

  const handleSetPadrao = async () => {
    setMenuOpen(false);
    await setAsPadrao(template);
  };

  const handleDelete = async () => {
    setDeleteDialogOpen(false);
    setMenuOpen(false);
    await deleteTemplate(template.id, template.nome);
  };

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden',
        'transition-all duration-200',
        'hover:border-border/80 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-[hsl(var(--accent-gold))]/40'
      )}
    >
      {/* Topo / Capa */}
      <div
        className={cn(
          'relative h-28 w-full bg-gradient-to-br',
          placeholderGradient,
          'flex items-center justify-center cursor-pointer'
        )}
        onClick={() => onEdit(template)}
      >
        <div className="opacity-25 group-hover:scale-105 transition-transform duration-200">
          <FileSignature size={38} strokeWidth={1.2} className="text-foreground/50" />
        </div>

        {/* Badge "Padrão" */}
        {template.is_padrao && (
          <Badge
            variant="secondary"
            className="absolute top-2 left-2 text-[10px] px-2 py-0.5 font-medium bg-background/90 backdrop-blur-sm border border-amber-500/30 text-amber-600 dark:text-amber-400 gap-1"
          >
            <Star size={11} className="fill-amber-500 text-amber-500" />
            Padrão
          </Badge>
        )}

        {/* Menu ••• */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            asChild
            onClick={(e) => e.stopPropagation()}
            disabled={isDuplicating || isSettingPadrao || isDeleting}
            aria-label="Ações do modelo"
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
              {isDuplicating || isSettingPadrao || isDeleting ? (
                <Loader2 size={14} className="animate-spin" strokeWidth={1.8} />
              ) : (
                <MoreHorizontal size={14} strokeWidth={1.8} />
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onEdit(template)} className="gap-2 text-xs py-2">
              <Pencil size={14} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
              Editar modelo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate} className="gap-2 text-xs py-2">
              <Copy size={14} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
              Duplicar
            </DropdownMenuItem>
            {!template.is_padrao && (
              <DropdownMenuItem onClick={handleSetPadrao} className="gap-2 text-xs py-2">
                <Star size={14} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
                Definir como padrão
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-2 text-xs py-2 text-destructive focus:text-destructive"
            >
              <Trash2 size={14} strokeWidth={1.8} className="shrink-0" />
              Excluir modelo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Conteúdo do Card */}
      <div className="flex flex-col flex-1 gap-2 p-4">
        {/* Categoria */}
        {template.categoria && (
          <Badge
            variant="outline"
            className="self-start text-[10px] px-2 py-0 font-medium border-[hsl(var(--accent-gold))]/30 text-[hsl(var(--accent-gold))] bg-[hsl(var(--accent-gold))]/5 uppercase tracking-wider"
          >
            {template.categoria}
          </Badge>
        )}

        {/* Título */}
        <h3
          onClick={() => onEdit(template)}
          className="text-sm font-semibold text-foreground leading-snug line-clamp-2 cursor-pointer hover:text-[hsl(var(--accent-gold))] transition-colors"
        >
          {template.nome}
        </h3>

        {/* Descrição */}
        {template.descricao && (
          <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
            {template.descricao}
          </p>
        )}

        <div className="flex-1 min-h-2" />

        <div className="border-t border-border/40 my-1" />

        {/* Rodapé: Métricas */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1" title="Tempo estimado de leitura">
              <Clock size={12} strokeWidth={1.8} />
              ~{readingTime} min
            </span>

            <span className="flex items-center gap-1" title="Variáveis dinâmicas presentes">
              <Code2 size={12} strokeWidth={1.8} />
              {totalVars} var{totalVars !== 1 ? 's' : ''}
            </span>
          </div>

          {template.updated_at && (
            <span className="flex items-center gap-1 text-[10px]" title="Última atualização">
              <Calendar size={11} strokeWidth={1.6} />
              {format(new Date(template.updated_at), 'dd MMM yyyy', { locale: ptBR })}
            </span>
          )}
        </div>
      </div>

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover modelo de contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              "{template.nome}" será excluído. Contratos já gerados a partir deste modelo permanecerão intactos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

export function ContratoCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden">
      <Skeleton className="h-28 w-full" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-3 w-full rounded" />
        <div className="border-t border-border/40 my-2" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}
