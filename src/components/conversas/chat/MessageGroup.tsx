/**
 * Agrupa bubbles consecutivos do mesmo autor para aplicar caudas corretamente.
 */

import type { Mensagem } from '@/modules/conversas/types';
import { MessageBubble } from './MessageBubble';

export interface MessageGroupProps {
  messages: Mensagem[];
  onRetry?: (id: string) => void;
}

export function MessageGroup({ messages, onRetry }: MessageGroupProps) {
  if (messages.length === 0) return null;
  const isOwn = messages[0].direction === 'outbound';

  return (
    <div className={isOwn ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
      {messages.map((msg, idx) => (
        <MessageBubble
          key={msg.id}
          mensagem={msg}
          isFirstInGroup={idx === 0}
          isLastInGroup={idx === messages.length - 1}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}
