/**
 * Composer de mensagem estilo WhatsApp Web.
 *
 * - Textarea com auto-resize até 120px
 * - Enter envia, Shift+Enter quebra linha
 * - Menu de anexos (image/video/document)
 * - Botão Mic (placeholder visual) quando vazio; Send quando há texto
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mic, Send } from 'lucide-react';
import { toast } from 'sonner';
import { AttachMenu } from './AttachMenu';

export interface MessageComposerProps {
  onSend: (content: string) => Promise<void> | void;
  onAttach: (file: File, kind: 'image' | 'video' | 'document' | 'contact') => void;
  disabled?: boolean;
}

const MAX_HEIGHT = 120;

export function MessageComposer({ onSend, onAttach, disabled }: MessageComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text]);

  // Foco ao montar
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    try {
      setSending(true);
      await onSend(trimmed);
      setText('');
    } catch {
      // toast já tratado no hook
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const canSend = text.trim().length > 0 && !sending && !disabled;

  return (
    <div className="flex items-end gap-2 px-3 py-2 bg-[#f0f2f5] border-t border-zinc-200">
      <AttachMenu onAttach={onAttach} />

      <div className="flex-1 bg-white rounded-2xl border border-zinc-200 shadow-sm">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mensagem"
          rows={1}
          disabled={disabled}
          className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-400 disabled:opacity-50"
          style={{ maxHeight: MAX_HEIGHT }}
        />
      </div>

      {canSend ? (
        <button
          type="button"
          onClick={handleSend}
          aria-label="Enviar"
          className="h-9 w-9 flex items-center justify-center rounded-full bg-[#25d366] text-white hover:bg-[#1ebe5a] active:scale-95 transition-transform"
        >
          <Send className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => toast.info('Gravação de áudio em breve')}
          aria-label="Gravar áudio"
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-200 active:bg-zinc-300 transition-colors text-zinc-600"
        >
          <Mic className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
