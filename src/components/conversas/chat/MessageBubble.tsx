/**
 * Bolha de mensagem estilo WhatsApp.
 *
 * Suporta texto + mídia (imagem, áudio, vídeo, documento) + caudas quando agrupadas.
 */

import { useState } from 'react';
import { AlertCircle, Check, CheckCheck, Clock, RotateCw, Loader2, Reply, Trash2, SmilePlus, Star, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Mensagem, MessageStatus } from '@/modules/conversas/types';
import { formatTime } from '../shared/format';
import { AudioPlayer } from './AudioPlayer';
import { useConversasStickers } from '@/hooks/useConversasStickers';

function FloatingPalette({ onReact, close }: { onReact: (emoji: string) => void, close: () => void }) {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md rounded-full shadow-lg border border-zinc-200/80 dark:border-zinc-700/80 z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
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
  onRetry?: (id: string) => void;
  onReply?: (mensagem: Mensagem) => void;
  onDelete?: (id: string) => void;
  onReact?: (emoji: string) => void;
}

function StatusIcon({ status }: { status?: MessageStatus }) {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-zinc-500" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    case 'read':
      return <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />;
    case 'delivered':
      return <CheckCheck className="h-3.5 w-3.5 text-zinc-500" />;
    case 'sent':
      return <Check className="h-3.5 w-3.5 text-zinc-500" />;
    default:
      return null;
  }
}

export function MessageBubble({
  mensagem,
  isFirstInGroup = false,
  isLastInGroup = true,
  onRetry,
  onReply,
  onDelete,
  onReact,
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { saveSticker } = useConversasStickers();
  const isOwn = mensagem.direction === 'outbound';
  const failed = mensagem.status === 'failed';
  const isPending = mensagem.status === 'pending';
  const isMedia = mensagem.type !== 'text';

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
    ? cn(cornerClass, isOwn ? lastCornerClass : lastCornerClass)
    : cn(cornerClass, 'rounded-b-md');

  // Ignora conteúdo gerado como fallback de mídia
  const isSticker = mensagem.type === 'sticker';
  const hasStickerMedia = isSticker && Boolean(mensagem.media_url);

  const isDefaultMediaContent =
    isMedia &&
    ['🎤 Áudio', '🎥 Vídeo', '📎 Documento', '📷 Imagem', '🎨 Figurinha'].includes(mensagem.content);

  const showContent = Boolean(mensagem.content && !isDefaultMediaContent);

  const reactions: any[] = Array.isArray((mensagem as any).reactions) ? (mensagem as any).reactions : [];
  const hasReactions = reactions.length > 0;

  return (
    <div
      className={cn(
        'group w-full flex items-center gap-1.5 px-3 mb-0.5',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Botões de Ação (aparecem no hover da mensagem para outbound) */}
      {isOwn && (
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
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(mensagem.id)}
              className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-500/20 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
              title="Apagar mensagem"
              aria-label="Apagar"
            >
              <Trash2 className="h-3.5 w-3.5" />
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
        </div>
      )}

      <div
        className={cn(
          'relative w-fit min-w-[60px] text-sm break-words',
          hasReactions && 'mb-3',
          hasStickerMedia
            ? 'p-0 bg-transparent border-0 shadow-none'
            : cn(
                'max-w-[85%] md:max-w-[70%] px-3 py-1.5 shadow-sm',
                isOwn
                  ? 'bg-[#F4F1EA] text-zinc-900 border border-[#E8E2D8] dark:bg-[#056162] dark:text-white dark:border-[#025a62]'
                  : 'bg-white text-zinc-900 border border-zinc-100 dark:bg-[#1f2c33] dark:text-zinc-100 dark:border-zinc-700',
                radiusClass,
                failed && 'border border-red-400',
              )
        )}
      >
        {/* Bloco de Mensagem Citada (Quote / Reply) */}
        {mensagem.quoted_content ? (
          <div className="border-l-[3px] border-[#C9A87C] dark:border-[#056162] bg-black/5 dark:bg-white/5 rounded-r px-2 py-1 mb-1.5 text-xs select-none">
            <span className="block font-semibold text-[11px] text-[#9A7F52] dark:text-[#7ba7a0] leading-tight mb-0.5">
              {mensagem.quoted_sender || 'Mensagem'}
            </span>
            <p className="text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed text-[12px]">
              {mensagem.quoted_content}
            </p>
          </div>
        ) : null}

        {hasStickerMedia ? (
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
              <div className="relative rounded-lg overflow-hidden max-w-full sm:max-w-[280px]">
                {mensagem.media_url ? (
                  <img
                    src={mensagem.media_url}
                    alt={mensagem.media_filename ?? 'imagem'}
                    className={cn(
                      'rounded-lg max-w-full block object-cover',
                      isPending && 'opacity-70 blur-[1px]'
                    )}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-[240px] h-[160px] bg-zinc-200 animate-pulse rounded-lg flex items-center justify-center text-zinc-400 text-xs">
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
              </div>
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
                <video controls className="rounded-lg max-w-full sm:max-w-[280px] max-h-[300px] bg-black block">
                  <source src={mensagem.media_url} type={mensagem.media_mime_type || 'video/mp4'} />
                </video>
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
                  className="flex items-center gap-2 p-2 bg-black/5 rounded-md hover:bg-black/10 transition-colors"
                >
                  <span className="text-2xl">📄</span>
                  <span className="text-sm font-medium underline truncate max-w-[200px]">
                    {mensagem.media_filename || 'Baixar documento'}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-2 py-2 px-1 text-xs text-zinc-500 italic">
                  <RotateCw className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                  <span>Baixando documento...</span>
                </div>
              )
            )}

            {showContent && (
              <p
                className={cn(
                  'whitespace-pre-wrap leading-relaxed mt-1 transition-all duration-200',
                  isCopied && 'animate-pulse opacity-40 bg-amber-200/50 dark:bg-amber-400/20 rounded px-1 -mx-1 text-zinc-950 dark:text-zinc-50 scale-[0.99]'
                )}
              >
                {mensagem.content}
              </p>
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
          <p
            className={cn(
              'whitespace-pre-wrap leading-relaxed transition-all duration-200',
              isCopied && 'animate-pulse opacity-40 bg-amber-200/50 dark:bg-amber-400/20 rounded px-1 -mx-1 text-zinc-950 dark:text-zinc-50 scale-[0.99]'
            )}
          >
            {mensagem.content}
          </p>
        )}

        {/* Footer: time + status icon (apenas no último do grupo e se não for figurinha com mídia já exibindo) */}
        {!hasStickerMedia && isLastInGroup ? (
          <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
            <span className="text-[10px] text-zinc-500 leading-none">
              {formatTime(mensagem.timestamp)}
            </span>
            {isOwn ? <StatusIcon status={mensagem.status} /> : null}
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
              'absolute -bottom-2.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs shadow-sm bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 select-none z-10 animate-in zoom-in-75 duration-150 hover:scale-110 transition-transform cursor-pointer',
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
      {!isOwn && (
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
            <button
              type="button"
              onClick={() => onDelete(mensagem.id)}
              className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-500/20 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
              title="Apagar mensagem (apenas para mim)"
              aria-label="Apagar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
