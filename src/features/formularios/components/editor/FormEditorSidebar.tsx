/**
 * FormEditorSidebar — navegação vertical das seções do editor.
 *
 * Três itens fixos (Informações / Perguntas / Experiência), mais contadores
 * discretos para Perguntas e total de campos. Estado ativo destacado pelo
 * border-l do Design System.
 */
import { Info, ListChecks, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SectionId = 'info' | 'questions' | 'experience';

interface Item {
  id: SectionId;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
  hint?: string;
}

const ITEMS: Item[] = [
  { id: 'info', label: 'Informações', Icon: Info },
  { id: 'questions', label: 'Perguntas', Icon: ListChecks },
  { id: 'experience', label: 'Experiência', Icon: Sparkles },
];

interface SidebarProps {
  active: SectionId;
  onChange: (s: SectionId) => void;
  questionsCount: number;
  requiredCount: number;
}

export function FormEditorSidebar({
  active,
  onChange,
  questionsCount,
  requiredCount,
}: SidebarProps) {
  return (
    <nav
      aria-label="Seções do editor"
      className="w-56 shrink-0 border-r bg-background"
    >
      <div className="px-4 py-5">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
          Editor
        </p>
      </div>

      <ul className="px-2 space-y-0.5">
        {ITEMS.map(({ id, label, Icon }) => {
          const isActive = id === active;
          const hint =
            id === 'questions'
              ? `${questionsCount} ${questionsCount === 1 ? 'pergunta' : 'perguntas'}${requiredCount > 0 ? ` · ${requiredCount} obrigatória${requiredCount === 1 ? '' : 's'}` : ''}`
              : undefined;

          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Icon
                  size={16}
                  className={cn(
                    'mt-0.5 shrink-0',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-tight">
                    {label}
                  </span>
                  {hint && (
                    <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                      {hint}
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
