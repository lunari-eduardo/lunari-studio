/**
 * Painel com QR Code + countdown + auto-refresh quando expira.
 *
 * Aceita qrcode_data como base64 puro OU já prefixado como data URL.
 */

import { useEffect, useMemo, useState } from 'react';
import { Info, Loader2, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface QrCodePanelProps {
  /** Base64 puro OU data URL completo */
  qrcodeData: string | null;
  /** ISO timestamp de expiração */
  qrcodeExpiresAt: string | null;
  loading: boolean;
  onRefresh: () => void;
}

function toDataUrl(raw: string): string {
  if (raw.startsWith('data:image')) return raw;
  // base64 puro de PNG (heurística comum da Evolution API)
  return `data:image/png;base64,${raw}`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function QrCodePanel({
  qrcodeData,
  qrcodeExpiresAt,
  loading,
  onRefresh,
}: QrCodePanelProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const expiresAt = qrcodeExpiresAt ? new Date(qrcodeExpiresAt).getTime() : null;
  const remainingMs = expiresAt ? expiresAt - now : null;

  // Auto-refresh ao expirar
  useEffect(() => {
    if (remainingMs != null && remainingMs <= 0 && qrcodeData) {
      onRefresh();
    }
  }, [remainingMs, qrcodeData, onRefresh]);

  const imgSrc = useMemo(() => (qrcodeData ? toDataUrl(qrcodeData) : null), [qrcodeData]);

  const expiringSoon = remainingMs != null && remainingMs > 0 && remainingMs < 10000;
  const expired = remainingMs != null && remainingMs <= 0;

  return (
    <div className="w-full text-center space-y-3">
      {/* Header */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="h-10 w-10 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
          <Smartphone className="h-5 w-5" />
        </div>
        <h3 className="text-zinc-100 font-medium text-sm">Escaneie o QR Code</h3>
        <p className="text-[11px] text-zinc-400 leading-snug max-w-[200px]">
          Abra o WhatsApp no celular → Configurações → Aparelhos conectados → Conectar um aparelho.
        </p>
      </div>

      {/* QR */}
      <div className="mx-auto bg-white p-3 rounded-xl w-fit">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt="QR Code WhatsApp"
            className="h-44 w-44 block"
          />
        ) : loading ? (
          <Skeleton className="h-44 w-44 rounded-md" />
        ) : (
          <div className="h-44 w-44 flex items-center justify-center text-zinc-400 text-xs">
            QR aparecerá aqui
          </div>
        )}
      </div>

      {/* Countdown + refresh */}
      <div className="flex items-center justify-center gap-2 text-[11px]">
        {remainingMs != null ? (
          <span
            className={cn(
              'tabular-nums',
              expired
                ? 'text-red-400'
                : expiringSoon
                  ? 'text-amber-300'
                  : 'text-zinc-300',
            )}
          >
            {expired ? 'Expirado' : `Expira em ${formatCountdown(remainingMs)}`}
          </span>
        ) : null}
        <Button
          onClick={onRefresh}
          disabled={loading}
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] text-zinc-300 hover:text-zinc-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Atualizar
        </Button>
      </div>

      {/* Info box */}
      <div className="mx-auto max-w-[230px] flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-left">
        <Info className="h-3.5 w-3.5 text-blue-300 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] leading-snug text-blue-200">
          O QR Code expira em ~60 segundos. Se expirar, clique em Atualizar QR Code.
        </p>
      </div>
    </div>
  );
}
