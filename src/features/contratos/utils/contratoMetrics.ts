/**
 * Utilitários de métricas para contratos (contagem de variáveis, tempo de leitura, etc.)
 */

export function countVariables(conteudoHtml?: string | null): number {
  if (!conteudoHtml) return 0;
  const matches = conteudoHtml.match(/\{\{([^}]+)\}\}/g);
  return matches ? matches.length : 0;
}

export function estimateReadingTime(conteudoHtml?: string | null): number {
  if (!conteudoHtml) return 1;
  const text = conteudoHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  // Média de leitura: 180 a 200 palavras por minuto para termos jurídicos
  return Math.max(1, Math.ceil(words / 180));
}
