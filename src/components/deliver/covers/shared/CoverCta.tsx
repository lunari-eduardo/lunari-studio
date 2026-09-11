import React from 'react';
import { cn } from '@/lib/utils';
import type { CoverPalette } from './useCoverPalette';

export type CoverCtaVariant = 'outline' | 'solid' | 'underline';

export interface CoverCtaProps {
  variant?: CoverCtaVariant;
  label?: string;
  onClick: () => void;
  palette: CoverPalette;
  textTone?: 'onPhoto' | 'ink';
  className?: string;
}

export function CoverCta({
  variant = 'outline',
  label = 'Ver galeria',
  onClick,
  palette,
  textTone = 'onPhoto',
  className,
}: CoverCtaProps) {
  const isToneOnPhoto = textTone === 'onPhoto';
  const textColor = isToneOnPhoto ? palette.onPhoto : palette.ink;
  const borderColor = isToneOnPhoto ? 'rgba(255, 255, 255, 0.45)' : palette.line;

  if (variant === 'solid') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center justify-center min-h-[44px] px-8 py-3.5',
          'text-[11px] md:text-xs uppercase tracking-[0.22em] font-medium select-none cursor-pointer',
          'transition-all duration-300 ease-out shadow-md hover:brightness-105 active:scale-[0.98]',
          className
        )}
        style={{
          backgroundColor: palette.accent,
          color: palette.accentContrast,
        }}
      >
        {label}
      </button>
    );
  }

  if (variant === 'underline') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group relative inline-flex flex-col items-center justify-center min-h-[44px] py-2 px-1',
          'text-[11px] md:text-xs uppercase tracking-[0.22em] font-medium select-none cursor-pointer',
          'transition-colors duration-300',
          className
        )}
        style={{ color: textColor }}
      >
        <span>{label}</span>
        {/* Linha animada que cresce a partir da esquerda no hover */}
        <span
          className="block h-[1px] w-0 group-hover:w-full transition-all duration-300 ease-out mt-1"
          style={{ backgroundColor: palette.accent }}
        />
      </button>
    );
  }

  // Padrão: outline
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 border',
        'text-[11px] md:text-xs uppercase tracking-[0.22em] font-medium select-none cursor-pointer',
        'transition-all duration-300 ease-out active:scale-[0.98]',
        isToneOnPhoto
          ? 'hover:bg-white/10 hover:border-white/70'
          : palette.isDark
          ? 'hover:bg-white/5 hover:border-white/40'
          : 'hover:bg-black/5 hover:border-black/30',
        className
      )}
      style={{
        color: textColor,
        borderColor: borderColor,
      }}
    >
      {label}
    </button>
  );
}
