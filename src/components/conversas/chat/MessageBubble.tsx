/**
 * Bolha de mensagem estilo WhatsApp.
 *
 * Suporta texto + mídia (imagem, áudio, vídeo, documento) + caudas quando agrupadas.
 */

import { AlertCircle, Check, CheckCheck, Clock, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Mensagem, MessageStatus } from '@/modules/conversas/types';
import { formatTime } from '../shared/format';

export interface MessageBubbleProps {
  mensagem: Mensagem;
  /** Primeira do grupo (corte de cauda superior) */
  isFirstInGroup?: boolean;
  /** Última do grupo (corte de cauda inferior + footer visível) */
  isLastInGroup?: boolean;
  onRetry?: (id: string) => void;
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
}: MessageBubbleProps) {
  const isOwn = mensagem.direction === 'outbound';
  const failed = mensagem.status === 'failed';
  const isMedia = mensagem.type !== 'text';

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

  return (
    <div className={cn('flex px-3 mb-0.5', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative max-w-[75%] md:max-w-[65%] px-3 py-1.5 shadow-sm text-sm',
          isOwn ? 'bg-[#d9fdd3] text-zinc-900' : 'bg-white text-zinc-900',
          radiusClass,
          failed && 'border border-red-400',
        )}
      >
        {isMedia ? (
          <div className="space-y-1">
            {mensagem.type === 'image' && mensagem.media_url ? (
              <img
                src={mensagem.media_url}
                alt={mensagem.media_filename ?? 'imagem'}
                className="rounded-lg max-w-[280px] block"
                loading="lazy"
              />
            ) : null}
            {mensagem.content ? (
              <p className="whitespace-pre-wrap break-words">{mensagem.content}</p>
            ) : (
              <span className="text-zinc-500 italic text-xs">
                {mensagem.type === 'audio' && '🎤 Áudio'}
                {mensagem.type === 'video' && '🎥 Vídeo'}
                {mensagem.type === 'document' && `📄 ${mensagem.media_filename ?? 'Documento'}`}
                {mensagem.type === 'sticker' && '🎨 Sticker'}
                {mensagem.type === 'location' && '📍 Localização'}
                {mensagem.type === 'contact' && '👤 Contato'}
              </span>
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">{mensagem.content}</p>
        )}

        {/* Footer: time + status icon (apenas no último do grupo) */}
        {isLastInGroup ? (
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
      </div>
    </div>
  );
}
