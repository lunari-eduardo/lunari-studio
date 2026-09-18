/**
 * Composer de mensagem estilo WhatsApp Web.
 *
 * - Textarea com auto-resize até 120px
 * - Enter envia, Shift+Enter quebra linha
 * - Menu de anexos (image/video/document)
 * - Botão Mic (placeholder visual) quando vazio; Send quando há texto
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mic, Send, X, Square, Trash2, Sticker as StickerIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Mensagem } from '@/modules/conversas/types';
import { AttachMenu } from './AttachMenu';
import { StickerPickerPopover } from './StickerPickerPopover';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

export interface MessageComposerProps {
  onSend: (content: string) => Promise<void> | void;
  onAttach: (file: File, kind: 'image' | 'video' | 'document' | 'contact' | 'audio' | 'sticker', isPtt?: boolean) => void;
  disabled?: boolean;
  replyingTo?: Mensagem | null;
  onCancelReply?: () => void;
  onOpenAudiosSalvos?: () => void;
  /** Called when user clicks "Salvar apenas" during recording — save to library without sending. */
  onSaveAudio?: (file: File, duration: number) => void;
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
  onOpenAudiosSalvos,
  onSaveAudio,
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

  const handleSaveOnly = async () => {
    if (!onSaveAudio) return;
    const file = await stopRecording();
    if (file) {
      onSaveAudio(file, recordingTime);
    }
  };

  const canSend = text.trim().length > 0 && !sending && !disabled;

  return (
    <div className="flex flex-col bg-[#F5F5F5] dark:bg-[#181818] border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
      {/* Banner de Citação / Resposta (Fase P3) */}
      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-[#181818] border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2 border-l-[3.5px] border-[#C9A87C] pl-2.5 overflow-hidden">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[#C9A87C] truncate">
                Respondendo a {replyingTo.direction === 'outbound' ? 'Você' : 'Contato'}
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[400px]">
                {replyingTo.content || (replyingTo.type === 'image' ? '📷 Foto' : replyingTo.type === 'audio' ? '🎤 Áudio' : 'Anexo')}
              </span>
            </div>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 rounded-full hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors ml-2 shrink-0"
              title="Cancelar resposta (Esc)"
              aria-label="Cancelar resposta"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2">
      {!isRecording && (
        <div className="flex items-center gap-1 shrink-0">
          <StickerPickerPopover onSendSticker={(url) => onAttach(url as any, 'sticker')}>
            <button
              type="button"
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-500 dark:text-zinc-400"
              title="Figurinhas"
            >
              <StickerIcon className="w-5 h-5" />
            </button>
          </StickerPickerPopover>
          <AttachMenu onAttach={onAttach} onOpenAudiosSalvos={onOpenAudiosSalvos} />
        </div>
      )}

      <div className="flex-1 bg-white dark:bg-[#181818] rounded-2xl border border-[rgba(0,0,0,0.04)] dark:border-transparent shadow-sm flex items-center min-h-[42px] overflow-hidden">
        {isRecording ? (
          <div className="flex items-center gap-3 w-full px-4 text-red-500 dark:text-red-400 animate-in fade-in">
            <Mic className="h-5 w-5 animate-pulse" />
            <span className="font-mono text-sm font-medium">{formatTime(recordingTime)}</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto mr-2">Gravando...</span>
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
            className="w-full resize-none bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 disabled:opacity-50 focus:ring-1 focus:ring-[#C9A87C] rounded-2xl"
            style={{ maxHeight: MAX_HEIGHT }}
          />
        )}
      </div>

      {isRecording ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={cancelRecording}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {onSaveAudio && (
            <button
              type="button"
              onClick={handleSaveOnly}
              className="h-9 px-3 flex items-center gap-1.5 rounded-full bg-white dark:bg-[#181818] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-medium"
              title="Salvar na biblioteca sem enviar"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Salvar</span>
            </button>
          )}
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
