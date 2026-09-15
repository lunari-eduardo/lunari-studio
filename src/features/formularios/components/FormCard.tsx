/**
 * FormCard — cartão de formulário para a listagem "Meus Formulários".
 *
 * Design:
 *  • Fundo branco com sombra sutil em hover.
 *  • Imagem de capa no topo (placeholder gradiente quando não há imagem).
 *  • Badge de categoria dourado abaixo da imagem.
 *  • Título (line-clamp-2) e descrição (line-clamp-2) abaixo.
 *  • Rodapé com métricas: número de perguntas, duração, contagem de respostas.
 *  • Card inteiramente clicável → navega para detalhes.
 *  • Menu "•••" aparece em hover (top-right) com ações:
 *    Visualizar | Editar | Duplicar | Arquivar | Excluir.
 *  • Paleta: dourado/preto/branco/off-white/cinzas.
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
  Clock,
  LayoutGrid,
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
  const placeholderGradient = getPlaceholderGradient(form.id);

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
        aria-label={`Formulário: ${form.titulo}`}
        className={cn(
          'group relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden',
          'cursor-pointer transition-all duration-200',
          'hover:border-border/80 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-gold))]/40 focus-visible:border-[hsl(var(--accent-gold))]/40'
        )}
        style={{ minHeight: '280px' }}
      >
        {/* Imagem de capa (placeholder gradiente por enquanto) */}
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

          {/* Status badge no canto superior esquerdo */}
          <div className="absolute top-2 left-2">
            <StatusBadge status={form.status_envio} />
          </div>

          {/* Menu ••• — visível em hover, canto superior direito */}
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
                  'absolute top-2 right-2 shrink-0',
                  // Mobile: sempre visível (touch target ≥44px). Desktop: hover.
                  'opacity-100 md:opacity-0 md:group-hover:opacity-100',
                  'transition-opacity duration-150',
                  'data-[state=open]:opacity-100',
                  // h-10 w-10 = 40px (~ suficiente p/ mobile, mas ≥ h-9 evita clique acidental)
                  'h-9 w-9 bg-background/85 backdrop-blur-sm hover:bg-background'
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

        {/* Conteúdo do card */}
        <div className="flex flex-col flex-1 gap-2 p-4">
          {/* Categoria badge */}
          <Badge
            variant="outline"
            className="self-start text-[10px] px-2 py-0 font-medium border-[hsl(var(--accent-gold))]/30 text-[hsl(var(--accent-gold))] bg-[hsl(var(--accent-gold))]/5"
          >
            {(form as any).categoria || 'Geral'}
          </Badge>

          {/* Título */}
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {form.titulo}
          </h3>

          {/* Descrição */}
          {form.descricao && (
            <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
              {form.descricao}
            </p>
          )}

          {/* Cliente (se existir) */}
          {form.cliente && (
            <p className="text-[11px] text-muted-foreground truncate">
              {form.cliente.nome}
            </p>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Divisor */}
          <div className="border-t border-border/40 my-1" />

          {/* Rodapé: métricas */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {/* Número de perguntas */}
            <span className="flex items-center gap-1">
              <LayoutGrid size={12} strokeWidth={1.8} />
              {form.campos.length} pergunta{form.campos.length !== 1 ? 's' : ''}
            </span>

            {/* Duração */}
            {form.tempo_estimado > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={12} strokeWidth={1.8} />
                ~{form.tempo_estimado} min
              </span>
            )}

            {/* Contagem de respostas ou data */}
            <span className="ml-auto flex items-center gap-1">
              {isAnswered ? (
                <>
                  <MessageSquare size={12} strokeWidth={1.8} className="text-[hsl(var(--accent-gold))]" />
                  {responseCount ?? 1} resposta{(responseCount ?? 1) !== 1 ? 's' : ''}
                </>
              ) : isPending ? (
                <>
                  <Send size={12} strokeWidth={1.8} />
                  <FormattedDate date={form.enviado_em} label="" />
                </>
              ) : (
                <>
                  <FileText size={12} strokeWidth={1.8} />
                  <FormattedDate date={form.created_at} label="" />
                </>
              )}
            </span>
          </div>
        </div>
      </article>

      {/* Diálogo de confirmação de exclusão */}
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
            <Skeleton className="h-3 w-20 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
