/**
 * PaidToggle — Controle de status de pagamento (Recebido/Pago vs A receber/A pagar).
 * Silent Luxury: suporta modo 'segmented' (duas opções lado a lado com preenchimento
 * semântico suave) e modo 'pill' (toggle compacto com micro-badge).
 */
import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Rótulo quando ativo (default: 'Pago' ou 'Recebido'). */
  label?: string;
  /** Rótulo alternativo quando inativo (default: 'A pagar' ou 'A receber'). */
  labelInactive?: string;
  /** Modo de exibição: 'segmented' (duas opções lado a lado) ou 'pill' (pill compacto). */
  variant?: 'segmented' | 'pill';
  className?: string;
}

export function PaidToggle({
  checked,
  onChange,
  label = 'Pago',
  labelInactive,
  variant = 'pill',
  className,
}: Props) {
  const activeLabel = label;
  const inactiveLabel = labelInactive ?? (label === 'Recebido' ? 'A receber' : 'A pagar');

  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        aria-label="Status do pagamento"
        className={cn(
          'grid grid-cols-2 gap-1.5 p-1 bg-muted/40 dark:bg-muted/20 rounded-xl border border-border/60 dark:border-white/10 select-none',
          className,
        )}
      >
        <button
          type="button"
          role="radio"
          aria-checked={checked}
          onClick={() => onChange(true)}
          className={cn(
            'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer',
            checked
              ? 'bg-emerald-500/12 dark:bg-emerald-500/20 border border-emerald-600/30 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
              : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30',
          )}
        >
          <span
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full transition-colors shrink-0',
              checked
                ? 'bg-emerald-600/20 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground/60',
            )}
          >
            <Check className="h-3 w-3" strokeWidth={2.5} />
          </span>
          <span className="truncate">{activeLabel}</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={!checked}
          onClick={() => onChange(false)}
          className={cn(
            'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer',
            !checked
              ? 'bg-rose-500/12 dark:bg-rose-500/20 border border-rose-600/30 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 font-semibold shadow-xs'
              : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30',
          )}
        >
          <span
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full transition-colors shrink-0',
              !checked
                ? 'bg-rose-600/20 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300'
                : 'bg-muted text-muted-foreground/60',
            )}
          >
            <Clock className="h-3 w-3" strokeWidth={2} />
          </span>
          <span className="truncate">{inactiveLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-all select-none cursor-pointer',
        checked
          ? 'border-emerald-600/30 dark:border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 shadow-[0_2px_10px_-4px_rgba(16,185,129,0.3)] font-semibold'
          : 'border-rose-600/30 dark:border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:border-rose-600/50 hover:bg-rose-500/15 font-semibold',
        className,
      )}
    >
      <span
        className={cn(
          'flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors',
          checked
            ? 'bg-emerald-600 dark:bg-emerald-500 text-white'
            : 'bg-rose-600 dark:bg-rose-500 text-white',
        )}
      >
        <motion.span
          key={checked ? 'checked' : 'unchecked'}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="flex"
        >
          {checked ? (
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          ) : (
            <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
          )}
        </motion.span>
      </span>
      <span>{checked ? activeLabel : inactiveLabel}</span>
    </button>
  );
}

export default PaidToggle;
