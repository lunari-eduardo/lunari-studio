import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline as UIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  Undo,
  Redo,
  Code2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContratoEditorToolbarProps {
  onExec: (command: string, arg?: string) => void;
  onFormatBlock: (tag: string) => void;
  onToggleVariables?: () => void;
  variablesOpen?: boolean;
  variablesCount?: number;
  className?: string;
}

export function ContratoEditorToolbar({
  onExec,
  onFormatBlock,
  onToggleVariables,
  variablesOpen,
  variablesCount = 0,
  className,
}: ContratoEditorToolbarProps) {
  return (
    <div
      className={cn(
        'sticky top-[61px] z-20 flex items-center flex-wrap gap-1 p-2 border-b border-border/70 bg-background/95 backdrop-blur-md',
        className
      )}
      role="toolbar"
      aria-label="Barra de formatação do contrato"
    >
      {/* Títulos / Blocos */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2.5 text-xs font-semibold"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onFormatBlock('h1')}
        title="Título principal (H1)"
      >
        <Heading1 className="h-4 w-4 mr-0.5" /> H1
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2.5 text-xs font-semibold"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onFormatBlock('h2')}
        title="Cláusula principal (H2)"
      >
        <Heading2 className="h-4 w-4 mr-0.5" /> H2
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2.5 text-xs font-semibold"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onFormatBlock('h3')}
        title="Subseção (H3)"
      >
        <Heading3 className="h-4 w-4 mr-0.5" /> H3
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs font-medium"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onFormatBlock('p')}
        title="Parágrafo normal (P)"
      >
        P
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Formatação básica */}
      <Toggle
        size="sm"
        pressed={false}
        onMouseDown={(e) => e.preventDefault()}
        onPressedChange={() => onExec('bold')}
        aria-label="Negrito (Ctrl+B)"
        title="Negrito (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={false}
        onMouseDown={(e) => e.preventDefault()}
        onPressedChange={() => onExec('italic')}
        aria-label="Itálico (Ctrl+I)"
        title="Itálico (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={false}
        onMouseDown={(e) => e.preventDefault()}
        onPressedChange={() => onExec('underline')}
        aria-label="Sublinhado (Ctrl+U)"
        title="Sublinhado (Ctrl+U)"
      >
        <UIcon className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Listas e Estrutura */}
      <Toggle
        size="sm"
        pressed={false}
        onMouseDown={(e) => e.preventDefault()}
        onPressedChange={() => onExec('insertUnorderedList')}
        aria-label="Lista com marcadores"
        title="Lista com marcadores"
      >
        <List className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={false}
        onMouseDown={(e) => e.preventDefault()}
        onPressedChange={() => onExec('insertOrderedList')}
        aria-label="Lista numerada"
        title="Lista numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={false}
        onMouseDown={(e) => e.preventDefault()}
        onPressedChange={() => onFormatBlock('blockquote')}
        aria-label="Citação / Destaque de cláusula"
        title="Citação / Destaque"
      >
        <Quote className="h-4 w-4" />
      </Toggle>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onExec('insertHorizontalRule')}
        title="Inserir linha divisória"
      >
        <Minus className="h-4 w-4" />
      </Button>

      {/* Botão de Variáveis */}
      {onToggleVariables && (
        <>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            type="button"
            variant={variablesOpen ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 px-2.5 text-xs gap-1.5"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggleVariables}
            title="Abrir / Fechar painel de variáveis"
          >
            <Code2 size={13} className="text-[hsl(var(--accent-gold))]" />
            <span>Variáveis</span>
            {variablesCount > 0 && (
              <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
                {variablesCount}
              </span>
            )}
          </Button>
        </>
      )}

      {/* Desfazer / Refazer no canto direito */}
      <div className="ml-auto flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onExec('undo')}
          aria-label="Desfazer (Ctrl+Z)"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onExec('redo')}
          aria-label="Refazer (Ctrl+Y)"
          title="Refazer (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
