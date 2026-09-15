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
import { AlertCircle } from 'lucide-react';
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
  validationErrors?: string[];
  onConfirm: () => void;
}

export function PublishDialog({
  open,
  onOpenChange,
  alreadyPublished,
  isPending,
  validationErrors = [],
  onConfirm,
}: PublishDialogProps) {
  const hasErrors = validationErrors.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {hasErrors ? (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                <AlertCircle size={20} />
                <AlertDialogTitle className="text-foreground">
                  Ajustes necessários antes de publicar
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="space-y-3 pt-1 text-muted-foreground">
                <p>
                  Para garantir uma experiência excelente aos seus clientes, complete as seguintes informações:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => onOpenChange(false)}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                Voltar e ajustar
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {alreadyPublished ? 'Atualizar formulário?' : 'Publicar formulário?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {alreadyPublished
                  ? 'As alterações ficarão imediatamente disponíveis no link público do formulário.'
                  : 'Seu formulário ficará disponível para envio aos seus clientes.'}
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
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
