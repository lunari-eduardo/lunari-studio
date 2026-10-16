import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useInlineEdit } from './inlineContext';
import { fluidPx, typographyKey, typographyColorKey } from '../components/editor/blocks/helpers';

interface EditableTextProps {
  value: string | undefined;
  onCommit: (value: string) => void;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  multiline?: boolean;
  editable?: boolean;
  /** Chave do campo para a barra flutuante de texto (ex: 'title', 'subtitle', 'description'). */
  fieldKey?: string;
}

// ============================================================
// EDIÇÃO INLINE NA ARTE
// Duplo clique no texto ativa contentEditable; commit no blur,
// Enter (Ctrl+Enter se multiline) ou toolbar; Esc cancela.
// ============================================================

export function EditableText({
  value,
  onCommit,
  as: Tag = 'span',
  className,
  style,
  placeholder,
  multiline = false,
  editable = false,
  fieldKey,
}: EditableTextProps) {
  const ref = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState(false);
  const cancelledRef = useRef(false);
  const clickPointRef = useRef<{ x: number; y: number } | null>(null);
  const text = value ?? '';
  const inline = useInlineEdit();

  // Tamanho e cor escolhidos no popover (props.typography) valem no editor e no público
  const canonicalSizeKey = fieldKey ? typographyKey(fieldKey) : undefined;
  const canonicalColorKey = fieldKey ? typographyColorKey(fieldKey) : undefined;
  const rawSize = canonicalSizeKey
    ? (inline?.typography?.[canonicalSizeKey] ?? inline?.typography?.[`${fieldKey}Size`])
    : undefined;
  const sizeOverride = typeof rawSize === 'number' ? fluidPx(rawSize) : undefined;

  const rawColor = canonicalColorKey
    ? (inline?.typography?.[canonicalColorKey] ?? inline?.typography?.[`${fieldKey}Color`])
    : undefined;
  const colorOverride = typeof rawColor === 'string' ? rawColor : undefined;

  if (sizeOverride) style = { ...style, ...sizeOverride };
  if (colorOverride) style = { ...style, color: colorOverride };

  // Sincroniza o DOM apenas fora da edição (nunca pula o caret).
  // useLayoutEffect: texto presente já na primeira pintura (sem flash).
  // `editable` nas deps: ao virar editável (celular → desktop) o React reaproveita o nó e
  // remove o texto que era children; sem re-sincronizar, o campo ficaria vazio.
  useLayoutEffect(() => {
    if (editing) return;
    const el = ref.current;
    if (el && el.textContent !== text) el.textContent = text;
  }, [text, editing, editable]);

  const isEditingRef = useRef(editing);
  isEditingRef.current = editing;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const textRef = useRef(text);
  textRef.current = text;
  const multilineRef = useRef(multiline);
  multilineRef.current = multiline;

  // Proteção vital contra perda de texto: se o componente for desmontado enquanto
  // estiver em edição (ex: troca de layout/variante, alternância de modo ou navegação),
  // faz o commit imediato do que o usuário digitou no DOM antes de desmontar.
  useEffect(() => {
    return () => {
      if (isEditingRef.current && ref.current && !cancelledRef.current) {
        const el = ref.current;
        const next = multilineRef.current
          ? (el.innerText ?? '')
          : (el.textContent ?? '').replace(/\n/g, ' ');
        if (next !== textRef.current) {
          onCommitRef.current(next.trim() === '' && !multilineRef.current ? '' : next);
        }
      }
    };
  }, []);

  // Foca e posiciona o caret DEPOIS de contentEditable estar no DOM
  useEffect(() => {
    if (!editing) return;
    cancelledRef.current = false;
    const el = ref.current;
    if (!el) return;
    el.focus();

    let range: Range | null = null;
    const pt = clickPointRef.current;
    if (pt && typeof (document as any).caretRangeFromPoint === 'function') {
      const pos = (document as any).caretRangeFromPoint(pt.x, pt.y);
      if (pos && el.contains(pos.startContainer)) range = pos;
    }
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false); // caret no fim
    }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  if (!editable) {
    // Campo vazio fora da edição não deixa buraco (a tag levaria margens/espaçamentos consigo)
    if (!text.trim()) return null;
    return React.createElement(Tag, { className, style }, text);
  }

  const commit = () => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      setEditing(false);
      return;
    }
    const el = ref.current;
    const next = el
      ? (multiline ? (el.innerText ?? '') : (el.textContent ?? '').replace(/\n/g, ' '))
      : text;
    setEditing(false);
    if (next !== text) onCommit(next.trim() === '' && !multiline ? '' : next);
  };

  const cancel = () => {
    cancelledRef.current = true;
    setEditing(false);
    if (ref.current) ref.current.textContent = text;
  };

  const isFieldSelected = Boolean(
    editable &&
    fieldKey &&
    inline?.activeTextField === fieldKey &&
    !editing
  );

  return React.createElement(Tag, {
    ref,
    className: cn(
      'pa-editable-text transition-all duration-150',
      className,
      editing
        ? 'outline-none ring-2 ring-primary/70 ring-offset-2 cursor-text relative z-30'
        : isFieldSelected
        ? 'ring-2 ring-primary/80 ring-offset-2 rounded-xs cursor-pointer relative z-20 shadow-xs'
        : 'cursor-text hover:ring-1 hover:ring-primary/30 hover:ring-offset-1'
    ),
    style,
    contentEditable: editing,
    suppressContentEditableWarning: true,
    'data-placeholder': placeholder ?? 'Clique duas vezes para editar',
    onDoubleClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      clickPointRef.current = { x: e.clientX, y: e.clientY };
      setEditing(true);
    },
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      } else if (e.key === 'Enter' && (!multiline || (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      }
    },
    onPaste: (e: React.ClipboardEvent) => {
      // Cola sempre como texto puro
      e.preventDefault();
      const raw = e.clipboardData.getData('text/plain');
      const t = multiline ? raw : raw.replace(/\s+/g, ' ');
      document.execCommand('insertText', false, t);
    },
    onMouseDown: (e: React.MouseEvent) => {
      // Durante a edição, isola o mouse do wrapper do bloco
      if (editing) e.stopPropagation();
    },
    onClick: (e: React.MouseEvent) => {
      if (editing) {
        e.stopPropagation();
      } else if (fieldKey && inline?.onSelectTextField) {
        e.stopPropagation();
        // Clique único (fora do editing) abre o popover de tamanho
        inline.onSelectTextField(fieldKey, ref.current);
      }
    },
  });
}
