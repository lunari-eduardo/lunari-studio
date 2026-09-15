/**
 * DeleteQuestionDialog — confirmação destrutiva para excluir uma pergunta.
 *
 * Usado pelo `QuestionEditor`. Vermelho apenas neste contexto (regra 14 do brief).
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
import { Trash2 } from 'lucide-react';

interface DeleteQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionLabel: string | undefined;
  onConfirm: () => void;
}

export function DeleteQuestionDialog({
  open,
  onOpenChange,
  questionLabel,
  onConfirm,
}: DeleteQuestionDialogProps) {
  const label = questionLabel?.trim() || 'esta pergunta';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
          <AlertDialogDescription>
            "{label}" será removida deste formulário. Você pode adicionar uma
            nova pergunta a qualquer momento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
          >
            <Trash2 size={14} aria-hidden />
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
