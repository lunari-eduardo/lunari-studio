import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { COVER_LIST, DEFAULT_COVER_ID } from './covers/registry';

interface Props {
  /** Valor atual. `null`/`undefined` representa "Usar padrão do fotógrafo". */
  selectedCoverId: string | null | undefined;
  onSelect: (coverId: string | null) => void;
  /** Se true, mostra a opção "Herdar padrão do fotógrafo". */
  allowInherit?: boolean;
  /** Texto da opção "herdar" (mostra qual é o default). */
  inheritLabel?: string;
}

export function CoverCatalog({
  selectedCoverId,
  onSelect,
  allowInherit = true,
  inheritLabel = 'Usar capa padrão do meu estúdio',
}: Props) {
  return (
    <div className="space-y-4">
      {allowInherit && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center justify-between',
            selectedCoverId == null
              ? 'border-[#cbb384] bg-[#ddd1b6]/20 ring-1 ring-[#cbb384]/30 shadow-sm'
              : 'border-border/60 hover:bg-muted/40 hover:border-[#cbb384]/40'
          )}
        >
          <div>
            <p className={cn("text-sm font-semibold", selectedCoverId == null ? "text-[#7a6035] dark:text-[#e4d5b7]" : "text-foreground")}>{inheritLabel}</p>
            <p className="text-xs text-muted-foreground">Acompanha o padrão definido em Configurações</p>
          </div>
          {selectedCoverId == null && <Check className="h-4 w-4 text-[#cbb384]" />}
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {COVER_LIST.map((cover) => {
          const isSelected = selectedCoverId === cover.id;
          const Thumb = cover.Thumbnail;
          return (
            <button
              key={cover.id}
              type="button"
              onClick={() => onSelect(cover.id)}
              className={cn(
                'group text-left rounded-xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col',
                isSelected
                  ? 'border-[#cbb384] ring-1 ring-[#cbb384]/40 shadow-md bg-[#ddd1b6]/10'
                  : 'border-border/60 bg-card hover:border-[#cbb384]/50'
              )}
            >
              <div className="relative aspect-[3/4] w-full bg-muted overflow-hidden flex items-center justify-center">
                {cover.imagePreview ? (
                  <img src={cover.imagePreview} alt={cover.name} className="w-full h-full object-cover" />
                ) : (
                  <Thumb className="absolute inset-0 w-full h-full" />
                )}
                
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-[#cbb384] text-white rounded-full p-1.5 shadow-md">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              <div className="px-4 py-3 flex-1 flex flex-col">
                <p className="text-sm font-semibold leading-tight text-foreground flex items-center justify-between">
                  {cover.name}
                  {cover.id === DEFAULT_COVER_ID && (
                    <span className="text-[10px] uppercase tracking-wider bg-[#ddd1b6]/50 text-[#7a6035] dark:text-[#e4d5b7] px-1.5 py-0.5 rounded font-medium">
                      padrão
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                  {cover.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
