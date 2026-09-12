/**
 * Helpers de normalização de telefone usados pelas rotas do Worker.
 *
 * Mantém compatibilidade com o formato armazenado no banco (`55DDD...` sem `+`),
 * que é o mesmo formato aceito pela Evolution API.
 *
 * Função canônica está em `src/lib/phone.ts` — esta é uma cópia intencional para
 * o Worker porque ele não tem acesso ao bundle do frontend.
 */

/**
 * Normaliza telefone BR para formato aceito pela Evolution API e pelo banco.
 * Saída: "55DDDXXXXXXXXX" (12 ou 13 dígitos, sempre com 55).
 * Retorna null se o formato for inesperado.
 */
export function normalizeBrPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits;
  }
  return null;
}
