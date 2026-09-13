/**
 * Tela de primeiro acesso do módulo Conversas.
 *
 * Mostra hero + phone mockup com QR + 6 benefícios quando o fotógrafo
 * ainda não tem instância WhatsApp conectada (ou precisa reconectar).
 * Suporte dinâmico aos modos Dark e Light com design oficial do Lunari (Imagem 2).
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

  const firstInstance = instancias[0] ?? null;

  const handleCreate = async () => {
    try {
      setCreating(true);
      if (firstInstance) {
        await refreshQrCode(firstInstance.id);
      } else {
        await createInstance('lunari-default');
      }
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
    <div className="w-full max-w-[1440px] mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-8 md:space-y-10 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Conversas
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          WhatsApp integrado ao seu fluxo de trabalho
        </p>
      </div>

      {/* Grid Principal em 3 Colunas (Hero | Mockup do Smartphone | Benefícios) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_auto_1.05fr] xl:grid-cols-[1.15fr_330px_1.05fr] gap-8 xl:gap-12 items-center">
        {/* Coluna 1 (Esquerda): Hero */}
        <div className="flex flex-col justify-center">
          <ConnectHero
            onGenerateQr={handleCreate}
            onOpenHowItWorks={() => toast.info('Guia em breve!')}
            loading={creating || isLoading}
          />
        </div>

        {/* Coluna 2 (Centro): Mockup Realista de Smartphone iPhone */}
        <div className="flex items-center justify-center my-4 lg:my-0">
          <PhoneMockup>
            <QrCodePanel
              qrcodeData={firstInstance?.qrcode_data ?? null}
              qrcodeExpiresAt={firstInstance?.qrcode_expires_at ?? null}
              loading={refreshing}
              onRefresh={handleRefresh}
            />
          </PhoneMockup>
        </div>

        {/* Coluna 3 (Direita): 6 Cards Verticais de Benefícios */}
        <div className="flex flex-col justify-center">
          <BenefitGrid />
        </div>
      </div>

      {/* Tip Strip Inferior (Dica e Guia Completo) */}
      <div className="rounded-2xl border border-border/50 bg-card/40 dark:bg-card/25 backdrop-blur-sm px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/25 text-[#C9A87C] flex items-center justify-center flex-shrink-0">
            <Lightbulb className="h-4 w-4 text-[#C9A87C]" />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Dica:</span> mantenha seu celular conectado
            à internet durante o processo de vinculação.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-sm text-muted-foreground hidden sm:inline">Precisa de ajuda?</span>
          <button
            type="button"
            onClick={() => toast.info('Guia em breve!')}
            className="text-sm font-medium text-foreground bg-card hover:bg-muted border border-border/60 hover:border-border px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm"
          >
            Ver guia completo
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
