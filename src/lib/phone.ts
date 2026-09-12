/**
 * Normalização canônica de telefones brasileiros para uso no módulo Conversas
 * e em qualquer outro módulo que precisar lidar com telefones para WhatsApp/E.164.
 *
 * Saída padronizada: "+55DDDXXXXXXXXX" (E.164 com prefixo `+`).
 *
 * Regras:
 * - Strip de tudo que não for dígito.
 * - 10 dígitos (DDD + 8 dígitos, fixo antigo) → prefixar +55.
 * - 11 dígitos (DDD + 9 dígitos, celular com 9) → prefixar +55.
 * - 12 dígitos começando com "55" (DDI sem +) → prefixar +.
 * - 13 dígitos começando com "55" (DDI + DDD + 9 dígitos) → prefixar +.
 * - Qualquer outro formato → null.
 *
 * @example
 *   normalizeBrPhone("(11) 98765-4321") // "+5511987654321"
 *   normalizeBrPhone("5511987654321")   // "+5511987654321"
 *   normalizeBrPhone("11987654321")     // "+5511987654321"
 *   normalizeBrPhone(null)              // null
 */
export function normalizeBrPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return `+${digits}`;
  }

  return null;
}
