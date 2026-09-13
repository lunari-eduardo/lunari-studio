/**
 * Formatadores compartilhados do módulo Conversas.
 */

const WEEKDAYS_PT = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** 5511999999999 → (11) 99999-9999 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const p1 = digits.slice(4, 9);
    const p2 = digits.slice(9);
    return `(${ddd}) ${p1}-${p2}`;
  }
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const p1 = digits.slice(4, 10);
    const p2 = digits.slice(10);
    return `(${ddd}) ${p1}-${p2}`;
  }
  return digits;
}

/** HH:MM em pt-BR. */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** "Hoje" / "Ontem" / dia da semana / data longa para divisores de data. */
export function formatDateDivider(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays > 1 && diffDays < 7) {
    return WEEKDAYS_PT[d.getDay()];
  }
  return `${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Timestamp curto para lista de chat estilo WhatsApp Web: "HH:MM" hoje, "Ontem", dia da semana ou "dd/MM/yyyy". */
export function formatChatTimestamp(
  date: Date | string | null | undefined,
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Hoje: "18:41"
  if (diffDays === 0) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // Ontem: "Ontem"
  if (diffDays === 1) {
    return 'Ontem';
  }

  // Últimos 7 dias: "segunda-feira"
  if (diffDays > 1 && diffDays < 7) {
    return WEEKDAYS_PT[d.getDay()];
  }

  // Mais antigo: "dd/MM/yyyy"
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Iniciais para avatar (até 2 letras). */
export function getInitials(name: string | null | undefined, phone?: string | null): string {
  const source = (name ?? '').trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    return digits.slice(-2) || '?';
  }
  return '?';
}
