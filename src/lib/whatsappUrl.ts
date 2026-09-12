import { normalizeBrPhone } from './phone';

/**
 * Constrói a URL do WhatsApp para a conversa direta quando possível.
 * Retorna { url, hasDirectContact }:
 *  - hasDirectContact=true → abre a conversa do cliente direto.
 *  - hasDirectContact=false → abre o seletor de contatos (fallback wa.me/?text=...).
 */
export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
): { url: string; hasDirectContact: boolean } {
  const normalized = normalizeBrPhone(phone);
  const encoded = encodeURIComponent(message);
  // wa.me aceita tanto com `+` quanto sem. Removemos o `+` para consistência.
  const withoutPlus = normalized?.replace(/^\+/, '');
  if (withoutPlus) {
    return { url: `https://wa.me/${withoutPlus}?text=${encoded}`, hasDirectContact: true };
  }
  return { url: `https://wa.me/?text=${encoded}`, hasDirectContact: false };
}
