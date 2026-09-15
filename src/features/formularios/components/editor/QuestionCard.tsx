/**
 * QuestionCard — card compacto que representa uma pergunta na lista.
 *
 * Estrutura (referência visual):
 *
 *  ⠿  TIPO             Obrigatório | Opcional     ⋮
 *     Pergunta
 *     Descrição
 *
 * O ícone da esquerda é o drag handle. O `...` abre menu (Editar / Duplicar /
 * Excluir). Clicar no card abre o drawer de edição.
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CAMPO_TIPO_LABELS, type FormularioCampo } from '@/types/formulario';

interface QuestionCardProps {
  campo: FormularioCampo;
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function QuestionCard({
  campo,
  onClick,
  onDuplicate,
  onDelete,
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: campo.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-lg border bg-background transition-all',
        'hover:border-foreground/30',
        isDragging && 'border-foreground/40 shadow-lg opacity-80',
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={cn(
            'mt-0.5 flex h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground transition-colors',
            'hover:bg-muted hover:text-foreground active:cursor-grabbing',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
          )}
          aria-label="Arrastar para reordenar"
          title="Arrastar para reordenar"
        >
          <GripVertical size={14} aria-hidden strokeWidth={2} />
        </button>

        {/* Conteúdo clicável */}
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'flex-1 min-w-0 text-left rounded',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
          )}
          aria-label={`Editar pergunta: ${campo.label || 'sem título'}`}
        >
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
              {CAMPO_TIPO_LABELS[campo.tipo]}
            </span>
          </div>
          <h4 className="mt-1 text-sm font-medium text-foreground line-clamp-2">
            {campo.label || (
              <span className="italic text-muted-foreground">Sem título</span>
            )}
          </h4>
          {campo.descricao && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {campo.descricao}
            </p>
          )}
        </button>

        {/* Badge obrigatório/opcional */}
        <div className="shrink-0">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide',
              campo.obrigatorio
                ? 'bg-foreground/10 text-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {campo.obrigatorio ? 'Obrigatório' : 'Opcional'}
          </span>
        </div>

        {/* Menu ⋮ */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground"
              aria-label="Ações da pergunta"
            >
              <MoreVertical size={14} aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={onClick} className="gap-2">
              <Pencil size={14} aria-hidden /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate} className="gap-2">
              <Copy size={14} aria-hidden /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onDelete}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 size={14} aria-hidden /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
