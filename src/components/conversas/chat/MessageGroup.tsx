/**
 * Agrupa bubbles consecutivos do mesmo autor para aplicar caudas corretamente.
 */

import type { Mensagem } from '@/modules/conversas/types';
import { MessageBubble } from './MessageBubble';

export interface MessageGroupProps {
  messages: Mensagem[];
  onReply?: (msg: Mensagem) => void;
  onRetry?: (msgId: string) => void;
  onDelete?: (msgId: string) => void;
  onReact?: (msgId: string, emoji: string) => void;
  onEdit?: (msg: Mensagem) => void;
}

export function MessageGroup({ messages, onRetry, onReply, onDelete, onReact, onEdit }: MessageGroupProps) {
  if (messages.length === 0) return null;
  const isOwn = messages[0].direction === 'outbound';

  return (
    <div className={isOwn ? 'w-full flex flex-col items-end' : 'w-full flex flex-col items-start'}>
      {messages.map((msg, idx) => (
        <MessageBubble
          key={msg.id}
          mensagem={msg}
          isFirstInGroup={idx === 0}
          isLastInGroup={idx === messages.length - 1}
          onRetry={onRetry}
          onReply={onReply}
          onDelete={onDelete}
          onReact={onReact ? (emoji) => onReact(msg.id, emoji) : undefined}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
