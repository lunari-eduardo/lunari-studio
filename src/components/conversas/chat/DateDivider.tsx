/**
 * Divisor de data centralizado — identidade Lunari (sem WhatsApp colors).
 */

import { formatDateDivider } from '../shared/format';

export interface DateDividerProps {
  date: string | Date;
}

export function DateDivider({ date }: DateDividerProps) {
  return (
    <div className="flex items-center justify-center my-1.5">
      <span className="bg-[#F0F0F0] dark:bg-[#242424] text-zinc-500 dark:text-zinc-500 text-[11px] font-medium px-3 py-0.5 rounded-full shadow-sm">
        {formatDateDivider(date)}
      </span>
    </div>
  );
}
