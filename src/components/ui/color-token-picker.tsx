import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ETIQUETA_COLOR_KEYS, getEtiquetaTokens, EtiquetaColor } from '@/utils/etiquetaColorTokens';
import { Check } from 'lucide-react';

interface ColorTokenPickerProps {
  value?: string | null;
  onChange: (color: string) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function ColorTokenPicker({
  value,
  onChange,
  disabled,
  className,
  triggerClassName,
}: ColorTokenPickerProps) {
  const [open, setOpen] = React.useState(false);
  const currentTokens = getEtiquetaTokens(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md border border-border/60 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            triggerClassName
          )}
          title="Selecionar cor"
        >
          <div className={cn("h-3.5 w-3.5 rounded-full shadow-sm", currentTokens.swatch)} />
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-64 p-3", className)} align="start">
        <div className="mb-2 text-xs font-semibold text-muted-foreground">Cores</div>
        <div className="grid grid-cols-5 gap-2">
          {ETIQUETA_COLOR_KEYS.map((colorKey) => {
            const tokens = getEtiquetaTokens(colorKey);
            const isSelected = value === colorKey;

            return (
              <button
                key={colorKey}
                type="button"
                onClick={() => {
                  onChange(colorKey);
                  setOpen(false);
                }}
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-md transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  tokens.swatch,
                  isSelected && "ring-2 ring-primary ring-offset-2"
                )}
                title={colorKey}
              >
                {isSelected && (
                  <Check className="h-4 w-4 text-white drop-shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
