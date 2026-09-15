/**
 * FormEditorHeader — header do editor.
 *
 * Layout (referência visual):
 *  ← Formulários
 *  [Título editável inline]
 *  [Subtítulo / "Alterações não salvas"]
 *
 *  [Visualizar] [Salvar]
 *
 * "Voltar" usa window.history para manter compatibilidade com navegação
 * do navegador e respeitar o React Router.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Formulario } from '@/types/formulario';

export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'dirty' };

interface HeaderProps {
  draft: Formulario;
  onTituloChange: (v: string) => void;
  saveState: SaveState;
  onVisualizar: () => void;
  onSalvar: () => void;
}

export function FormEditorHeader({
  draft,
  onTituloChange,
  saveState,
  onVisualizar,
  onSalvar,
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="border-b bg-background sticky top-0 z-30">
      <div className="mx-auto max-w-[79rem] px-4 md:px-6">
        {/* Linha 1: voltar + título + ações */}
        <div className="flex items-center gap-3 py-3">
          <button
            type="button"
            onClick={() => navigate('/app/formularios')}
            className={cn(
              'inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 rounded',
            )}
          >
            <ArrowLeft size={14} aria-hidden />
            Formulários
          </button>
          <span aria-hidden className="text-muted-foreground/50">/</span>

          <input
            type="text"
            value={draft.titulo}
            onChange={(e) => onTituloChange(e.target.value)}
            placeholder="Sem título"
            aria-label="Nome do formulário"
            className={cn(
              'flex-1 min-w-0 bg-transparent text-base font-semibold text-foreground outline-none',
              'placeholder:text-muted-foreground/60 placeholder:italic',
            )}
          />

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onVisualizar}
              className="h-9 gap-1.5 hidden sm:inline-flex"
            >
              Visualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onSalvar}
              disabled={saveState.kind === 'saving'}
              className="h-9 gap-1.5"
            >
              {saveState.kind === 'saving' ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden /> Salvando
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </div>

        {/* Linha 2: descrição discreta + estado de salvamento */}
        <div className="flex items-center justify-between gap-3 pb-3 -mt-1">
          <p className="text-xs text-muted-foreground line-clamp-1">
            {draft.descricao?.trim() || 'Sem descrição.'}
          </p>
          <SaveIndicator state={saveState} />
        </div>
      </div>
    </header>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  let label = '';
  let className = '';
  switch (state.kind) {
    case 'idle':
      return null;
    case 'saving':
      label = 'Salvando...';
      className = 'text-muted-foreground';
      break;
    case 'saved':
      label = 'Salvo agora';
      className = 'text-muted-foreground';
      break;
    case 'dirty':
      label = 'Alterações não salvas';
      className = 'text-amber-600 dark:text-amber-500';
      break;
  }
  return (
    <span className={cn('text-[11px] font-medium', className)}>{label}</span>
  );
}
