import { useState, useEffect } from 'react';
import { ShieldOff, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { OptionList } from '@/components/ui/option-list';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { WatermarkUploader } from './WatermarkUploader';
import { useWatermarkSettings, WatermarkMode } from '@/hooks/useWatermarkSettings';

export function WatermarkSettings() {
  const { 
    settings, 
    isLoading, 
    isSaving,
    saveSettings, 
    uploadWatermark, 
    deleteWatermark 
  } = useWatermarkSettings();

  const [localOpacity, setLocalOpacity] = useState(settings.opacity);

  // Sync local state with fetched settings
  useEffect(() => {
    setLocalOpacity(settings.opacity);
  }, [settings.opacity]);

  const handleModeChange = async (mode: WatermarkMode) => {
    await saveSettings({ mode });
  };

  const handleOpacityChange = (value: number[]) => {
    setLocalOpacity(value[0]);
  };

  const handleOpacityCommit = async (value: number[]) => {
    await saveSettings({ opacity: value[0] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <OptionList
        aria-label="Tipo de proteção"
        items={[
          { value: 'system', label: 'Padrão do sistema', description: 'Marca d’água Lunari, proteção completa', disabled: isSaving },
          { value: 'custom', label: 'Minha marca', description: 'Seu logo aplicado sobre as fotos', disabled: isSaving },
          { value: 'none', label: 'Nenhuma', description: 'Fotos sem marca d’água', disabled: isSaving },
        ]}
        value={settings.mode}
        onValueChange={(value) => handleModeChange(value as WatermarkMode)}
      />

      {/* Custom Watermark Upload */}
      {settings.mode === 'custom' && (
        <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
          <Label className="text-sm">Sua marca d'água</Label>
          <WatermarkUploader
            currentPath={settings.path}
            onUpload={uploadWatermark}
            onDelete={deleteWatermark}
            disabled={isSaving}
            opacity={localOpacity}
            scale={settings.scale}
          />

          {/* Tile size selector */}
          {settings.path && (
            <div className="space-y-2">
              <Label className="text-sm">Tamanho da marca</Label>
              <SegmentedControl
                aria-label="Tamanho da marca"
                variant="subtle"
                size="sm"
                options={[
                  { value: 'small', label: 'Pequeno' },
                  { value: 'medium', label: 'Médio' },
                  { value: 'large', label: 'Grande' },
                ]}
                value={settings.scale === 15 ? 'small' : settings.scale === 40 ? 'large' : 'medium'}
                onValueChange={(value) => {
                  if (isSaving) return;
                  const scaleMap = { small: 15, medium: 25, large: 40 };
                  saveSettings({ scale: scaleMap[value as 'small' | 'medium' | 'large'] });
                }}
              />
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              Use PNG com fundo transparente. A marca será aplicada em padrão repetido cobrindo toda a imagem.
            </p>
          </div>
        </div>
      )}

      {/* Opacity Slider (only if not 'none') */}
      {settings.mode !== 'none' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Opacidade</Label>
            <span className="text-sm font-medium tabular-nums">
              {localOpacity}%
            </span>
          </div>
          <Slider
            value={[localOpacity]}
            onValueChange={handleOpacityChange}
            onValueCommit={handleOpacityCommit}
            min={10}
            max={100}
            step={5}
            disabled={isSaving}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Valores baixos deixam a marca mais sutil
          </p>
        </div>
      )}

      {/* Warning for 'none' mode */}
      {settings.mode === 'none' && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
          <ShieldOff className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
          <p className="text-destructive">
            Sem marca d'água, suas fotos ficam desprotegidas durante a seleção do cliente.
          </p>
        </div>
      )}

      {/* Info about burn-in */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50 text-sm">
        <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <p className="text-muted-foreground">
          A marca d'água é aplicada diretamente nas fotos durante o upload, 
          garantindo proteção consistente em qualquer dispositivo ou zoom.
        </p>
      </div>
    </div>
  );
}
