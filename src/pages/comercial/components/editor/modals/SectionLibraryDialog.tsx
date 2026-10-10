import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ADDABLE_BLOCK_TYPES, getBlockDef, getBlockName } from '../../../blocks/registry';

// Categorias por intenção (ordem de uma proposta). Tipo novo fora daqui cai em "Outras".
const CATEGORIES: { title: string; types: string[] }[] = [
  { title: 'Abertura', types: ['CoverBlock'] },
  { title: 'Conteúdo', types: ['EditorialBlock', 'EditorialComposition', 'DividerBlock'] },
  { title: 'Portfólio', types: ['Gallery'] },
  { title: 'Preços', types: ['PricingTable'] },
  { title: 'Prova social', types: ['TestimonialBlock'] },
  { title: 'Informações', types: ['InfoBlock'] },
  { title: 'Fechamento', types: ['CTABlock', 'FooterTerms'] },
];

// Mini-wireframes neutros: o fotógrafo reconhece a seção pela forma, não pelo nome
const bar = (w: string, extra = '') => <span className={`block h-1 rounded-full bg-foreground/25 ${w} ${extra}`} />;
const box = (cls: string) => <span className={`block rounded-[3px] bg-foreground/10 ${cls}`} />;

const THUMBS: Record<string, React.ReactNode> = {
  CoverBlock: (
    <div className="relative h-full w-full">
      {box('absolute inset-0')}
      <div className="absolute inset-x-0 bottom-2 flex flex-col items-center gap-1">{bar('w-10 h-1.5')}{bar('w-6')}</div>
    </div>
  ),
  EditorialBlock: (
    <div className="flex h-full w-full items-center gap-2 p-2">
      <div className="flex flex-1 flex-col gap-1">{bar('w-8 h-1.5')}{bar('w-full')}{bar('w-4/5')}{bar('w-3/5')}</div>
      {box('h-full w-2/5')}
    </div>
  ),
  EditorialComposition: (
    <div className="flex h-full w-full">
      {box('h-full w-1/2 rounded-none')}
      <div className="flex flex-1 flex-col justify-center gap-1 p-2">{bar('w-full h-2')}{bar('w-3/4')}</div>
    </div>
  ),
  DividerBlock: (
    <div className="flex h-full w-full items-center gap-1.5 px-3">
      <span className="h-px flex-1 bg-foreground/25" />
      <span className="h-1.5 w-1.5 rotate-45 border border-foreground/30" />
      <span className="h-px flex-1 bg-foreground/25" />
    </div>
  ),
  Gallery: (
    <div className="grid h-full w-full grid-cols-3 gap-1 p-2">
      {box('row-span-2 h-full')}{box('h-full')}{box('h-full')}{box('col-span-2 h-full')}
    </div>
  ),
  PricingTable: (
    <div className="flex h-full w-full items-end gap-1 p-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex h-4/5 flex-1 flex-col gap-1 rounded-[3px] border border-foreground/15 p-1">
          {bar('w-3/4')}{bar('w-1/2 h-1.5')}
        </div>
      ))}
    </div>
  ),
  TestimonialBlock: (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-3">
      <span className="font-serif text-lg leading-none text-foreground/30">“</span>
      {bar('w-full')}{bar('w-4/5')}{bar('w-6 mt-1')}
    </div>
  ),
  InfoBlock: (
    <div className="flex h-full w-full flex-col justify-center gap-1.5 px-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/25" />
          {bar('flex-1')}
        </div>
      ))}
    </div>
  ),
  CTABlock: (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
      {bar('w-14 h-1.5')}
      <span className="block h-3 w-10 rounded-full bg-foreground/20" />
    </div>
  ),
  FooterTerms: (
    <div className="flex h-full w-full flex-col justify-end gap-1 p-2">
      {bar('w-full')}{bar('w-4/5')}<span className="mt-1 block h-px w-full bg-foreground/20" />{bar('w-8')}
    </div>
  ),
};

interface SectionLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: string) => void;
  /** Texto da posição ("após Portfólio" / "no final da proposta"). */
  positionLabel: string;
}

// ============================================================
// BIBLIOTECA DE SEÇÕES (substitui o dropdown que saía da tela)
// Busca + categorias + miniaturas; sempre cabe na tela (rolagem interna).
// ============================================================
export function SectionLibraryDialog({ open, onOpenChange, onAdd, positionLabel }: SectionLibraryDialogProps) {
  const listed = new Set(CATEGORIES.flatMap((c) => c.types));
  const groups = [
    ...CATEGORIES.map((c) => ({ ...c, types: c.types.filter((t) => ADDABLE_BLOCK_TYPES.includes(t)) })),
    { title: 'Outras', types: ADDABLE_BLOCK_TYPES.filter((t) => !listed.has(t)) },
  ].filter((g) => g.types.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 flex flex-col overflow-hidden sm:rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-3 text-left">
          <DialogTitle>Adicionar seção</DialogTitle>
          <DialogDescription>Entra {positionLabel}. Depois é só ajustar textos, fotos e estilo.</DialogDescription>
        </DialogHeader>

        <Command className="flex-1 min-h-0 rounded-none bg-transparent">
          <div className="px-3">
            <CommandInput placeholder="Buscar seção (ex.: preços, depoimentos, galeria)" autoFocus />
          </div>
          <CommandList className="max-h-none flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
            <CommandEmpty>Nenhuma seção encontrada.</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup
                key={g.title}
                heading={g.title}
                className="[&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:grid-cols-1 sm:[&_[cmdk-group-items]]:grid-cols-2 [&_[cmdk-group-items]]:gap-2"
              >
                {g.types.map((type) => {
                  const def = getBlockDef(type);
                  return (
                    <CommandItem
                      key={type}
                      value={`${getBlockName(type)} ${def?.description ?? ''} ${g.title}`}
                      onSelect={() => onAdd(type)}
                      className="items-stretch gap-3 rounded-xl border border-border/70 p-2 data-[selected=true]:border-primary/40"
                    >
                      <span className="flex h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                        {THUMBS[type] ?? box('m-2 flex-1')}
                      </span>
                      <span className="flex min-w-0 flex-col justify-center">
                        <span className="text-sm font-medium text-foreground">{getBlockName(type)}</span>
                        <span className="text-xs leading-snug text-muted-foreground line-clamp-2">{def?.description}</span>
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
