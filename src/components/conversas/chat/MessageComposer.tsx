/**
 * Composer de mensagem estilo WhatsApp Web.
 *
 * - Textarea com auto-resize até 120px
 * - Enter envia, Shift+Enter quebra linha
 * - Menu de anexos (image/video/document)
 * - Botão Mic (placeholder visual) quando vazio; Send quando há texto
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mic, Send, X, Square, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Mensagem } from '@/modules/conversas/types';
import { AttachMenu } from './AttachMenu';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

export interface MessageComposerProps {
  onSend: (content: string) => Promise<void> | void;
  onAttach: (file: File, kind: 'image' | 'video' | 'document' | 'contact' | 'audio', isPtt?: boolean) => void;
  disabled?: boolean;
  replyingTo?: Mensagem | null;
  onCancelReply?: () => void;
}

const MAX_HEIGHT = 120;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function MessageComposer({
  onSend,
  onAttach,
  disabled,
  replyingTo,
  onCancelReply,
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

  // Auto-resize
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text]);

  // Foco ao montar ou ao citar uma mensagem
  useEffect(() => {
    textareaRef.current?.focus();
  }, [replyingTo]);

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
    if (e.key === 'Escape' && replyingTo && onCancelReply) {
      e.preventDefault();
      onCancelReply();
    }
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (e) {
      toast.error('Erro ao acessar microfone. Verifique as permissões.');
    }
  };

  const handleStopAndSendAudio = async () => {
    const file = await stopRecording();
    if (file) {
      onAttach(file, 'audio', true);
    }
  };

  const canSend = text.trim().length > 0 && !sending && !disabled;

  return (
    <div className="flex flex-col bg-[#f0f2f5] border-t border-zinc-200">
      {/* Banner de Citação / Resposta (Fase P3) */}
      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-white/80 border-b border-zinc-200/60 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2 border-l-[3.5px] border-[#C9A87C] pl-2.5 overflow-hidden">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[#9A7F52] truncate">
                Respondendo a {replyingTo.direction === 'outbound' ? 'Você' : 'Contato'}
              </span>
              <span className="text-xs text-zinc-600 truncate max-w-[400px]">
                {replyingTo.content || (replyingTo.type === 'image' ? '📷 Foto' : replyingTo.type === 'audio' ? '🎤 Áudio' : 'Anexo')}
              </span>
            </div>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 rounded-full hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-700 transition-colors ml-2 shrink-0"
              title="Cancelar resposta (Esc)"
              aria-label="Cancelar resposta"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2">
      {!isRecording && <AttachMenu onAttach={onAttach} />}

      <div className="flex-1 bg-white rounded-2xl border border-zinc-200 shadow-sm flex items-center min-h-[42px] overflow-hidden">
        {isRecording ? (
          <div className="flex items-center gap-3 w-full px-4 text-red-500 animate-in fade-in">
            <Mic className="h-5 w-5 animate-pulse" />
            <span className="font-mono text-sm font-medium">{formatTime(recordingTime)}</span>
            <span className="text-xs text-zinc-400 ml-auto mr-2">Gravando...</span>
          </div>
        ) : (
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
        )}
      </div>

      {isRecording ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={cancelRecording}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleStopAndSendAudio}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-[#C9A87C] text-white hover:bg-[#b89567] active:scale-95 transition-transform shadow-sm"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      ) : canSend ? (
        <button
          type="button"
          onClick={handleSend}
          aria-label="Enviar"
          className="h-9 w-9 flex items-center justify-center rounded-full bg-[#C9A87C] text-white hover:bg-[#b89567] active:scale-95 transition-transform shadow-sm"
        >
          <Send className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleStartRecording}
          aria-label="Gravar áudio"
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-200 active:bg-zinc-300 transition-colors text-zinc-600"
        >
          <Mic className="h-5 w-5" />
        </button>
      )}
      </div>
    </div>
  );
}
