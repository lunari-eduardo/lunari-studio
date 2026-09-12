/**
 * Frame CSS de celular (estilo iPhone) usado para envolver o QR Code.
 */

import { cn } from '@/lib/utils';

export interface PhoneMockupProps {
  children: React.ReactNode;
  className?: string;
}

export function PhoneMockup({ children, className }: PhoneMockupProps) {
  return (
    <div className={cn('relative mx-auto', className)}>
      <div
        className={cn(
          'relative w-[280px] md:w-[300px] aspect-[9/19]',
          'rounded-[2.5rem] bg-zinc-900 p-2 shadow-2xl',
          'shadow-amber-500/5',
        )}
      >
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 h-6 w-24 rounded-full bg-zinc-950" />

        {/* Screen */}
        <div className="relative h-full w-full rounded-[2rem] overflow-hidden bg-zinc-950 flex flex-col">
          {/* Status bar fake */}
          <div className="flex items-center justify-between px-6 pt-3 pb-2 text-[11px] text-zinc-400 z-10">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span>•••</span>
              <span className="h-2 w-2 rounded-full bg-zinc-500" />
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">{children}</div>

          {/* Home indicator */}
          <div className="flex justify-center pb-2">
            <div className="h-1 w-24 rounded-full bg-zinc-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
