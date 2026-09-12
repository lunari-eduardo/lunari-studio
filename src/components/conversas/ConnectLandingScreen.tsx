/**
 * Tela de primeiro acesso do módulo Conversas.
 *
 * Mostra hero + phone mockup com QR + 6 benefícios quando o fotógrafo
 * ainda não tem instância WhatsApp conectada (ou precisa reconectar).
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { useConversas } from '@/hooks/useConversasRealtime';
import { ConnectHero } from './connect/ConnectHero';
import { PhoneMockup } from './connect/PhoneMockup';
import { QrCodePanel } from './connect/QrCodePanel';
import { BenefitGrid } from './connect/BenefitGrid';
import { ExternalLink, Lightbulb } from 'lucide-react';

export function ConnectLandingScreen() {
  const { instancias, createInstance, refreshQrCode, isLoading } = useConversas();
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isReconnect = instancias.length > 0;
  const firstInstance = instancias[0] ?? null;

  const handleCreate = async () => {
    try {
      setCreating(true);
      const instanceName = `lunari-${crypto.randomUUID().slice(0, 8)}`;
      await createInstance(instanceName);
    } catch {
      // toast tratado no hook
    } finally {
      setCreating(false);
    }
  };

  const handleRefresh = async () => {
    if (!firstInstance) return;
    try {
      setRefreshing(true);
      await refreshQrCode(firstInstance.id);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0f0e0c] text-zinc-50 -mx-4 md:-mx-6 -my-6 px-4 md:px-6 py-6 md:py-10">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-8 md:mb-12">
          <h2 className="font-serif text-2xl text-zinc-50">Conversas</h2>
          <p className="text-sm text-zinc-400">WhatsApp integrado ao seu fluxo de trabalho</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_360px] gap-8 lg:gap-12">
          {/* Coluna esquerda: hero + mockup */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ConnectHero
              onGenerateQr={handleCreate}
              onOpenHowItWorks={() => toast.info('Guia em breve!')}
              loading={creating || isLoading}
            />

            <div className="flex items-center justify-center">
              <PhoneMockup>
                <QrCodePanel
                  qrcodeData={firstInstance?.qrcode_data ?? null}
                  qrcodeExpiresAt={firstInstance?.qrcode_expires_at ?? null}
                  loading={refreshing}
                  onRefresh={handleRefresh}
                />
              </PhoneMockup>
            </div>
          </div>

          {/* Coluna direita: benefícios */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Por que conectar
            </h3>
            <BenefitGrid />
          </div>
        </div>

        {/* Tip strip */}
        <div className="mt-10 md:mt-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-300">
              <span className="font-medium text-zinc-50">Dica:</span> tenha seu celular com
              WhatsApp Business instalado e conectado ao Wi-Fi antes de escanear.
            </p>
          </div>
          <button
            type="button"
            onClick={() => toast.info('Guia em breve!')}
            className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
          >
            Ver guia completo
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
