/**
 * Divisor de data centralizado no estilo WhatsApp (pill amarelo).
 */

import { formatDateDivider } from '../shared/format';

export interface DateDividerProps {
  date: string | Date;
}

export function DateDivider({ date }: DateDividerProps) {
  return (
    <div className="flex items-center justify-center my-2">
      <span className="bg-[#fff4cc] text-[#54656f] text-[11px] font-medium px-3 py-0.5 rounded-lg shadow-sm">
        {formatDateDivider(date)}
      </span>
    </div>
  );
}
