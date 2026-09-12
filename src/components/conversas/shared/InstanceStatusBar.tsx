/**
 * Barra de status da instância WhatsApp exibida no topo do painel de chats.
 *
 * Mostra:
 * - Estado da conexão (verde conectado / vermelho desconectado / amarelo conectando)
 * - Telefone conectado quando disponível
 * - Botão para atualizar QR Code (apenas quando não conectado)
 */

import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { InstanciaStatus } from '@/modules/conversas/types';
import { cn } from '@/lib/utils';
import { formatPhone } from './format';

export interface InstanceStatusBarProps {
  instanceName: string;
  status: InstanciaStatus;
  phone?: string | null;
  onRefreshQr?: () => void;
  isRefreshing?: boolean;
}

export function InstanceStatusBar({
  instanceName,
  status,
  phone,
  onRefreshQr,
  isRefreshing,
}: InstanceStatusBarProps) {
  const connected = status === 'connected';
  const connecting = status === 'connecting';

  const dotColor = connected
    ? 'bg-emerald-500'
    : connecting
      ? 'bg-amber-500'
      : 'bg-red-500';

  const label = connected
    ? 'Conectado'
    : connecting
      ? 'Conectando…'
      : status === 'error'
        ? 'Erro de conexão'
        : 'Sem instância conectada';

  return (
    <div className="px-3 py-2 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center h-2 w-2">
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-60',
                dotColor,
                connecting && 'animate-ping',
              )}
            />
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', dotColor)} />
          </div>
          <span className="text-xs font-medium text-foreground truncate">{label}</span>
          {connected ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
          )}
        </div>

        {!connected && onRefreshQr ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefreshQr}
            disabled={isRefreshing}
            className="h-7 px-2 text-xs"
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">QR Code</span>
          </Button>
        ) : null}
      </div>

      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground truncate">
        <span className="truncate">{instanceName}</span>
        {connected && phone ? (
          <>
            <span>·</span>
            <span className="truncate">{formatPhone(phone)}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
