/**
 * Composer de mensagem estilo WhatsApp Web.
 *
 * - Textarea com auto-resize até 120px
 * - Enter envia, Shift+Enter quebra linha
 * - Menu de anexos (image/video/document)
 * - Botão Mic (placeholder visual) quando vazio; Send quando há texto
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mic, Send, X, Square, Trash2, Sticker as StickerIcon, Pencil, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Mensagem } from '@/modules/conversas/types';
import { AttachMenu } from './AttachMenu';
import { StickerPickerPopover } from './StickerPickerPopover';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

export interface MessageComposerProps {
  onSend: (content: string) => Promise<void> | void;
  onAttach: (
    file: File,
    kind: 'image' | 'video' | 'document' | 'contact' | 'audio' | 'sticker',
    isPtt?: boolean,
    caption?: string,
  ) => void;
  disabled?: boolean;
  replyingTo?: Mensagem | null;
  onCancelReply?: () => void;
  editingMessage?: Mensagem | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (mensagemId: string, newContent: string) => Promise<void>;
  onOpenAudiosSalvos?: () => void;
  /** Called when user clicks "Salvar apenas" during recording — save to library without sending. */
  onSaveAudio?: (file: File, duration: number) => void;
  injectedText?: string | null;
  onClearInjectedText?: () => void;
}

export interface PendingAttachment {
  file: File;
  kind: 'image' | 'video' | 'document';
  previewUrl?: string;
}

const MAX_HEIGHT = 120;

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u++;
  }
  return `${n.toFixed(n < 10 && u > 0 ? 1 : 0)} ${units[u]}`;
}

function getFileExtension(filename?: string): string {
  if (!filename) return 'DOC';
  const parts = filename.split('.');
  if (parts.length > 1) {
    const ext = parts.pop()?.toUpperCase() || 'DOC';
    return ext.length <= 4 ? ext : ext.slice(0, 4);
  }
  return 'DOC';
}

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
  editingMessage,
  onCancelEdit,
  onSaveEdit,
  onOpenAudiosSalvos,
  onSaveAudio,
  injectedText,
  onClearInjectedText,
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

  // Preencher composer ao entrar em modo de edição
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || '');
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Injeção de texto externo (ex: templates/respostas rápidas)
  useEffect(() => {
    if (injectedText != null && injectedText !== '') {
      setText(prev => (prev.trim() ? `${prev}\n\n${injectedText}` : injectedText));
      textareaRef.current?.focus();
      onClearInjectedText?.();
    }
  }, [injectedText, onClearInjectedText]);

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
  }, [replyingTo, pendingAttachment, editingMessage]);

  const handleClearAttachment = () => {
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    setPendingAttachment(null);
  };

  const handleSelectAttachment = (
    file: File,
    kind: 'image' | 'video' | 'document' | 'contact' | 'sticker',
  ) => {
    if (kind === 'sticker' || kind === 'contact') {
      onAttach(file, kind);
      return;
    }
    const previewUrl = kind === 'image' ? URL.createObjectURL(file) : undefined;
    setPendingAttachment({ file, kind, previewUrl });
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (sending) return;

    if (editingMessage && onSaveEdit) {
      if (!trimmed) {
        toast.error('A mensagem não pode ficar vazia');
        return;
      }
      try {
        setSending(true);
        await onSaveEdit(editingMessage.id, trimmed);
        setText('');
        onCancelEdit?.();
      } catch {
        // toast já tratado no hook
      } finally {
        setSending(false);
      }
      return;
    }

    if (pendingAttachment) {
      try {
        setSending(true);
        const { file, kind } = pendingAttachment;
        handleClearAttachment();
        setText('');
        await onAttach(file, kind, false, trimmed);
      } finally {
        setSending(false);
      }
      return;
    }

    if (!trimmed) return;
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
    if (e.key === 'Escape') {
      if (pendingAttachment) {
        e.preventDefault();
        handleClearAttachment();
      } else if (editingMessage && onCancelEdit) {
        e.preventDefault();
        onCancelEdit();
      } else if (replyingTo && onCancelReply) {
        e.preventDefault();
        onCancelReply();
      }
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

  const canSend = (text.trim().length > 0 || pendingAttachment != null) && !sending && !disabled;

  return (
    <div
      className="flex flex-col bg-[#F5F4F0] dark:bg-[#151515] border-t border-black/[0.05] dark:border-white/[0.06]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Banner de Edição */}
      {editingMessage && (
        <div className="border-b border-black/[0.05] dark:border-white/[0.06] bg-white/70 dark:bg-[#1A1A1A]/70 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-2 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2 border-l-[3px] border-[#C9A87C] pl-2.5 overflow-hidden">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <Pencil className="h-3 w-3 text-[#B8925F] dark:text-[#D4AF37]" />
                  <span className="text-[11px] font-semibold text-[#B8925F] dark:text-[#D4AF37]">
                    Editando mensagem
                  </span>
                </div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[400px]">
                  {editingMessage.content}
                </span>
              </div>
            </div>
            {onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="p-1 rounded-full hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors ml-2 shrink-0"
                title="Cancelar edição (Esc)"
                aria-label="Cancelar edição"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Banner de Citação / Resposta (Fase P3) */}
      {!editingMessage && replyingTo && (
        <div className="border-b border-black/[0.05] dark:border-white/[0.06] bg-white/70 dark:bg-[#1A1A1A]/70 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-2 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2 border-l-[3px] border-[#C9A87C] pl-2.5 overflow-hidden">
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-semibold text-[#B8925F] dark:text-[#D4AF37] truncate">
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
        </div>
      )}

      {/* Card de Pré-visualização do Anexo */}
      {!editingMessage && pendingAttachment && (
        <div className="border-b border-black/[0.05] dark:border-white/[0.06] bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {pendingAttachment.kind === 'image' && pendingAttachment.previewUrl ? (
                <div className="h-12 w-12 rounded-lg overflow-hidden border border-black/[0.08] dark:border-white/[0.1] bg-black/5 shrink-0">
                  <img
                    src={pendingAttachment.previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-lg bg-[#C9A87C]/15 dark:bg-[#C9A87C]/20 border border-[#C9A87C]/30 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-[#A58253] dark:text-[#E2C366] leading-none tracking-tight">
                    {getFileExtension(pendingAttachment.file.name)}
                  </span>
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {pendingAttachment.file.name}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  {formatBytes(pendingAttachment.file.size)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearAttachment}
              className="p-1.5 rounded-full hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors shrink-0"
              title="Remover anexo (Esc)"
              aria-label="Remover anexo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-2.5 flex items-end gap-2">
        {!isRecording && !editingMessage && (
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
            <AttachMenu onAttach={handleSelectAttachment} onOpenAudiosSalvos={onOpenAudiosSalvos} />
          </div>
        )}

        <div className="flex-1 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center min-h-[42px] overflow-hidden">
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
              placeholder={editingMessage ? 'Edite a mensagem...' : pendingAttachment ? 'Adicione uma legenda (opcional)...' : 'Mensagem'}
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
            aria-label={editingMessage ? 'Salvar edição' : 'Enviar'}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-[#C9A87C] text-white hover:bg-[#b89567] active:scale-95 transition-transform shadow-sm"
          >
            {editingMessage ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        ) : editingMessage ? (
          <button
            type="button"
            disabled
            className="h-9 w-9 flex items-center justify-center rounded-full text-zinc-300 dark:text-zinc-600 opacity-50 cursor-not-allowed"
          >
            <Check className="h-4 w-4" />
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
