import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Eye, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ContratoTemplate } from '@/types/contrato';

export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'dirty' };

interface ContratoEditorHeaderProps {
  draft: Partial<ContratoTemplate>;
  onTituloChange: (v: string) => void;
  saveState: SaveState;
  onVisualizar?: () => void;
  onSalvar: () => void;
}

export function ContratoEditorHeader({
  draft,
  onTituloChange,
  saveState,
  onVisualizar,
  onSalvar,
}: ContratoEditorHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="shrink-0 border-b bg-background sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Linha 1: Voltar + Título editável + Ações */}
        <div className="flex items-center gap-3 py-3">
          <button
            type="button"
            onClick={() => navigate('/app/comercial/contratos')}
            className={cn(
              'inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 rounded'
            )}
          >
            <ArrowLeft size={14} aria-hidden />
            Contratos
          </button>
          <span aria-hidden className="text-muted-foreground/50">/</span>

          <input
            type="text"
            value={draft.nome || ''}
            onChange={(e) => onTituloChange(e.target.value)}
            placeholder="Nome do modelo de contrato"
            aria-label="Nome do modelo"
            className={cn(
              'flex-1 min-w-0 bg-transparent text-base font-semibold text-foreground outline-none',
              'placeholder:text-muted-foreground/60 placeholder:italic'
            )}
          />

          <div className="flex items-center gap-2 shrink-0">
            {onVisualizar && (
              <Button
                variant="outline"
                size="sm"
                onClick={onVisualizar}
                className="h-9 gap-1.5 hidden sm:inline-flex text-xs"
              >
                <Eye size={14} />
                Visualizar
              </Button>
            )}

            <Button
              size="sm"
              onClick={onSalvar}
              disabled={saveState.kind === 'saving' || !draft.nome?.trim()}
              className="h-9 gap-1.5 text-xs bg-[hsl(var(--accent-gold))] hover:bg-[hsl(var(--accent-gold))]/90 text-primary-foreground font-medium"
            >
              {saveState.kind === 'saving' ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden /> Salvando...
                </>
              ) : (
                'Salvar modelo'
              )}
            </Button>
          </div>
        </div>

        {/* Linha 2: Descrição discreta e estado de salvamento */}
        <div className="flex items-center justify-between gap-3 pb-2.5 -mt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {draft.categoria && (
              <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase font-medium">
                {draft.categoria}
              </span>
            )}
            <span className="line-clamp-1">
              {draft.descricao?.trim() || 'Sem descrição interna informada.'}
            </span>
          </div>

          <SaveIndicator state={saveState} />
        </div>
      </div>
    </header>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  let label = '';
  let className = '';
  let icon: React.ReactNode = null;

  switch (state.kind) {
    case 'idle':
      return null;
    case 'saving':
      label = 'Salvando alterações...';
      className = 'text-muted-foreground';
      icon = <Loader2 size={11} className="animate-spin" />;
      break;
    case 'saved':
      label = 'Salvo agora';
      className = 'text-emerald-600 dark:text-emerald-400';
      icon = <Check size={11} />;
      break;
    case 'dirty':
      label = 'Alterações não salvas';
      className = 'text-amber-600 dark:text-amber-400';
      icon = <AlertCircle size={11} />;
      break;
  }

  return (
    <span className={cn('text-[11px] font-medium flex items-center gap-1 shrink-0', className)}>
      {icon}
      {label}
    </span>
  );
}
