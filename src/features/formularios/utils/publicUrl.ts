/**
 * Utilitário para gerar a URL pública de um formulário.
 * Padrão: {origin}/f/{public_token}
 */
import type { Formulario } from '@/types/formulario';

/** Retorna a URL pública do formulário ou string vazia se não houver token. */
export function getFormPublicUrl(form: Pick<Formulario, 'public_token'>): string {
  if (!form.public_token) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/f/${form.public_token}`;
}
