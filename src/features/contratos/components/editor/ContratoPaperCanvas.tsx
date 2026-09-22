import React, { forwardRef, useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import DOMPurify from 'dompurify';
import { ContratoEditorToolbar } from './ContratoEditorToolbar';
import { cn } from '@/lib/utils';

interface ContratoPaperCanvasProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  onToggleVariables?: () => void;
  variablesOpen?: boolean;
  variablesCount?: number;
  hideToolbar?: boolean;
  className?: string;
}

export interface ContratoPaperCanvasHandle {
  insertVariableAtCursor: (key: string) => void;
  focus: () => void;
}

const ALLOWED_TAGS = [
  'p', 'br', 'div', 'span', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u',
  'ul', 'ol', 'li',
  'blockquote',
  'a',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'style', 'class', 'data-campo'];

function sanitize(html: string): string {
  return DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['style', 'class', 'data-campo'],
  });
}

export const ContratoPaperCanvas = forwardRef<ContratoPaperCanvasHandle, ContratoPaperCanvasProps>(
  function ContratoPaperCanvas(
    {
      value,
      onChange,
      placeholder = 'Comece a redigir o contrato ou insira variáveis da lista...',
      editable = true,
      onToggleVariables,
      variablesOpen,
      variablesCount,
      hideToolbar = false,
      className,
    },
    ref
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastEmittedRef = useRef<string>('');
    const lastRangeRef = useRef<Range | null>(null);

    // Carrega/atualiza o conteúdo externamente mantendo o caret estável
    useEffect(() => {
      const el = editorRef.current;
      if (!el) return;
      const incoming = sanitize(value || '');
      if (incoming === lastEmittedRef.current) return;
      if (el.innerHTML !== incoming) {
        el.innerHTML = incoming;
        lastEmittedRef.current = incoming;
      }
    }, [value]);

    const emitChange = useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      const sanitized = sanitize(el.innerHTML);
      lastEmittedRef.current = sanitized;
      onChange(sanitized);
    }, [onChange]);

    const saveSelection = useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (el.contains(range.commonAncestorContainer)) {
        lastRangeRef.current = range.cloneRange();
      }
    }, []);

    const moveCaretToEnd = useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }, []);

    const exec = useCallback(
      (command: string, arg?: string) => {
        if (!editable) return;
        editorRef.current?.focus();
        document.execCommand(command, false, arg);
        emitChange();
      },
      [editable, emitChange]
    );

    const formatBlock = useCallback(
      (tag: string) => {
        if (!editable) return;
        editorRef.current?.focus();
        document.execCommand('formatBlock', false, `<${tag}>`);
        emitChange();
      },
      [editable, emitChange]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!(e.ctrlKey || e.metaKey)) return;
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            exec('bold');
            break;
          case 'i':
            e.preventDefault();
            exec('italic');
            break;
          case 'u':
            e.preventDefault();
            exec('underline');
            break;
          case 'z':
            e.preventDefault();
            exec(e.shiftKey ? 'redo' : 'undo');
            break;
          case 'y':
            e.preventDefault();
            exec('redo');
            break;
        }
      },
      [exec]
    );

    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        if (!editable) return;
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        emitChange();
      },
      [editable, emitChange]
    );

    useImperativeHandle(
      ref,
      () => ({
        focus: () => editorRef.current?.focus(),
        insertVariableAtCursor: (key: string) => {
          const el = editorRef.current;
          if (!el || !editable) return;

          el.focus();

          const sel = window.getSelection();
          const hasRangeInsideEditor =
            sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer);

          if (!hasRangeInsideEditor) {
            if (lastRangeRef.current && el.contains(lastRangeRef.current.commonAncestorContainer)) {
              sel?.removeAllRanges();
              sel?.addRange(lastRangeRef.current);
            } else {
              moveCaretToEnd();
            }
          }

          document.execCommand('insertText', false, `{{${key}}}`);
          emitChange();
        },
      }),
      [editable, emitChange, moveCaretToEnd]
    );

    const editorContent = (
      <div
        ref={editorRef}
        contentEditable={editable}
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={() => {
          saveSelection();
          emitChange();
        }}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        spellCheck
        className={cn(
          'contrato-paper-content outline-none text-foreground text-[13.5px] leading-relaxed min-h-[700px]',
          '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-foreground [&_h1]:tracking-tight',
          '[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2.5 [&_h2]:text-foreground [&_h2]:border-b [&_h2]:border-border/40 [&_h2]:pb-1.5',
          '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-foreground',
          '[&_p]:my-2.5 [&_p]:text-foreground/90 [&_p]:leading-relaxed',
          '[&_strong]:font-semibold [&_strong]:text-foreground',
          '[&_em]:italic',
          '[&_u]:underline',
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3',
          '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3',
          '[&_li]:my-1.5 [&_li]:text-foreground/90',
          '[&_hr]:my-6 [&_hr]:border-border/60',
          '[&_blockquote]:border-l-4 [&_blockquote]:border-[hsl(var(--accent-gold))] [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4 [&_blockquote]:bg-muted/20 [&_blockquote]:rounded-r',
          '[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground/60 [&:empty]:before:pointer-events-none'
        )}
      />
    );

    if (hideToolbar) {
      return (
        <div
          className={cn(
            'w-full bg-card border border-border/80 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] p-6 sm:p-10 md:p-14 min-h-[850px] h-auto my-1',
            className
          )}
        >
          {editorContent}
        </div>
      );
    }

    return (
      <div className={cn('flex flex-col rounded-xl overflow-hidden border border-border/70 shadow-sm bg-background', className)}>
        {/* Barra de Formatação */}
        {editable && (
          <ContratoEditorToolbar
            onExec={exec}
            onFormatBlock={formatBlock}
            onToggleVariables={onToggleVariables}
            variablesOpen={variablesOpen}
            variablesCount={variablesCount}
          />
        )}

        {/* Fundo da mesa / Área da folha */}
        <div className="bg-muted/30 p-4 sm:p-6 md:p-8 flex justify-center min-h-[600px] overflow-y-auto">
          {/* Folha de papel formal (A4/Executivo) */}
          <div className="w-full max-w-4xl bg-card border border-border/80 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.12)] p-6 sm:p-10 md:p-14 min-h-[680px]">
            {editorContent}
          </div>
        </div>
      </div>
    );
  }
);
