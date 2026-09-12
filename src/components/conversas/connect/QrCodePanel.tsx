/**
 * Painel com QR Code + countdown + auto-refresh quando expira.
 * Reprodução fiel da tela de conexão WhatsApp no iPhone (Imagem 2).
 */

import { useEffect, useMemo, useState } from 'react';
import { Info, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.507 14.307l-.009.075c-.238-.12-1.406-.694-1.624-.774-.219-.079-.378-.119-.537.12-.159.239-.616.774-.755.933-.139.16-.279.18-.518.06-.239-.12-1.008-.372-1.92-1.185-.709-.633-1.188-1.415-1.328-1.654-.139-.24-.015-.369.105-.488.107-.107.239-.279.359-.419.119-.139.159-.239.239-.398.08-.16.04-.299-.02-.419-.06-.12-.538-1.296-.737-1.774-.194-.467-.392-.403-.538-.411l-.458-.008c-.16 0-.418.06-.637.299-.219.239-.836.817-.836 1.993 0 1.176.856 2.312.976 2.472.12.159 1.685 2.572 4.082 3.607.57.246 1.016.393 1.364.504.573.182 1.094.156 1.506.095.459-.069 1.406-.575 1.605-1.131.199-.556.199-1.032.14-1.131-.06-.099-.219-.16-.458-.279z" />
      <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.763.46 3.486 1.332 5.002L2 22l5.127-1.309c1.47.801 3.125 1.223 4.877 1.223 5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm0 18.293c-1.504 0-2.977-.404-4.264-1.168l-.306-.182-3.167.809.845-3.087-.2-.318a8.267 8.267 0 0 1-1.272-4.343c0-4.576 3.723-8.299 8.299-8.299 4.577 0 8.3 3.723 8.3 8.299 0 4.576-3.723 8.293-8.299 8.293z" />
    </svg>
  );
}

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
    <div className="w-full text-center flex flex-col items-center justify-center space-y-3">
      {/* Header interno do app */}
      <div className="flex flex-col items-center gap-1">
        <div className="h-10 w-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-2 ring-white/10">
          <WhatsAppIcon className="h-5 w-5 fill-white" />
        </div>
        <h3 className="text-white font-semibold text-sm mt-1 tracking-tight">
          Escaneie o QR Code
        </h3>
        <p className="text-[11px] text-zinc-400 leading-snug max-w-[210px] mx-auto">
          Abra o WhatsApp no seu celular, vá em Aparelhos conectados e escaneie o código abaixo.
        </p>
      </div>

      {/* Card branco do QR Code */}
      <div className="relative bg-white p-3 rounded-2xl shadow-xl w-fit border border-white/20 my-0.5">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt="QR Code WhatsApp"
            className="h-40 w-40 sm:h-44 sm:w-44 block object-contain"
          />
        ) : loading ? (
          <div className="h-40 w-40 sm:h-44 sm:w-44 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            <span className="text-[11px] font-medium text-zinc-500">Gerando código seguro…</span>
          </div>
        ) : (
          /* Mockup de QR Code de demonstração de alta resolução com logo WhatsApp */
          <div className="relative h-40 w-40 sm:h-44 sm:w-44 flex items-center justify-center">
            <svg
              className="h-full w-full"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Padrão de QR Code simulado de alta fidelidade */}
              {/* Canto superior esquerdo */}
              <rect x="10" y="10" width="50" height="50" rx="6" fill="#000" />
              <rect x="18" y="18" width="34" height="34" rx="3" fill="#fff" />
              <rect x="26" y="26" width="18" height="18" rx="2" fill="#000" />

              {/* Canto superior direito */}
              <rect x="140" y="10" width="50" height="50" rx="6" fill="#000" />
              <rect x="148" y="18" width="34" height="34" rx="3" fill="#fff" />
              <rect x="156" y="26" width="18" height="18" rx="2" fill="#000" />

              {/* Canto inferior esquerdo */}
              <rect x="10" y="140" width="50" height="50" rx="6" fill="#000" />
              <rect x="18" y="148" width="34" height="34" rx="3" fill="#fff" />
              <rect x="26" y="156" width="18" height="18" rx="2" fill="#000" />

              {/* Módulos de dados distribuídos */}
              <rect x="68" y="14" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="84" y="14" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="100" y="14" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="116" y="14" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="76" y="28" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="92" y="28" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="108" y="28" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="124" y="28" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="68" y="42" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="100" y="42" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="124" y="42" width="8" height="8" rx="1.5" fill="#000" />

              <rect x="14" y="68" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="28" y="76" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="42" y="68" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="52" y="84" width="8" height="8" rx="1.5" fill="#000" />

              <rect x="140" y="68" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="160" y="76" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="180" y="68" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="148" y="84" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="172" y="84" width="8" height="8" rx="1.5" fill="#000" />

              {/* Linhas centrais */}
              <rect x="68" y="68" width="10" height="10" rx="1.5" fill="#000" />
              <rect x="122" y="68" width="10" height="10" rx="1.5" fill="#000" />
              <rect x="68" y="122" width="10" height="10" rx="1.5" fill="#000" />
              <rect x="122" y="122" width="10" height="10" rx="1.5" fill="#000" />

              {/* Inferiores */}
              <rect x="68" y="148" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="92" y="148" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="116" y="148" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="140" y="148" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="172" y="148" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="76" y="168" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="100" y="168" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="148" y="168" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="180" y="168" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="160" y="180" width="8" height="8" rx="1.5" fill="#000" />
              <rect x="124" y="180" width="8" height="8" rx="1.5" fill="#000" />
            </svg>

            {/* Logo do WhatsApp no centro do QR Code */}
            <div className="absolute inset-0 m-auto h-10 w-10 bg-white rounded-xl shadow-md flex items-center justify-center border border-zinc-100">
              <div className="h-7 w-7 rounded-full bg-[#25D366] flex items-center justify-center">
                <WhatsAppIcon className="h-4 w-4 fill-white" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Countdown ou Refresh ativo (se houver) */}
      {qrcodeData && (
        <div className="flex items-center justify-center gap-2 text-[11px]">
          {remainingMs != null ? (
            <span
              className={cn(
                'tabular-nums font-medium',
                expired
                  ? 'text-rose-400'
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
            className="h-6 px-2 text-[11px] text-zinc-300 hover:text-white hover:bg-white/10"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Atualizar
          </Button>
        </div>
      )}

      {/* Box informativo inferior com ícone info azul (Imagem 2) */}
      <div className="mx-auto max-w-[245px] flex items-start gap-2 bg-[#12161f]/90 border border-blue-500/20 rounded-xl px-3 py-2 text-left shadow-sm">
        <div className="h-3.5 w-3.5 rounded-full bg-blue-500/20 text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Info className="h-2.5 w-2.5" />
        </div>
        <p className="text-[10px] leading-tight text-zinc-400">
          O QR Code expira em alguns minutos. Se não funcionar, gere um novo.
        </p>
      </div>
    </div>
  );
}

