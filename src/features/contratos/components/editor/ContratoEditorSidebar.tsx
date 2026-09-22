import { Info, FileText, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ContratoSectionId = 'info' | 'content' | 'variables';

interface Item {
  id: ContratoSectionId;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
  hint?: string;
}

interface ContratoEditorSidebarProps {
  active: ContratoSectionId;
  onChange: (s: ContratoSectionId) => void;
  variablesCount: number;
  readingTime: number;
  isPadrao?: boolean;
}

export function ContratoEditorSidebar({
  active,
  onChange,
  variablesCount,
  readingTime,
  isPadrao,
}: ContratoEditorSidebarProps) {
  const items: Item[] = [
    {
      id: 'info',
      label: 'Informações',
      Icon: Info,
      hint: isPadrao ? 'Modelo padrão ativo' : 'Nome e categoria',
    },
    {
      id: 'content',
      label: 'Redação & Cláusulas',
      Icon: FileText,
      hint: `~${readingTime} min de leitura`,
    },
    {
      id: 'variables',
      label: 'Variáveis Dinâmicas',
      Icon: Code2,
      hint: `${variablesCount} detectada${variablesCount !== 1 ? 's' : ''}`,
    },
  ];

  return (
    <nav
      aria-label="Seções do editor de contrato"
      className="w-56 shrink-0 border-r bg-background"
    >
      <div className="px-4 py-5">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
          Estrutura
        </p>
      </div>

      <ul className="px-2 space-y-0.5">
        {items.map(({ id, label, Icon, hint }) => {
          const isActive = id === active;

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
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <Icon
                  size={16}
                  className={cn(
                    'mt-0.5 shrink-0',
                    isActive ? 'text-[hsl(var(--accent-gold))]' : 'text-muted-foreground'
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <span className="block text-sm leading-tight">{label}</span>
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
