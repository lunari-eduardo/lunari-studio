/**
 * FormCard — cartão de formulário para a listagem "Meus Formulários".
 *
 * Design:
 *  • Fundo branco/off-white, borda sutil, sombra leve em hover.
 *  • Card inteiramente clicável → navega para detalhes.
 *  • Menu "•••" aparece em hover (top-right) com ações:
 *    Visualizar | Editar | Duplicar | Arquivar | Excluir.
 *  • "Excluir" é neutro no menu, vermelho apenas no AlertDialog de confirmação.
 *  • Métricas reais: data de envio, quantidade de respostas (query derivada),
 *    data da última resposta.
 *  • Paleta: dourado/preto/branco/off-white/cinzas (sem verde/amarelo/vermelho).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Archive,
  Trash2,
  MessageSquare,
  Send,
  FileText,
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
import type { Formulario } from '@/types/formulario';
import { useFormActions } from '../hooks/useFormActions';

// ── helpers ────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  nao_enviado: 'Rascunho',
  enviado: 'Enviado',
  respondido: 'Respondido',
  expirado: 'Expirado',
};

/** Badge com a paleta dourado/preto/branco — apenas cores semânticas neutras. */
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    nao_enviado: 'bg-muted text-muted-foreground border-border/50',
    enviado: 'bg-muted text-muted-foreground border-border/50',
    respondido: 'bg-[hsl(var(--accent-gold))]/10 text-[hsl(var(--accent-gold))] border-[hsl(var(--accent-gold))]/20',
    expirado: 'bg-muted text-muted-foreground border-border/50',
  };

  return (
    <Badge
      className={cn(
        'text-[10px] px-2 py-0 font-medium border',
        variants[status] ?? 'bg-muted text-muted-foreground border-border/50'
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function FormattedDate({ date, label }: { date: string | null | undefined; label: string }) {
  if (!date) return null;
  try {
    return (
      <span className="text-[11px] text-muted-foreground">
        {label} {format(new Date(date), 'dd MMM yyyy', { locale: ptBR })}
      </span>
    );
  } catch {
    return null;
  }
}

// ── component ─────────────────────────────────────────────────────────────────

interface FormCardProps {
  form: Formulario;
  /** Contagem de respostas vinda de query derivada. O componente pai gerencia o loading. */
  responseCount?: number;
  isLoading?: boolean;
  /** Navegação para o editor (rascunho). Se undefined, ação é oculta. */
  editorUrl?: string;
}

export function FormCard({ form, responseCount, isLoading, editorUrl }: FormCardProps) {
  const navigate = useNavigate();
  const { archiveFormulario, duplicateFormulario, deleteFormulario, isArchiving, isDuplicating, isDeleting } =
    useFormActions();

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isAnswered = form.status_envio === 'respondido';
  const isArchived = form.status === 'arquivado';
  const isPending = form.status_envio === 'enviado';
  const isDraft = form.status_envio === 'nao_enviado';

  const handleCardClick = () => {
    navigate(`/formularios/${form.id}`);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    navigate(`/formularios/${form.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (editorUrl) navigate(editorUrl);
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    await duplicateFormulario(form);
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    await archiveFormulario(form.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setConfirmDelete(true);
  };

  const handleDeleteConfirm = async () => {
    await deleteFormulario(form.id);
    setConfirmDelete(false);
  };

  const menuItems = [
    {
      label: 'Visualizar',
      icon: <Eye size={14} strokeWidth={1.8} />,
      onClick: handleView,
    },
    ...(editorUrl && isDraft
      ? [
          {
            label: 'Editar',
            icon: <Pencil size={14} strokeWidth={1.8} />,
            onClick: handleEdit,
          },
        ]
      : []),
    {
      label: 'Duplicar',
      icon: <Copy size={14} strokeWidth={1.8} />,
      onClick: handleDuplicate,
    },
    ...(!isArchived
      ? [
          {
            label: 'Arquivar',
            icon: <Archive size={14} strokeWidth={1.8} />,
            onClick: handleArchive,
          },
        ]
      : []),
    {
      label: 'Excluir',
      icon: <Trash2 size={14} strokeWidth={1.8} />,
      onClick: handleDeleteClick,
      separatorBefore: true,
    },
  ];

  const isMenuDisabled = isArchiving || isDuplicating || isDeleting;

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
        aria-label={`Formulário: ${form.titulo}`}
        className={cn(
          'group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4',
          'cursor-pointer transition-all duration-200',
          'hover:border-border hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-gold))]/40 focus-visible:border-[hsl(var(--accent-gold))]/40'
        )}
      >
        {/* Linha superior: título + menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
              {form.titulo}
            </h3>
            {form.cliente && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {form.cliente.nome}
              </p>
            )}
          </div>

          {/* Menu ••• — visível em hover */}
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger
              asChild
              onClick={(e) => e.stopPropagation()}
              disabled={isMenuDisabled}
              aria-label="Ações do formulário"
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
                {isMenuDisabled ? (
                  <Loader2 size={14} className="animate-spin" strokeWidth={1.8} />
                ) : (
                  <MoreHorizontal size={14} strokeWidth={1.8} />
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-44"
              onClick={(e) => e.stopPropagation()}
            >
              {menuItems.map((item, i) => (
                <div key={item.label}>
                  {item.separatorBefore && i > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={item.onClick}
                    className="gap-2 text-xs py-2"
                  >
                    <span className="text-muted-foreground shrink-0">{item.icon}</span>
                    {item.label}
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Linha inferior: métricas + status */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Métricas */}
          <div className="flex items-center gap-3 min-w-0">
            {isLoading ? (
              <Skeleton className="h-3 w-24" />
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {isAnswered ? (
                  <>
                    <MessageSquare size={12} strokeWidth={1.8} className="text-[hsl(var(--accent-gold))]" />
                    <span>
                      {responseCount ?? 1} resposta{responseCount !== 1 ? 's' : ''}
                    </span>
                  </>
                ) : isPending ? (
                  <>
                    <Send size={12} strokeWidth={1.8} />
                    <FormattedDate date={form.enviado_em} label="Enviado" />
                  </>
                ) : (
                  <>
                    <FileText size={12} strokeWidth={1.8} />
                    <FormattedDate date={form.created_at} label="Criado" />
                  </>
                )}
              </div>
            )}
          </div>

          <StatusBadge status={form.status_envio} />
        </div>
      </article>

      {/* Diálogo de confirmação de exclusão — vermelho SOMENTE aqui */}
      <AlertDialog open={confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              O formulário <strong>&quot;{form.titulo}&quot;</strong> e todas as suas
              respostas serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive/40"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function FormCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
    </div>
  );
}
