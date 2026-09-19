/**
 * FormularioPublico — rota pública `/formulario/:token`.
 *
 * Usa o EditorialPublicForm (layout editorial: capa à esquerda + pergunta à direita).
 */
import { useParams } from 'react-router-dom';
import { EditorialPublicForm } from '@/features/formularios/components/public/EditorialPublicForm';

export default function FormularioPublico() {
  const { token } = useParams<{ token: string }>();

  if (!token) return null;

  return <EditorialPublicForm token={token} />;
}
