import { CoverCatalog } from '@/components/deliver/CoverCatalog';
import { SELECTION_COVER_LIST, DEFAULT_SELECTION_COVER_ID } from '@/components/gallery/covers/registry';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Props {
  defaultSelectionCoverId: string;
  onUpdate: (data: { defaultSelectionCoverId: string }) => void;
}

export function SelectionCoverConfig({ defaultSelectionCoverId, onUpdate }: Props) {
  const current = defaultSelectionCoverId || DEFAULT_SELECTION_COVER_ID;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Label className="text-base font-medium">Capa padrão (Seleção)</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Cabeçalho aplicado automaticamente em novas Galerias de Seleção.
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">Apenas Galerias de Seleção</Badge>
      </div>

      <CoverCatalog
        selectedCoverId={current}
        onSelect={(id) => onUpdate({ defaultSelectionCoverId: id || DEFAULT_SELECTION_COVER_ID })}
        allowInherit={false}
        coverList={SELECTION_COVER_LIST}
        defaultCoverId={DEFAULT_SELECTION_COVER_ID}
      />
    </div>
  );
}
