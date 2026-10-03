import { generatePublicLink } from '@/utils/publicLinks';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Utilitário para gerar a URL pública de um formulário.
 */
export function getFormPublicUrl(
  form: { public_token?: string | null }, 
  profile?: { namespace?: string | null; custom_domain?: string | null } | null
): string {
  if (!form.public_token) return '';
  return generatePublicLink({
    type: 'form',
    token: form.public_token,
    profile
  });
}
