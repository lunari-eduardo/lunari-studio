import React, { useState } from 'react';
import { BlockData } from '@/hooks/useMaterialEditor';
import { cn } from '@/lib/utils';
import { GripVertical, Plus, Sparkles, Palette, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
import { ADDABLE_BLOCK_TYPES, getBlockDef, getBlockName, DEFAULT_BLOCK_ICON } from '../../blocks/registry';
import { DESIGN_PRESETS, useProposalOutline } from '@/hooks/useProposalAI';

export interface EditorSidebarProps {
  blocks: BlockData[];
  activeIndex: number;
  onSelectBlock: (index: number) => void;
  onAddBlock: (type: string) => void;
  onMoveBlock: (index: number, direction: 'up' | 'down') => void;
  onReorderBlocks: (oldIndex: number, newIndex: number) => void;
  /** Aplica design tokens (paletas do assistente de design) */
  onApplyDesignTokens?: (tokens: { colors?: Record<string, string>; typography?: { display?: string; body?: string } }) => void;
  materialTitle?: string;
}

// Item sortable extraído para o dnd-kit (Índice visual numerado)
function SortableSidebarItem({ block, index, isActive, onSelect }: { block: BlockData, index: number, isActive: boolean, onSelect: () => void }) {
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
  const sectionTitle = block.content?.title || block.content?.cta_text || block.content?.eyebrow || block.data?.title || getBlockName(block.type);

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
        <span className={cn(
          "text-xs font-semibold leading-tight truncate", 
          isActive ? "text-primary" : "text-foreground"
        )}>
          {sectionTitle}
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
  onReorderBlocks,
  onApplyDesignTokens,
  materialTitle
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
    <div className="flex h-full flex-col">
      <div className="p-4 pt-6 pb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Estrutura da Proposta
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2 pt-2 custom-scrollbar">
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
                onSelect={() => onSelectBlock(index)}
              />
            ))}
          </SortableContext>
        </DndContext>
        
        <div className="pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full gap-2 border-dashed bg-transparent hover:bg-muted/50 rounded-xl">
                <Plus className="h-4 w-4" />
                Adicionar Seção
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56 rounded-xl">
              {ADDABLE_BLOCK_TYPES.map((type) => {
                const def = getBlockDef(type);
                const Icon = def?.icon ?? DEFAULT_BLOCK_ICON;
                return (
                  <DropdownMenuItem key={type} onClick={() => onAddBlock(type)} className="gap-3 py-2 cursor-pointer">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted/50">
                      <Icon className="h-3.5 w-3.5 text-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{getBlockName(type)}</span>
                      <span className="text-[10px] text-muted-foreground">{def?.description}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ASSISTENTE DE DESIGN (paletas + estrutura com IA) */}
        {onApplyDesignTokens && (
          <div className="mt-4 pt-3 border-t border-border space-y-3">
            <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Palette className="h-3 w-3" />
              Assistente de Design
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {DESIGN_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  title={preset.description}
                  onClick={() => onApplyDesignTokens(preset.tokens)}
                  className="group rounded-lg border border-border p-2 text-left hover:border-primary/50 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex gap-1 mb-1.5">
                    {(['cream', 'accent', 'ink'] as const).map((c) => (
                      <span
                        key={c}
                        className="h-3.5 w-3.5 rounded-full border border-black/5"
                        style={{ backgroundColor: preset.tokens.colors?.[c] }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-medium leading-tight block">{preset.name}</span>
                </button>
              ))}
            </div>

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
        )}
      </div>
    </div>
  );
}
