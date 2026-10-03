import React, { useState } from 'react';
import { Copy, Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PixPaymentData } from './normalize';
import { formatTime } from '../shared/format';
import type { MessageStatus } from '@/modules/conversas/types';

interface PixBubbleProps {
  pixData: PixPaymentData;
  isOwn: boolean;
  timestamp?: string;
  status?: MessageStatus;
}

function StatusIcon({ status }: { status?: MessageStatus }) {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-zinc-400" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    case 'read':
      return <CheckCheck className="h-3.5 w-3.5 text-[#32BCAD]" />;
    case 'delivered':
      return <CheckCheck className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />;
    case 'sent':
      return <Check className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />;
    default:
      return null;
  }
}

export function PixBubble({ pixData, isOwn, timestamp, status }: PixBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pixData.key) {
      navigator.clipboard.writeText(pixData.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const title = pixData.merchant_name || 'Pagamento via Pix';
  
  let subtitle = 'Mensagem de pagamento enviada pelo WhatsApp';
  if (pixData.key && pixData.key_type) {
    const typeLabel = pixData.key_type.charAt(0).toUpperCase() + pixData.key_type.slice(1);
    subtitle = `${typeLabel}: ${pixData.key}`;
  } else if (pixData.key) {
    subtitle = `Chave: ${pixData.key}`;
  }

  return (
    <div className={cn(
      "flex flex-col w-[260px] sm:w-[280px] rounded-xl overflow-hidden shadow-sm relative",
      isOwn 
        ? "bg-[#EAE1D3]/95 dark:bg-[#282117]/95 text-zinc-900 dark:text-zinc-100" 
        : "bg-white/95 dark:bg-[#1C1C1E]/95 text-zinc-900 dark:text-zinc-100 border border-black/[0.06] dark:border-white/[0.08]"
    )}>
      <div className="flex items-start gap-3 p-3 pb-2 relative">
        <div className="shrink-0 w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center border border-white/5 shadow-inner mt-0.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.5L21.5 8L12 13.5L2.5 8L12 2.5Z" fill="#32BCAD"/>
            <path d="M12 21.5L2.5 16L12 10.5L21.5 16L12 21.5Z" fill="#32BCAD"/>
          </svg>
        </div>
        <div className="flex flex-col min-w-0 pr-12">
          <span className="font-semibold text-[13px] leading-tight truncate">{title}</span>
          <span className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{subtitle}</span>
        </div>
        
        {/* Timestamp on the right edge */}
        <div className="absolute right-3 bottom-2 flex items-center gap-1">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans">
            {timestamp ? formatTime(timestamp) : ''}
          </span>
          {isOwn && status && <StatusIcon status={status} />}
        </div>
      </div>
      
      {pixData.total_amount ? (
        <div className="px-3 pb-2">
          <span className="text-sm font-medium">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: pixData.currency || 'BRL' }).format(pixData.total_amount / 100)}
          </span>
        </div>
      ) : null}

      <div className="border-t border-black/[0.06] dark:border-white/[0.06]" />
      
      {pixData.key ? (
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 p-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[#32BCAD] hover:text-[#259b8e] font-medium text-[13px]"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Chave copiada!' : 'Copiar chave Pix'}
        </button>
      ) : (
        <div className="p-2.5 text-center text-[12px] text-zinc-500 italic">
          Chave não disponível
        </div>
      )}
    </div>
  );
}
