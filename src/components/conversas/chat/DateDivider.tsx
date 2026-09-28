/**
 * Divisor de data centralizado — identidade Lunari (sem WhatsApp colors).
 */

import { formatDateDivider } from '../shared/format';

export interface DateDividerProps {
  date: string | Date;
}

export function DateDivider({ date }: DateDividerProps) {
  return (
    <div className="flex items-center justify-center my-1.5 select-none relative w-full">
      <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-semibold tracking-wider uppercase">
        {formatDateDivider(date)}
      </span>
    </div>
  );
}
