/** Domínio público do Lunari Hub — SEM o prefixo `app.` */
const PUBLIC_ORIGIN = 'https://lunarihub.com';

/**
 * Utilitário para gerar a URL pública de um formulário.
 * Padrão: https://lunarihub.com/formulario/{public_token}
 */
export function getFormPublicUrl(form: Pick<Formulario, 'public_token'>): string {
  if (!form.public_token) return '';
  return `${PUBLIC_ORIGIN}/formulario/${form.public_token}`;
}
