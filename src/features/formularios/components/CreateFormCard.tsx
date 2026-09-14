/**
 * CreateFormCard — card CTA para criar um novo formulário.
 *
 * Design:
 *  • Borda tracejada para diferenciação visual.
 *  • Ícone grande de "plus" centralizado.
 *  • Texto de chamar atenção.
 *  • Hover com scale sutil.
 *  • Ao clicar, abre o editor de template.
 */
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CreateFormCardProps {
  onClick: () => void;
  disabled?: boolean;
}

export function CreateFormCard({ onClick, disabled }: CreateFormCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative flex flex-col items-center justify-center',
        'rounded-2xl border-2 border-dashed border-border/60 bg-card/50',
        'h-full min-h-[280px] p-6',
        'cursor-pointer transition-all duration-200',
        'hover:border-[hsl(var(--accent-gold))]/50 hover:bg-card hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]',
        'hover:scale-[1.01]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-gold))]/40 focus-visible:border-[hsl(var(--accent-gold))]/40',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:border-border/60 disabled:hover:bg-card/50'
      )}
      aria-label="Criar novo formulário"
    >
      {/* Ícone */}
      <div
        className={cn(
          'w-14 h-14 rounded-full bg-gradient-to-br',
          'from-amber-100/50 to-orange-100/50',
          'flex items-center justify-center mb-4',
          'group-hover:scale-110 transition-transform duration-200'
        )}
      >
        <Plus
          size={28}
          strokeWidth={1.5}
          className="text-[hsl(var(--accent-gold))] group-hover:scale-110 transition-transform duration-200"
        />
      </div>

      {/* Texto */}
      <h3 className="text-sm font-semibold text-foreground mb-1 text-center">
        Criar novo formulário
      </h3>
      <p className="text-[11px] text-muted-foreground text-center max-w-[160px]">
        Clique para iniciar um novo formulário do zero
      </p>
    </button>
  );
}

export function CreateFormCardSkeleton() {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'rounded-2xl border-2 border-dashed border-border/40 bg-card/30',
        'h-full min-h-[280px] p-6'
      )}
    >
      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Plus size={28} strokeWidth={1.5} className="text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-1 text-center">
        Criar novo formulário
      </h3>
      <p className="text-[11px] text-muted-foreground text-center max-w-[160px]">
        Carregando...
      </p>
    </div>
  );
}
