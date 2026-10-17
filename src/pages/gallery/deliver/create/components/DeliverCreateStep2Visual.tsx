import { Sparkles, Sun, Moon, Film } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CoverCatalog } from '@/components/deliver/CoverCatalog';
import { COVER_REGISTRY } from '@/components/deliver/covers/registry';
import { cn } from '@/lib/utils';

interface DeliverCreateStep2VisualProps {
  coverId: string | null;
  setCoverId: (id: string | null) => void;
  settings: any;
  photoSpacing: number;
  setPhotoSpacing: (gap: number) => void;
  clientMode: 'light' | 'dark';
  setClientMode: (mode: 'light' | 'dark') => void;
}

export function DeliverCreateStep2Visual({
  coverId,
  setCoverId,
  settings,
  photoSpacing,
  setPhotoSpacing,
  clientMode,
  setClientMode,
}: DeliverCreateStep2VisualProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#cbb384]" />
          <h2 className="text-lg font-semibold text-foreground">Design e Personalização Visual</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Escolha a capa que vai impactar o cliente no primeiro acesso. Tema e tipografia seguem o
          padrão da sua conta — ajuste depois em <strong>Design & Temas</strong>, na edição da galeria.
        </p>
      </div>

      {/* Capa da Galeria de Entrega (Hero) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#cbb384]" />
          <Label className="text-base font-semibold">Capa da Galeria (Hero)</Label>
          <span className="text-[10px] uppercase tracking-wider bg-[#ddd1b6]/50 text-[#7a6035] dark:text-[#e4d5b7] px-2.5 py-0.5 rounded-full border border-[#cbb384]/30 font-medium ml-auto">
            Hero
          </span>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Apresentação inicial da galeria para impactar no primeiro acesso.
        </p>
        <CoverCatalog
          selectedCoverId={coverId}
          onSelect={setCoverId}
          inheritLabel={
            settings?.defaultCoverId
              ? `Usar capa padrão do meu estúdio (${
                  COVER_REGISTRY[settings.defaultCoverId]?.name ?? settings.defaultCoverId
                })`
              : 'Usar capa padrão do meu estúdio'
          }
        />

        {coverId === 'cinema' && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3 mt-3 animate-fade-in">
            <Film className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-semibold text-sm">Capa Cinematográfica Ativa</h5>
              <p className="text-xs text-muted-foreground">
                Esta capa exibe um vídeo em loop em tela cheia na entrada da galeria. <strong>Na próxima etapa (Fotos)</strong>, você poderá enviar o arquivo de vídeo. Detalhes visuais poderão ser ajustados depois em <strong>Design & Temas</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Layout e Espaçamento */}
      <div className="grid gap-6 md:grid-cols-2 pt-4 border-t border-border/40">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Espaçamento do Grid</Label>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded-md text-foreground">
              {photoSpacing}px
            </span>
          </div>
          <Slider
            value={[photoSpacing]}
            onValueChange={(vals) => setPhotoSpacing(vals[0])}
            min={0}
            max={40}
            step={1}
            className="py-1"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Modo de Cor do Cliente</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={clientMode === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setClientMode('light')}
              className={cn(
                'gap-1.5 rounded-xl transition-all',
                clientMode === 'light' &&
                  'bg-[#cbb384] hover:bg-[#bfa574] text-white shadow-sm border-transparent'
              )}
            >
              <Sun className="h-3.5 w-3.5" />
              Claro
            </Button>
            <Button
              type="button"
              variant={clientMode === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setClientMode('dark')}
              className={cn(
                'gap-1.5 rounded-xl transition-all',
                clientMode === 'dark' &&
                  'bg-neutral-900 dark:bg-card text-foreground border-[#cbb384]/50 shadow-sm'
              )}
            >
              <Moon className="h-3.5 w-3.5" />
              Escuro
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
