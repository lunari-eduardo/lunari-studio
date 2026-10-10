import React, { useState } from 'react';
import { BlockData } from '@/hooks/useMaterialEditor';
import { cn } from '@/lib/utils';
import { GripVertical, Plus, Sparkles, Palette, Loader2, Check, LayoutTemplate, ArrowLeftRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getBlockDef, getBlockName, getSectionTitle, DEFAULT_BLOCK_ICON } from '../../blocks/registry';
import { useProposalOutline } from '@/hooks/useProposalAI';
import type { ProposalDesignTokens } from '../../blocks/design';
import { DocumentStylePanel } from './DocumentStylePanel';

export interface EditorSidebarProps {
  blocks: BlockData[];
  activeIndex: number;
  onSelectBlock: (index: number) => void;
  /** Adiciona direto (sugestões da IA). */
  onAddBlock: (type: string) => void;
  /** Abre a biblioteca de seções (inserção no final). */
  onOpenSectionLibrary: () => void;
  onMoveBlock: (index: number, direction: 'up' | 'down') => void;
  onReorderBlocks: (oldIndex: number, newIndex: number) => void;
  /** Tema atual da proposta (aba Estilo) */
  designTokens?: ProposalDesignTokens;
  /** Aplica design tokens (tema pronto, paleta, fontes, cantos) */
  onApplyDesignTokens: (tokens: ProposalDesignTokens) => void;
  materialTitle?: string;
  /** Nome do modelo de origem (ausente = proposta personalizada/antiga). */
  templateName?: string;
  onSwitchTemplate?: () => void;
  /** Seções recém-trazidas por uma troca de modelo (texto de exemplo: revisar). */
  newSectionIds?: Set<string>;
}

// Item sortable extraído para o dnd-kit (Índice visual numerado)
function SortableSidebarItem({ block, index, isActive, isNew, onSelect }: { block: BlockData, index: number, isActive: boolean, isNew?: boolean, onSelect: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id || `${block.type}-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = getBlockDef(block.type)?.icon ?? DEFAULT_BLOCK_ICON;
  const displayNumber = String(index + 1).padStart(2, '0');
  const sectionTitle = getSectionTitle(block);

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all text-left",
        isActive 
          ? "border-primary/40 bg-primary/10 shadow-xs ring-1 ring-primary/30" 
          : "border-transparent bg-background/50 hover:bg-muted/60 hover:border-border/60"
      )}
      onClick={onSelect}
    >
      {/* Numeração de índice (01, 02, etc.) */}
      <span className={cn(
        "text-xs font-mono font-semibold tracking-wider shrink-0 w-5",
        isActive ? "text-primary" : "text-muted-foreground/60"
      )}>
        {displayNumber}
      </span>

      {/* Ícone sutil do tipo de bloco */}
      <div className="shrink-0">
        <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground/70")} />
      </div>
      
      {/* Título e descrição */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 pr-4">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className={cn(
            "text-xs font-semibold leading-tight truncate",
            isActive ? "text-primary" : "text-foreground"
          )}>
            {sectionTitle}
          </span>
          {isNew && (
            <span
              className="shrink-0 rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary"
              title="Seção nova do modelo, com texto de exemplo: revise"
            >
              Nova
            </span>
          )}
        </span>
        <span className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
          {getBlockDef(block.type)?.description ?? getBlockName(block.type)}
        </span>
      </div>
      
      {/* Botão de Grip para Drag and Drop */}
      <div 
        className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 hover:bg-muted/80 rounded"
        title="Arrastar para reordenar"
        {...attributes} 
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

export function EditorSidebar({
  blocks,
  activeIndex,
  onSelectBlock,
  onAddBlock,
  onOpenSectionLibrary,
  onReorderBlocks,
  designTokens,
  onApplyDesignTokens,
  materialTitle,
  templateName,
  onSwitchTemplate,
  newSectionIds,
}: EditorSidebarProps) {

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Só ativa o drag se mover 5px (previne conflito com o click)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { suggest, isLoading: outlineLoading } = useProposalOutline();
  const [outline, setOutline] = useState<{ type: string; reason: string }[] | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => (b.id || `${b.type}-${blocks.indexOf(b)}`) === active.id);
      const newIndex = blocks.findIndex(b => (b.id || `${b.type}-${blocks.indexOf(b)}`) === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderBlocks(oldIndex, newIndex);
        
        // Se arrastar o bloco ativo, manter ele ativo no novo índice
        if (oldIndex === activeIndex) {
          onSelectBlock(newIndex);
        } else if (oldIndex < activeIndex && newIndex >= activeIndex) {
          onSelectBlock(activeIndex - 1); // Empurrou o ativo pra cima
        } else if (oldIndex > activeIndex && newIndex <= activeIndex) {
          onSelectBlock(activeIndex + 1); // Empurrou o ativo pra baixo
        }
      }
    }
  };

  const itemIds = blocks.map((b, i) => b.id || `${b.type}-${i}`);

  return (
    <Tabs defaultValue="sections" className="flex h-full flex-col">
      {/* Documento: Seções (estrutura) | Estilo (vale para a proposta inteira) */}
      <div className="shrink-0 px-4 pt-4 pb-1">
        <TabsList className="grid h-9 w-full grid-cols-2 rounded-xl border border-border/40 bg-muted/50 p-1">
          <TabsTrigger value="sections" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Layers className="h-3.5 w-3.5" /> Seções
          </TabsTrigger>
          <TabsTrigger value="style" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Palette className="h-3.5 w-3.5" /> Estilo
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="sections" className="mt-0 flex flex-1 min-h-0 flex-col data-[state=inactive]:hidden">
      <div className="px-4 pt-2 pb-2">
        {onSwitchTemplate && (
          <button
            type="button"
            onClick={onSwitchTemplate}
            className="group flex w-full items-center gap-2.5 rounded-xl border border-border/70 bg-background px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
            title="Trocar o modelo mantendo seus textos e fotos"
          >
            <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight">Modelo</span>
              <span className="truncate text-xs font-medium text-foreground leading-tight mt-0.5">
                {templateName ?? 'Personalizado'}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground group-hover:text-primary">
              <ArrowLeftRight className="h-3 w-3" /> Trocar
            </span>
          </button>
        )}
      </div>
      
      <div
        className="flex-1 overflow-y-auto px-3 space-y-2 pt-2 custom-scrollbar"
        style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}
      >
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map((block, index) => (
              <SortableSidebarItem 
                key={itemIds[index]}
                block={block}
                index={index}
                isActive={index === activeIndex}
                isNew={!!block.id && newSectionIds?.has(block.id)}
                onSelect={() => onSelectBlock(index)}
              />
            ))}
          </SortableContext>
        </DndContext>
        
        <div className="pt-2">
          {/* Biblioteca de seções (diálogo com busca): nunca sai da tela */}
          <Button
            variant="outline"
            className="w-full gap-2 border-dashed bg-transparent hover:bg-muted/50 rounded-xl"
            onClick={onOpenSectionLibrary}
          >
            <Plus className="h-4 w-4" />
            Adicionar Seção
          </Button>
        </div>

        {/* ESTRUTURA COM IA */}
        <div className="mt-4 pt-3 border-t border-border space-y-3">
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-primary text-xs h-8"
                disabled={outlineLoading}
                onClick={async () => {
                  const result = await suggest({
                    session_type: 'proposta comercial',
                    highlights: materialTitle ? `Proposta: ${materialTitle}` : undefined,
                  });
                  setOutline(result);
                }}
              >
                {outlineLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Sugerir estrutura com IA
              </Button>

              {outline && outline.length > 0 && (
                <div className="space-y-1">
                  {outline.map((o, i) => {
                    const exists = blocks.some((b) => b.type === o.type);
                    return (
                      <div key={`${o.type}-${i}`} className="flex items-start gap-2 rounded-md bg-muted/30 p-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-medium flex items-center gap-1">
                            {getBlockName(o.type)}
                            {exists && <Check className="h-3 w-3 text-emerald-600" />}
                          </span>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">{o.reason}</p>
                        </div>
                        {!exists && (
                          <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] shrink-0" onClick={() => onAddBlock(o.type)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-[10px] h-7 text-muted-foreground"
                    onClick={() => setOutline(null)}
                  >
                    Fechar sugestões
                  </Button>
                </div>
              )}
            </div>
        </div>
      </div>
      </TabsContent>

      {/* ESTILO GLOBAL (tema, paleta, tipografia, cantos) */}
      <TabsContent
        value="style"
        className="mt-0 flex-1 min-h-0 overflow-y-auto custom-scrollbar"
        style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}
      >
        <DocumentStylePanel tokens={designTokens} onChange={onApplyDesignTokens} />
      </TabsContent>
    </Tabs>
  );
}
