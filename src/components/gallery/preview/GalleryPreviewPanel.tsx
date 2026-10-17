import { useEffect, useState } from 'react';
import { Eye, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import {
  GalleryLivePreview,
  GalleryLivePreviewProps,
  PreviewGalleryType,
  PreviewView,
  PreviewViewport,
} from './GalleryLivePreview';

export interface GalleryPreviewPanelProps
  extends Omit<GalleryLivePreviewProps, 'viewport' | 'view' | 'type'> {
  type: PreviewGalleryType;
  /** Quando informado, mostra o alternador Entrega/Seleção. */
  onTypeChange?: (type: PreviewGalleryType) => void;
  view?: PreviewView;
  onViewChange?: (view: PreviewView) => void;
  defaultViewport?: PreviewViewport;
  title?: string;
  className?: string;
}

const DEVICE_OPTIONS = [
  { value: 'desktop', label: 'Desktop', icon: Monitor, iconOnly: true },
  { value: 'mobile', label: 'Celular', icon: Smartphone, iconOnly: true },
];

/** Cartão de pré-visualização: controles + preview real da galeria. */
export function GalleryPreviewPanel({
  type,
  onTypeChange,
  view,
  onViewChange,
  defaultViewport = 'desktop',
  title = 'Pré-visualização',
  className,
  ...previewProps
}: GalleryPreviewPanelProps) {
  const [viewport, setViewport] = useState<PreviewViewport>(defaultViewport);
  const [innerView, setInnerView] = useState<PreviewView>(view ?? 'cover');

  useEffect(() => {
    if (view) setInnerView(view);
  }, [view]);

  const changeView = (next: PreviewView) => {
    setInnerView(next);
    onViewChange?.(next);
  };

  return (
    <div
      className={cn(
        'space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[0_8px_24px_rgba(0,0,0,0.03)]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <SegmentedControl
          aria-label="Dispositivo"
          variant="subtle"
          size="sm"
          options={DEVICE_OPTIONS}
          value={viewport}
          onValueChange={(v) => setViewport(v as PreviewViewport)}
        />
      </div>

      {(onTypeChange || type === 'entrega') && (
        <div className="flex flex-wrap items-center gap-2">
          {onTypeChange && (
            <SegmentedControl
              aria-label="Tipo de galeria"
              variant="subtle"
              size="sm"
              options={[
                { value: 'entrega', label: 'Entrega' },
                { value: 'selecao', label: 'Seleção' },
              ]}
              value={type}
              onValueChange={(v) => onTypeChange(v as PreviewGalleryType)}
            />
          )}
          {type === 'entrega' && (
            <SegmentedControl
              aria-label="Área da galeria"
              variant="subtle"
              size="sm"
              options={[
                { value: 'cover', label: 'Capa' },
                { value: 'photos', label: 'Fotos' },
              ]}
              value={innerView}
              onValueChange={(v) => changeView(v as PreviewView)}
            />
          )}
        </div>
      )}

      <div
        className={cn(
          'relative overflow-hidden border border-border bg-muted',
          viewport === 'desktop'
            ? 'aspect-[16/9] w-full rounded-xl'
            : 'mx-auto aspect-[375/667] w-full max-w-[280px] rounded-[22px]'
        )}
      >
        <GalleryLivePreview type={type} viewport={viewport} view={innerView} {...previewProps} />
      </div>
    </div>
  );
}

/** Para telas < lg: botão que abre o mesmo preview numa gaveta, sem espremer os controles. */
export function GalleryPreviewDrawer({ className, ...panelProps }: GalleryPreviewPanelProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button type="button" variant="outline" className={cn('w-full gap-2', className)}>
          <Eye className="h-4 w-4" />
          Pré-visualizar galeria
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Pré-visualização da galeria</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <GalleryPreviewPanel {...panelProps} defaultViewport="mobile" className="border-0 p-0 shadow-none" />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
