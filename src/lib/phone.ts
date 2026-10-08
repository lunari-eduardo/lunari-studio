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
    return `55${digits}`;
  }

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits;
  }

  return null;
}

/**
 * Normaliza o número especificamente para as regras da API do WhatsApp no Brasil:
 * - DDD 11 a 28: WhatsApp EXIGE o 9º dígito (13 dígitos total: 55 + DD + 9 + 8 dígitos).
 * - DDD 31 a 99: WhatsApp IGNORA o 9º dígito (12 dígitos total: 55 + DD + 8 dígitos).
 * Esta função força esse padrão para garantir match exato entre o CRM e a API de WhatsApp.
 */
export function normalizeWhatsApp(phone: string | null | undefined): string | null {
  let normalized = normalizeBrPhone(phone);
  if (!normalized) {
    // Fallback se não for formato BR (ex: número internacional)
    const digitsOnly = phone?.replace(/\D/g, '');
    return digitsOnly ? digitsOnly : null;
  }
  
  if (normalized.startsWith('55')) {
    const ddd = parseInt(normalized.substring(2, 4), 10);
    
    // DDD > 30: Força 8 dígitos (sem o 9)
    if (ddd > 30 && normalized.length === 13 && normalized[4] === '9') {
      return normalized.substring(0, 4) + normalized.substring(5);
    }
    
    // DDD <= 28: Força 9 dígitos (com o 9)
    if (ddd <= 28 && normalized.length === 12) {
      return normalized.substring(0, 4) + '9' + normalized.substring(4);
    }
  }
  
  return normalized;
}

/**
 * Retorna o link oficial e pronto do wa.me usando as regras corretas de normalização.
 */
export function getWhatsAppLink(phone: string | null | undefined, message?: string): string | null {
  const normalized = normalizeWhatsApp(phone);
  if (!normalized) return null;
  let url = `https://wa.me/${normalized}`;
  if (message) {
    url += `?text=${encodeURIComponent(message)}`;
  }
  return url;
}
