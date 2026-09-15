/**
 * PublishDialog — confirmação humana para publicar um formulário.
 *
 * Cópia segue o brief 19:
 *   Título: "Publicar formulário?"
 *   Descrição: "Seu formulário ficará disponível para envio aos clientes."
 *
 * Quando o formulário já está publicado, o botão principal muda de texto
 * para "Atualizar formulário" e o título vira "Atualizar formulário?".
 */
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

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyPublished: boolean;
  isPending: boolean;
  onConfirm: () => void;
}

export function PublishDialog({
  open,
  onOpenChange,
  alreadyPublished,
  isPending,
  onConfirm,
}: PublishDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {alreadyPublished ? 'Atualizar formulário?' : 'Publicar formulário?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {alreadyPublished
              ? 'As alterações ficarão imediatamente disponíveis no link público do formulário.'
              : 'Seu formulário ficará disponível para envio aos clientes.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {alreadyPublished ? 'Atualizar' : 'Publicar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
