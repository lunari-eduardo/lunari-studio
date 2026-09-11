import React from 'react';
import { cn } from '@/lib/utils';

export interface CoverScrollCueProps {
  onClick: () => void;
  color?: string;
  className?: string;
  label?: string;
}

export function CoverScrollCue({
  onClick,
  color = 'currentColor',
  className,
  label = 'Rolar para a galeria',
}: CoverScrollCueProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'group flex flex-col items-center gap-2 select-none cursor-pointer p-2',
        'opacity-70 hover:opacity-100 transition-opacity duration-300 focus:outline-none',
        className
      )}
      style={{ color }}
    >
      <div className="relative h-10 w-[1px] overflow-hidden bg-current/25">
        <span
          className="absolute top-0 left-0 w-full h-1/2 bg-current animate-scroll-cue motion-reduce:animate-none"
        />
      </div>
      <style>{`
        @keyframes scrollCueSlide {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateY(200%);
            opacity: 0;
          }
        }
        .animate-scroll-cue {
          animation: scrollCueSlide 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
      `}</style>
    </button>
  );
}
