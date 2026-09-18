/**
 * Barra de status da instância WhatsApp exibida no topo do painel de chats.
 *
 * Mostra:
 * - Estado da conexão (verde conectado / vermelho desconectado / amarelo conectando)
 * - Telefone conectado quando disponível
 * - Botão para atualizar QR Code (apenas quando não conectado)
 */

import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Wifi, WifiOff, MoreVertical, LogOut } from 'lucide-react';
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
  onSyncChats?: () => void;
  isSyncingChats?: boolean;
  /**
   * Nome amigável exibido quando o WhatsApp está conectado (sobrescreve o telefone).
   * Tipicamente `profile.empresa ?? profile.nome`. Se ausente, cai no telefone
   * formatado e, em último caso, no `instanceName` cru.
   */
  displayName?: string | null;
}

export function InstanceStatusBar({
  instanceName,
  status,
  phone,
  onRefreshQr,
  isRefreshing,
  onDisconnect,
  onSyncChats,
  isSyncingChats,
  displayName,
}: InstanceStatusBarProps) {
  const connected = status === 'connected';
  const connecting = status === 'connecting';

  const dotColor = connected
    ? 'bg-emerald-500'
    : connecting
      ? 'bg-amber-500'
      : 'bg-red-500';

  // Conectado: prioriza displayName (estúdio) > telefone formatado > nome técnico da instância.
  // Desconectado: prioriza displayName (estúdio) > nome técnico da instância.
  const resolvedLabel = connected
    ? (displayName?.trim() || (phone ? formatPhone(phone) : instanceName))
    : (displayName?.trim() || instanceName);

  return (
    <div className="px-3 py-2 border-b border-border/60 bg-background/80">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="relative flex items-center justify-center h-2 w-2 flex-shrink-0">
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75',
                dotColor,
                connecting && 'animate-ping',
              )}
            />
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', dotColor)} />
          </div>
          {connected ? (
            <span className="text-[12px] font-medium text-foreground/85 truncate">
              {resolvedLabel}
            </span>
          ) : (
            <span className="text-[12px] font-medium text-foreground/85 truncate">{resolvedLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {connected && onSyncChats ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSyncChats}
              disabled={isSyncingChats}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Sincronizar conversas do WhatsApp"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncingChats && "animate-spin")} />
            </Button>
          ) : null}

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

          {(onDisconnect || (connected && onSyncChats)) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {connected && onSyncChats && (
                  <DropdownMenuItem onClick={onSyncChats} disabled={isSyncingChats}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", isSyncingChats && "animate-spin")} />
                    {isSyncingChats ? 'Sincronizando...' : 'Sincronizar conversas'}
                  </DropdownMenuItem>
                )}
                {connected && onDisconnect && (
                  <DropdownMenuItem onClick={onDisconnect}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Desconectar WhatsApp
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {!connected && phone ? (
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/60 truncate pl-3.5">
          <span className="truncate">{formatPhone(phone)}</span>
        </div>
      ) : null}
    </div>
  );
}
