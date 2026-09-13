/**
 * Barra de status da instância WhatsApp exibida no topo do painel de chats.
 *
 * Mostra:
 * - Estado da conexão (verde conectado / vermelho desconectado / amarelo conectando)
 * - Telefone conectado quando disponível
 * - Botão para atualizar QR Code (apenas quando não conectado)
 */

import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Wifi, WifiOff, MoreVertical, LogOut, Trash2 } from 'lucide-react';
import type { InstanciaStatus } from '@/modules/conversas/types';
import { cn } from '@/lib/utils';
import { formatPhone } from './format';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface InstanceStatusBarProps {
  instanceName: string;
  status: InstanciaStatus;
  phone?: string | null;
  onRefreshQr?: () => void;
  isRefreshing?: boolean;
  onDisconnect?: () => void;
  onDelete?: () => void;
}

export function InstanceStatusBar({
  instanceName,
  status,
  phone,
  onRefreshQr,
  isRefreshing,
  onDisconnect,
  onDelete,
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

        <div className="flex items-center gap-1">
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

          {(onDisconnect || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {connected && onDisconnect && (
                  <DropdownMenuItem onClick={onDisconnect}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Desconectar WhatsApp
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir instância
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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
