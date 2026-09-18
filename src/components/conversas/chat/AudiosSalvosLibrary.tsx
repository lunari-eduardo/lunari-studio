/**
 * Painel lateral de áudios salvos (estilo WhatsApp).
 * Abre ao lado do chat quando o estúdio clica "Áudio salvo" no AttachMenu.
 */

import { useRef, useState } from 'react';
import { AudioLines, Upload, Trash2, Mic, Loader2, Send, Search, Music, X, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAudiosSalvos, type AudioSalvo } from '@/hooks/useAudiosSalvos';

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatSize(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Preview player inline ───────────────────────────────────────────────────

function AudioPreview({ src }: { src: string }) {
  return (
    <audio
      src={src}
      controls
      preload="metadata"
      className="h-8 w-full mt-1"
    />
  );
}

// ─── Item individual ─────────────────────────────────────────────────────────

function AudioSavedItem({
  audio,
  onSend,
  onRename,
  onDelete,
  renaming,
  onStartRename,
  onCancelRename,
  renameValue,
  onRenameChange,
  onConfirmRename,
}: {
  audio: AudioSalvo;
  onSend: () => void;
  onRename: (id: string, nome: string) => void;
  onDelete: (id: string) => void;
  renaming: boolean;
  onStartRename: () => void;
  onCancelRename: () => void;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onConfirmRename: () => void;
}) {
  const isDeleting = false;

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm space-y-2">
      {/* Linha principal */}
      <div className="flex items-start gap-2.5">
        {/* Ícone */}
        <div className="h-9 w-9 shrink-0 rounded-full bg-[#C9A87C]/10 flex items-center justify-center mt-0.5">
          <AudioLines className="h-4 w-4 text-[#C9A87C]" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={renameValue}
                onChange={e => onRenameChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onConfirmRename();
                  if (e.key === 'Escape') onCancelRename();
                }}
                className="h-7 text-xs"
                autoFocus
              />
              <Button size="sm" className="h-7 text-xs px-2" onClick={onConfirmRename}>
                OK
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-1.5" onClick={onCancelRename}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-800 truncate">{audio.nome}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {formatDuration(audio.duration)}
                  {audio.uso_count > 0 && ` • enviado ${audio.uso_count}×`}
                  {audio.file_size && ` • ${formatSize(audio.file_size)}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onStartRename}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                  title="Renomear"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(audio.id)}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview + Enviar */}
      {!renaming && (
        <div className="flex items-center gap-2 pl-0.5">
          <audio
            src={audio.media_url}
            preload="metadata"
            className="h-7 flex-1"
          />
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 bg-[#C9A87C] hover:bg-[#b89567] text-white text-xs font-medium shrink-0"
            onClick={onSend}
          >
            <Send className="h-3 w-3" />
            Enviar
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Estado vazio ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 space-y-3">
      <div className="w-14 h-14 rounded-full bg-[#C9A87C]/10 flex items-center justify-center text-[#C9A87C]">
        <Mic className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-700">Nenhum áudio salvo</p>
        <p className="text-xs text-zinc-400 mt-1 max-w-[200px] leading-relaxed">
          Grave um áudio no chat e clique em <strong>Salvar apenas</strong> para adicioná-lo aqui e reutilizá-lo depois.
        </p>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export interface AudiosSalvosLibraryProps {
  onSendAudio: (audio: AudioSalvo) => void;
  onClose: () => void;
  /** Função para salvar áudio gravado no composer */
  onRequestSaveRecording?: (file: File, duration: number) => void;
  isRecording?: boolean;
}

export function AudiosSalvosLibrary({
  onSendAudio,
  onClose,
  isRecording,
}: AudiosSalvosLibraryProps) {
  const { audios, isLoading, save, rename, remove } = useAudiosSalvos();
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const filtered = searchQuery.trim()
    ? audios.filter(a => a.nome.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : audios;

  const handleSend = (audio: AudioSalvo) => {
    onSendAudio(audio);
  };

  const handleStartRename = (audio: AudioSalvo) => {
    setRenamingId(audio.id);
    setRenameValue(audio.nome);
  };

  const handleConfirmRename = () => {
    if (renamingId && renameValue.trim()) {
      rename.mutate({ id: renamingId, nome: renameValue.trim() });
    }
    setRenamingId(null);
  };

  const handleDelete = (id: string) => {
    remove.mutate(id);
  };

  return (
    <div className="w-full md:w-80 flex-shrink-0 flex flex-col border-l border-zinc-200 bg-zinc-50/50 h-full">
      {/* Cabeçalho */}
      <div className="px-3 py-2.5 border-b border-zinc-200/80 flex items-center justify-between bg-white/80">
        <div className="flex items-center gap-2">
          <AudioLines className="h-4 w-4 text-[#C9A87C]" />
          <span className="text-sm font-semibold text-zinc-800">Áudios Salvos</span>
          {!isLoading && (
            <span className="text-[11px] bg-zinc-200/80 text-zinc-600 px-1.5 py-0.2 rounded-full font-medium">
              {audios.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700 transition-colors"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Busca */}
      {audios.length > 4 && (
        <div className="px-3 py-2 bg-white/60 border-b border-zinc-200/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar áudio..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* Lista */}
      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
          </div>
        ) : audios.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs text-zinc-400 py-12">
            Nenhum áudio encontrado para "{searchQuery}".
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(audio => (
              <AudioSavedItem
                key={audio.id}
                audio={audio}
                onSend={() => handleSend(audio)}
                onRename={rename.mutate}
                onDelete={handleDelete}
                renaming={renamingId === audio.id}
                onStartRename={() => handleStartRename(audio)}
                onCancelRename={() => setRenamingId(null)}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onConfirmRename={handleConfirmRename}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
