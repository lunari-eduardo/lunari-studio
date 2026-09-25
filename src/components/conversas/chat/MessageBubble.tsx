/**
 * Bolha de mensagem estilo WhatsApp.
 *
 * Suporta texto + mídia (imagem, áudio, vídeo, documento) + caudas quando agrupadas.
 */

import { useState, useMemo } from 'react';
import { AlertCircle, Check, CheckCheck, Clock, RotateCw, Loader2, Reply, Trash2, SmilePlus, Star, Copy, FileText, Download, Pencil, Ban, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Mensagem, MessageStatus } from '@/modules/conversas/types';
import { formatTime } from '../shared/format';
import { AudioPlayer } from './AudioPlayer';
import { LinkPreview, extractFirstUrl } from './LinkPreview';
import { useConversasStickers } from '@/hooks/useConversasStickers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MONTHS_PT_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Data completa em pt-BR: "12 de set de 2024 • 14:32" */
function formatFullDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = MONTHS_PT_SHORT[d.getMonth()];
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${day} de ${month} de ${year} • ${time}`;
}

/** 1234567 → "1.2 MB" */
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

/** Detecta URLs no texto e divide em segmentos. */
type Segment = { text: string; isUrl: boolean };
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s]+)/gi;

function parseSegments(text: string): Segment[] {
  const parts: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), isUrl: false });
    parts.push({ text: match[0], isUrl: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), isUrl: false });
  return parts;
}

/** Renderiza texto com URLs clicáveis. */
function MessageText({ content, className }: { content: string; className?: string }) {
  const segments = parseSegments(content);
  if (segments.length === 0) return null;
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.isUrl ? (
          <a
            key={i}
            href={seg.text}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[#B8925F] dark:text-[#D4AF37] underline hover:text-[#9A7543] dark:hover:text-[#E2C366] break-all"
          >
            {seg.text}
          </a>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}

/** Player de vídeo com thumbnail + overlay de play; controls nativos no clique. */
function VideoPlayer({ src, mime, isPending }: { src: string; mime?: string; isPending?: boolean }) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <video
        controls
        autoPlay
        className="rounded-lg max-w-full sm:max-w-[280px] max-h-[300px] bg-black block"
        onEnded={() => setPlaying(false)}
      >
        <source src={src} type={mime || 'video/mp4'} />
      </video>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="relative group/video rounded-lg overflow-hidden max-w-full sm:max-w-[280px] block cursor-pointer"
    >
      <video
        src={src}
        className={cn(
          'block w-full max-h-[300px] bg-black object-cover',
          isPending && 'opacity-70'
        )}
        preload="metadata"
        muted
        playsInline
      />
      {/* Overlay com play */}
      <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover/video:bg-black/40 transition-colors">
        <div className="h-12 w-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md group-hover/video:scale-110 transition-transform">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1C1C1C] fill-current ml-0.5">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      {isPending && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      )}
    </button>
  );
}

function FloatingPalette({ onReact, close }: { onReact: (emoji: string) => void, close: () => void }) {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 bg-white dark:bg-[#242424] backdrop-blur-md rounded-full shadow-lg border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
      {emojis.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => {
            setSelected(e);
            setTimeout(() => {
              onReact(e);
              close();
            }, 100);
          }}
          className={cn(
            'text-xl p-1 rounded-full transition-all duration-150 hover:scale-130 active:scale-95',
            selected === e && 'scale-140 rotate-6'
          )}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

export interface MessageBubbleProps {
  mensagem: Mensagem;
  /** Primeira do grupo (corte de cauda superior) */
  isFirstInGroup?: boolean;
  /** Última do grupo (corte de cauda inferior + footer visível) */
  isLastInGroup?: boolean;
  isHighlighted?: boolean;
  onRetry?: (id: string) => void;
  onReply?: (mensagem: Mensagem) => void;
  onDelete?: (id: string) => void;
  onReact?: (emoji: string) => void;
  onEdit?: (mensagem: Mensagem) => void;
  onPreviewImage?: (id: string) => void;
  onScrollToMessage?: (messageId: string) => void;
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

function StatusIcon({ status }: { status?: MessageStatus }) {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-zinc-400" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    case 'read':
      return <CheckCheck className="h-3.5 w-3.5 text-[#C9A87C] dark:text-[#D4AF37]" />;
    case 'delivered':
      return <CheckCheck className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />;
    case 'sent':
      return <Check className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />;
    default:
      return null;
  }
}

export function MessageBubble({
  mensagem,
  isFirstInGroup = false,
  isLastInGroup = true,
  isHighlighted = false,
  onRetry,
  onReply,
  onDelete,
  onReact,
  onEdit,
  onPreviewImage,
  onScrollToMessage,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { saveSticker } = useConversasStickers();
  const isDeleted = Boolean(mensagem.is_deleted || mensagem.content === '🚫 Mensagem apagada');
  const isEdited = Boolean(mensagem.is_edited && !isDeleted);
  const isOwn = mensagem.direction === 'outbound';
  const failed = mensagem.status === 'failed';
  const isPending = mensagem.status === 'pending';
  const isMedia = !isDeleted && mensagem.type !== 'text';

  const previewUrl = useMemo(() => {
    if (isDeleted || !mensagem.content) return null;
    return extractFirstUrl(mensagem.content);
  }, [mensagem.content, isDeleted]);

  const handleCopy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const textToCopy = mensagem.content || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).catch(() => {});
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 450);
  };

  // Cauda: canto cortado apenas no primeiro e último do grupo.
  const cornerClass = isOwn
    ? isFirstInGroup
      ? 'rounded-tl-2xl rounded-tr-md'
      : 'rounded-tl-md'
    : isFirstInGroup
      ? 'rounded-tr-2xl rounded-tl-md'
      : 'rounded-tr-md';

  const lastCornerClass = isOwn
    ? 'rounded-bl-2xl rounded-br-md'
    : 'rounded-br-2xl rounded-bl-md';

  const radiusClass = isLastInGroup
    ? cn(cornerClass, lastCornerClass)
    : cn(cornerClass, 'rounded-b-md');

  // Ignora conteúdo gerado como fallback de mídia
  const isSticker = !isDeleted && mensagem.type === 'sticker';
  const hasStickerMedia = isSticker && Boolean(mensagem.media_url);

  const isDefaultMediaContent =
    isMedia &&
    ['🎤 Áudio', '🎥 Vídeo', '📎 Documento', '📷 Imagem', '🎨 Figurinha'].includes(mensagem.content);

  const showContent = !isDeleted && Boolean(mensagem.content && !isDefaultMediaContent);

  const reactions: any[] = !isDeleted && Array.isArray((mensagem as any).reactions) ? (mensagem as any).reactions : [];
  const hasReactions = reactions.length > 0;

  return (
    <div
      className={cn(
        'group w-full flex items-center gap-1.5 px-3 mb-0.5',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Botões de Ação (aparecem no hover da mensagem para outbound) */}
      {/* Botões de Ação (aparecem no hover da mensagem para outbound) */}
      {isOwn && !isDeleted && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          {hasStickerMedia && !isPending && !failed && (
            <button
              type="button"
              onClick={() => saveSticker.mutate({ url: mensagem.media_url! })}
              className="p-1.5 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-500/20 text-zinc-400 hover:text-yellow-500 dark:dark:text-zinc-500 dark:hover:text-yellow-400"
              title="Salvar Figurinha"
            >
              <Star className="h-3.5 w-3.5" />
            </button>
          )}
          {onReact && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReactions(!showReactions)}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                title="Reagir"
              >
                <SmilePlus className="h-3.5 w-3.5" />
              </button>
              {showReactions && (
                <FloatingPalette
                  onReact={(emoji) => onReact(emoji)}
                  close={() => setShowReactions(false)}
                />
              )}
            </div>
          )}
          {Boolean(mensagem.content && !isDefaultMediaContent) && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
              title="Copiar mensagem"
              aria-label="Copiar"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
          {onEdit && mensagem.type === 'text' && !isPending && !failed && (
            <button
              type="button"
              onClick={() => onEdit(mensagem)}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
              title="Editar mensagem"
              aria-label="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-500/20 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                  title="Apagar mensagem para todos"
                  aria-label="Apagar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar mensagem</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja apagar esta mensagem para todos? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(mensagem.id)} className="bg-red-600 text-white hover:bg-red-700">
                    Apagar para todos
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {onReply && (
            <button
              type="button"
              onClick={() => onReply(mensagem)}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              title="Responder mensagem"
              aria-label="Responder"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div
        className={cn(
          'relative w-fit min-w-[50px] text-sm break-words transition-all duration-500',
          hasReactions && 'mb-3',
          hasStickerMedia
            ? 'p-0 bg-transparent border-0 shadow-none'
            : cn(
                'max-w-[85%] sm:max-w-[70%] lg:max-w-[65%] px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
                isDeleted
                  ? 'bg-black/[0.02] dark:bg-white/[0.03] text-zinc-500 dark:text-zinc-400 border border-dashed border-black/[0.1] dark:border-white/[0.1] shadow-none select-none'
                  : isOwn
                    ? 'bg-[#F4EFE6] text-zinc-900 border border-[#E5DAC6]/80 dark:bg-[#221D17] dark:text-zinc-100 dark:border-[#382E22] dark:shadow-none'
                    : 'bg-white text-zinc-900 border border-black/[0.05] dark:bg-[#1D1D1D] dark:text-zinc-100 dark:border-white/[0.06] dark:shadow-none',
                radiusClass,
                failed && 'border border-red-400',
                isHighlighted && 'ring-2 ring-offset-1 ring-[#D4AF37] shadow-lg scale-[1.02] z-10'
              )
        )}
      >
        {/* Bloco de Mensagem Citada (Quote / Reply) */}
        {!isDeleted && mensagem.quoted_content ? (
          <div 
            className="border-l-[3px] border-[#C9A87C] bg-black/[0.03] dark:bg-white/[0.05] rounded-r px-2 py-1 mb-1.5 text-xs select-none cursor-pointer hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
            onClick={() => {
              if (mensagem.reply_to_id && onScrollToMessage) {
                onScrollToMessage(mensagem.reply_to_id);
              }
            }}
          >
            <span className="block font-semibold text-[11px] text-[#B8925F] dark:text-[#D4AF37] leading-tight mb-0.5">
              {mensagem.quoted_sender || 'Mensagem'}
            </span>
            <p className="text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed text-[12px]">
              {mensagem.quoted_content}
            </p>
          </div>
        ) : null}

        {isDeleted ? (
          <div className="flex items-center gap-1.5 py-0.5 text-zinc-500/80 dark:text-zinc-400/80 italic select-none">
            <Ban className="h-3.5 w-3.5 opacity-60 shrink-0" />
            <span className="text-[13px]">Mensagem apagada</span>
          </div>
        ) : hasStickerMedia ? (
          /* Figurinha estilo WhatsApp: flutuante, sem borda de bolha e timestamp sutil */
          <div className="relative inline-block select-none my-0.5">
            <img
              src={mensagem.media_url!}
              alt="Figurinha"
              className={cn(
                'w-[130px] h-[130px] sm:w-[150px] sm:h-[150px] object-contain block drop-shadow-sm',
                isPending && 'opacity-70 blur-[1px]'
              )}
              loading="lazy"
            />
            {isPending && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
                <div className="p-2 rounded-full bg-black/50 text-white shadow-md">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
            {/* Timestamp flutuante no canto inferior da figurinha */}
            <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/45 backdrop-blur-[2px] text-white px-1.5 py-0.5 rounded-full text-[10px] leading-none shadow-sm select-none pointer-events-none dark:bg-black/60">
              <span className="text-[10px]">{formatTime(mensagem.timestamp)}</span>
              {isOwn ? <StatusIcon status={mensagem.status} /> : null}
              {failed && onRetry ? (
                <button
                  onClick={() => onRetry(mensagem.id)}
                  className="ml-1 text-red-400 hover:text-red-200 pointer-events-auto"
                  aria-label="Tentar enviar novamente"
                >
                  <RotateCw className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </div>
        ) : isMedia ? (
          <div className="space-y-1">
            {mensagem.type === 'image' && (
              <button
                type="button"
                onClick={() => {
                  if (!isPending && onPreviewImage) onPreviewImage(mensagem.id);
                }}
                className={cn(
                  "relative rounded-lg overflow-hidden max-w-full sm:max-w-[280px] bg-black/[0.02] dark:bg-white/[0.02] group/image block",
                  !isPending && onPreviewImage ? "cursor-pointer" : "cursor-default"
                )}
              >
                {mensagem.media_url ? (
                  <>
                    <img
                      src={mensagem.media_url}
                      alt={mensagem.media_filename ?? 'imagem'}
                      className={cn(
                        'rounded-lg max-w-full max-h-[320px] block object-contain transition-transform duration-300',
                        isPending ? 'opacity-70 blur-[1px]' : 'group-hover/image:scale-[1.02]'
                      )}
                      loading="lazy"
                    />
                    {!isPending && onPreviewImage && (
                      <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 dark:group-hover/image:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover/image:opacity-100 transition-opacity drop-shadow-md scale-90 group-hover/image:scale-100 duration-200" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-[240px] h-[160px] bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-lg flex items-center justify-center text-zinc-400 text-xs">
                    Carregando imagem...
                  </div>
                )}

                {/* Preload / Spinner de upload sobre a imagem */}
                {isPending && (
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="p-2 rounded-full bg-black/50 text-white shadow-md">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  </div>
                )}
              </button>
            )}
            
            {mensagem.type === 'audio' && (
              mensagem.media_url ? (
                <AudioPlayer src={mensagem.media_url} isOwn={isOwn} />
              ) : (
                <div className="flex items-center gap-2 py-2 px-1 text-xs text-zinc-500 italic">
                  <RotateCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                  <span>Baixando áudio...</span>
                </div>
              )
            )}

            {mensagem.type === 'video' && (
              mensagem.media_url ? (
                <VideoPlayer src={mensagem.media_url} mime={mensagem.media_mime_type} isPending={isPending} />
              ) : (
                <div className="flex items-center gap-2 py-2 px-1 text-xs text-zinc-500 italic">
                  <RotateCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                  <span>Baixando vídeo...</span>
                </div>
              )
            )}

            {mensagem.type === 'document' && (
              mensagem.media_url ? (
                <a
                  href={mensagem.media_url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-lg border transition-colors min-w-[240px] max-w-[320px]',
                    isOwn
                      ? 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                      : 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                  )}
                >
                  <div className="shrink-0 h-10 w-10 rounded-lg bg-[#C9A87C]/15 dark:bg-[#C9A87C]/20 border border-[#C9A87C]/30 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-[#A58253] dark:text-[#E2C366] leading-none tracking-tight">
                      {getFileExtension(mensagem.media_filename)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {mensagem.media_filename || 'Documento'}
                    </p>
                    {mensagem.media_size_bytes && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                        {formatBytes(mensagem.media_size_bytes)}
                      </p>
                    )}
                  </div>
                  <Download className="h-4 w-4 text-zinc-400 dark:text-zinc-400 shrink-0" />
                </a>
              ) : (
                <div className="flex items-center gap-2 py-2 px-1 text-xs text-zinc-500 italic">
                  <RotateCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                  <span>Baixando documento...</span>
                </div>
              )
            )}

            {showContent && (
              <>
                <MessageText
                  content={mensagem.content}
                  className={cn(
                    'whitespace-pre-wrap leading-relaxed mt-1 transition-all duration-200',
                    isCopied && 'animate-pulse opacity-40 bg-amber-200/50 dark:bg-amber-400/20 rounded px-1 -mx-1 text-zinc-950 dark:text-zinc-50 scale-[0.99]'
                  )}
                />
                {previewUrl && (
                  <LinkPreview url={previewUrl} direction={mensagem.direction} />
                )}
              </>
            )}

            {/* Figurinha sem mídia / pendente de download */}
            {mensagem.type === 'sticker' && !mensagem.media_url && (
              <div className="flex items-center gap-2 py-1 px-1 text-xs text-zinc-500">
                {isPending ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                    <span className="italic">Baixando figurinha...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base">🎨</span>
                    <span className="italic">Figurinha não disponível</span>
                  </>
                )}
              </div>
            )}

            {!mensagem.media_url && !['image', 'audio', 'video', 'document', 'sticker'].includes(mensagem.type) && (
              <span className="text-zinc-500 italic text-xs">
                {mensagem.type === 'location' && '📍 Localização'}
                {mensagem.type === 'contact' && '👤 Contato'}
              </span>
            )}
          </div>
        ) : (
          <>
            <MessageText
              content={mensagem.content}
              className={cn(
                'whitespace-pre-wrap leading-relaxed transition-all duration-200',
                isCopied && 'animate-pulse opacity-40 bg-[#C9A87C]/20 dark:bg-[#C9A87C]/20 rounded px-1 -mx-1 text-[#1C1C1C] dark:text-[#EFEFEF] scale-[0.99]'
              )}
            />
            {previewUrl && (
              <LinkPreview url={previewUrl} direction={mensagem.direction} />
            )}
          </>
        )}

        {/* Footer: time + status icon (apenas no último do grupo e se não for figurinha com mídia já exibindo) */}
        {!hasStickerMedia && isLastInGroup ? (
          <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
            {isEdited ? (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic select-none mr-0.5">
                editada
              </span>
            ) : null}
            <div className="relative group/tt">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-none cursor-default font-sans">
                {formatTime(mensagem.timestamp)}
              </span>
              {/* Tooltip: data completa */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 dark:bg-white/90 text-white dark:text-black text-[10px] px-1.5 py-0.5 rounded pointer-events-none opacity-0 group-hover/tt:opacity-100 transition-opacity duration-150 z-20">
                {formatFullDate(mensagem.timestamp)}
              </div>
            </div>
            {isOwn && !isDeleted ? <StatusIcon status={mensagem.status} /> : null}
            {failed && onRetry ? (
              <button
                onClick={() => onRetry(mensagem.id)}
                className="ml-1 text-red-500 hover:text-red-700"
                aria-label="Tentar enviar novamente"
              >
                <RotateCw className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Badge de Reações Estilo WhatsApp */}
        {hasReactions && (
          <div
            className={cn(
              'absolute -bottom-2.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs shadow-sm bg-white dark:bg-[#242424] border border-[#C9A87C] select-none z-10 animate-in zoom-in-75 duration-150 hover:scale-110 transition-transform cursor-pointer',
              isOwn ? 'right-2' : 'left-2'
            )}
            onClick={(e) => {
              e.stopPropagation();
              setShowReactions(prev => !prev);
            }}
            title={reactions.map((r: any) => `${r.emoji} (${r.sender || (r.fromMe ? 'Você' : 'Contato')})`).join(', ')}
          >
            {Array.from(new Set(reactions.map((r: any) => r.emoji))).slice(0, 3).map((e: any, idx) => (
              <span key={idx} className="leading-none text-[13px]">{e}</span>
            ))}
            {reactions.length > 1 && (
              <span className="text-[10px] text-zinc-500 font-medium ml-0.5">{reactions.length}</span>
            )}
          </div>
        )}
      </div>

      {/* Botões de Ação para inbound (à direita da bolha) */}
      {!isOwn && !isDeleted && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          {hasStickerMedia && !isPending && !failed && (
            <button
              type="button"
              onClick={() => saveSticker.mutate({ url: mensagem.media_url! })}
              className="p-1.5 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-500/20 text-zinc-400 hover:text-yellow-500 dark:text-zinc-500 dark:hover:text-yellow-400"
              title="Salvar Figurinha"
            >
              <Star className="h-3.5 w-3.5" />
            </button>
          )}
          {onReact && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReactions(!showReactions)}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                title="Reagir"
              >
                <SmilePlus className="h-3.5 w-3.5" />
              </button>
              {showReactions && (
                <FloatingPalette
                  onReact={(emoji) => onReact(emoji)}
                  close={() => setShowReactions(false)}
                />
              )}
            </div>
          )}
          {Boolean(mensagem.content && !isDefaultMediaContent) && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
              title="Copiar mensagem"
              aria-label="Copiar"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
          {onReply && (
            <button
              type="button"
              onClick={() => onReply(mensagem)}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              title="Responder mensagem"
              aria-label="Responder"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-500/20 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                  title="Apagar mensagem (apenas para mim)"
                  aria-label="Apagar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar mensagem local</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apagar esta mensagem removerá ela apenas para você. O contato ainda poderá vê-la.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(mensagem.id)} className="bg-red-600 text-white hover:bg-red-700">
                    Apagar para mim
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </div>
  );
}
