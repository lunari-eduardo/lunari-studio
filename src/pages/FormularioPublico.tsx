/**
 * FormularioPublico — rota pública `/formulario/:token`.
 *
 * Página fina: extrai o token da URL e delega todo o markup e lógica para
 * `FormPublicRenderer` (componente compartilhado também usado pelo preview do
 * editor de formulários).
 *
 * Comportamento idêntico ao original — ver histórico deste arquivo antes da
 * extração em `docs/forms-audit.md`.
 */
import { useParams } from 'react-router-dom';
import { FormPublicRenderer } from '@/components/formularios/shared/FormPublicRenderer';

export default function FormularioPublico() {
  const { token } = useParams<{ token: string }>();

  // FormPublicRenderer suporta ausência de token (mostra estado neutro);
  // nunca deve acontecer na rota pública (rota exige :token), mas é um guard
  // defensivo caso alguém navegue manualmente para `/formulario/`.
  if (!token) return null;

  return <FormPublicRenderer token={token} />;
}
