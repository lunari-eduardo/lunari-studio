/**
 * Frame CSS de celular (iPhone realista em titânio) usado para envolver o QR Code.
 * Réplica de alta fidelidade para os modos Dark e Light.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface PhoneMockupProps {
  children: React.ReactNode;
  className?: string;
}

export function PhoneMockup({ children, className }: PhoneMockupProps) {
  return (
    <div className={cn('relative mx-auto select-none', className)}>
      {/* Botões físicos laterais (simulação externa de hardware) */}
      {/* Lateral esquerda: Botão Ação e Volumes */}
      <div className="absolute top-[88px] -left-[3px] w-[3px] h-[22px] rounded-l-sm bg-gradient-to-b from-[#6b6761] to-[#403e3a] opacity-80" />
      <div className="absolute top-[125px] -left-[3px] w-[3px] h-[40px] rounded-l-sm bg-gradient-to-b from-[#6b6761] to-[#403e3a] opacity-80" />
      <div className="absolute top-[175px] -left-[3px] w-[3px] h-[40px] rounded-l-sm bg-gradient-to-b from-[#6b6761] to-[#403e3a] opacity-80" />

      {/* Lateral direita: Botão Power */}
      <div className="absolute top-[120px] -right-[3px] w-[3px] h-[55px] rounded-r-sm bg-gradient-to-b from-[#6b6761] to-[#403e3a] opacity-80" />

      {/* Borda externa de Titânio com chanfro metálico */}
      <div
        className={cn(
          'relative w-[285px] sm:w-[305px] md:w-[320px] min-h-[580px] sm:min-h-[600px]',
          'rounded-[48px] p-[10px]',
          'bg-gradient-to-b from-[#7d7870] via-[#484642] to-[#635f58]',
          'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_20px_rgba(0,0,0,0.2)]',
          'ring-1 ring-white/15 dark:ring-white/10',
        )}
      >
        {/* Aro intermediário fino e escuro (bezel realista) */}
        <div className="w-full h-full rounded-[40px] bg-black p-[2px] shadow-inner flex flex-col">
          {/* Tela interna OLED */}
          <div className="relative flex-1 w-full rounded-[38px] overflow-hidden bg-[#0a0a0c] flex flex-col justify-between p-3.5 pt-2">
            
            {/* Top Bar com Dynamic Island e Status Bar do iOS */}
            <div className="relative w-full z-30 pt-1">
              {/* Dynamic Island */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 h-[22px] w-[88px] bg-black rounded-full flex items-center justify-between px-2.5 z-20 shadow-md">
                <div className="h-2.5 w-2.5 rounded-full bg-[#161618] ring-1 ring-white/10 flex items-center justify-center">
                  <div className="h-1 w-1 rounded-full bg-[#0a2540]/60" />
                </div>
                <div className="h-2 w-2 rounded-full bg-[#0d141e]/80" />
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between px-4 pt-1 text-white text-[11px] font-medium tracking-tight">
                <span>9:41</span>
                <div className="flex items-center gap-1.5 opacity-90">
                  {/* Sinal de rede celular */}
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <rect x="2" y="16" width="3" height="5" rx="0.5" />
                    <rect x="8" y="12" width="3" height="9" rx="0.5" />
                    <rect x="14" y="7" width="3" height="14" rx="0.5" />
                    <rect x="20" y="3" width="3" height="18" rx="0.5" />
                  </svg>
                  {/* Wi-Fi */}
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98A17.9 17.9 0 0 0 12 4zm0 2.9c3.97 0 7.57 1.62 10.18 4.23L12 18.42 1.82 11.13C4.43 8.52 8.03 6.9 12 6.9z" />
                  </svg>
                  {/* Bateria iOS */}
                  <div className="flex items-center">
                    <div className="w-[19px] h-[9px] border border-white/80 rounded-[3px] p-[1px] flex items-center">
                      <div className="h-full w-[80%] bg-white rounded-[1.5px]" />
                    </div>
                    <div className="w-[1.5px] h-[3px] bg-white/80 rounded-r-full -ml-[0.5px]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo dinâmico da tela (QrCodePanel) */}
            <div className="flex-1 flex flex-col justify-center py-2">
              {children}
            </div>

            {/* Home indicator inferior */}
            <div className="w-full flex justify-center pt-1 pb-0.5">
              <div className="h-1 w-28 rounded-full bg-white/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
