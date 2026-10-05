/**
 * Funções puras para exibição visual de dados da sessão no Workflow.
 * Sem dependências de React ou Supabase.
 */

const MESES = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
];

/**
 * Retorna as partes da data prontas para exibição no card.
 * @param dateString Data no formato YYYY-MM-DD
 */
export function getSessionDateParts(dateString: string | null | undefined): { day: string; month: string; isToday: boolean } | null {
  if (!dateString) return null;
  
  const parts = dateString.split('-');
  if (parts.length !== 3) return null;
  
  const day = parts[2];
  const monthIndex = parseInt(parts[1], 10) - 1;
  const month = MESES[monthIndex] || '';

  // Verifica se é hoje (comparando YYYY-MM-DD local)
  const today = new Date();
  const localYYYY = today.getFullYear().toString();
  const localMM = (today.getMonth() + 1).toString().padStart(2, '0');
  const localDD = today.getDate().toString().padStart(2, '0');
  const isToday = dateString === `${localYYYY}-${localMM}-${localDD}`;

  return { day, month, isToday };
}

/**
 * Retorna a string do horário formatada em HH:MM, ocultando se for venda avulsa com '00:00'.
 */
export function formatSessionTime(timeString: string | null | undefined, appointmentId?: string | null): string | null {
  if (!timeString) return null;
  
  // Se for venda avulsa e o horário for o padrão 00:00, ocultamos
  if (!appointmentId && (timeString === '00:00' || timeString === '00:00:00')) {
    return null;
  }
  
  const parts = timeString.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  
  return timeString;
}
