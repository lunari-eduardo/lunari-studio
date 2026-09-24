/**
 * Divisor de data centralizado — identidade Lunari (sem WhatsApp colors).
 */

import { formatDateDivider } from '../shared/format';

export interface DateDividerProps {
  date: string | Date;
}

export function DateDivider({ date }: DateDividerProps) {
  return (
    <div className="flex items-center justify-center my-3 select-none">
      <span className="bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm text-zinc-600 dark:text-zinc-400 text-[11px] font-medium px-3.5 py-1 rounded-full border border-black/[0.05] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {formatDateDivider(date)}
      </span>
    </div>
  );
}
