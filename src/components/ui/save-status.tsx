import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Feedback inline de salvamento automático (regra "zero toasts" para ações corriqueiras).
 * Erros continuam sendo avisados pelo próprio fluxo de mutation.
 */
export function SaveStatus({ saving, className }: { saving: boolean; className?: string }) {
  const [justSaved, setJustSaved] = useState(false);
  const wasSaving = useRef(false);

  useEffect(() => {
    if (wasSaving.current && !saving) {
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 2500);
      wasSaving.current = saving;
      return () => clearTimeout(t);
    }
    wasSaving.current = saving;
  }, [saving]);

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}
    >
      {saving ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Salvando…
        </>
      ) : justSaved ? (
        <>
          <Check className="h-3.5 w-3.5 text-lunar-success" />
          Salvo agora
        </>
      ) : (
        'Alterações salvas automaticamente'
      )}
    </span>
  );
}
