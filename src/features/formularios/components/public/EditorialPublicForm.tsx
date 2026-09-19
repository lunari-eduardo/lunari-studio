/**
 * EditorialPublicForm — rota pública `/formulario/:token`.
 *
 * Thin wrapper que delega ao `FormPublicRenderer` (single source of truth).
 * O renderer já lida com tema público, layout editorial, navegação e submissão.
 */
import { FormPublicRenderer } from '@/components/formularios/shared/FormPublicRenderer';

interface EditorialPublicFormProps {
  token: string;
}

export function EditorialPublicForm({ token }: EditorialPublicFormProps) {
  return (
    <FormPublicRenderer token={token} wrapInPublicTheme />
  );
}
