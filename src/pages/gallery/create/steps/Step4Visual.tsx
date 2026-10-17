import { Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { CoverCatalog } from '@/components/deliver/CoverCatalog';
import { SELECTION_COVER_LIST, DEFAULT_SELECTION_COVER_ID } from '@/components/gallery/covers/registry';
import { GlobalSettings } from '@/types/gallery';

export interface Step4VisualProps {
  coverId: string | null;
  setCoverId: (id: string | null) => void;
  settings?: GlobalSettings;
}

export function Step4Visual({ coverId, setCoverId, settings }: Step4VisualProps) {
  const defaultCoverName = settings?.defaultSelectionCoverId
    ? SELECTION_COVER_LIST.find((c) => c.id === settings.defaultSelectionCoverId)?.name
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#cbb384]" />
        <Label className="text-base font-semibold">Capa da Galeria</Label>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Cabeçalho exibido ao cliente no topo da galeria de seleção.
      </p>
      <CoverCatalog
        selectedCoverId={coverId}
        onSelect={setCoverId}
        coverList={SELECTION_COVER_LIST}
        defaultCoverId={DEFAULT_SELECTION_COVER_ID}
        inheritLabel={
          defaultCoverName
            ? `Usar capa padrão do meu estúdio (${defaultCoverName})`
            : 'Usar capa padrão do meu estúdio'
        }
      />
    </div>
  );
}
