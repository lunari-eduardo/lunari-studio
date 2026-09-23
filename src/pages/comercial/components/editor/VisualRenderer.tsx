import React, { useState, useCallback } from 'react';
import { BlockData } from '@/hooks/useMaterialEditor';
import { cn } from '@/lib/utils';
import { ProposalDesignTokens, tokensToCssVars, ensureFontLoaded } from '../../blocks/design';
import { CoverOrientation, getProposalOrientation } from '../../blocks/types';
import { InlineEditContext } from '../../blocks/inlineContext';
import { EditorialComposition } from '../../blocks/EditorialComposition';
import { BlockObserver } from './blocks/helpers';
import { CoverRenderer } from './blocks/CoverBlocks';
import { EditorialRenderer } from './blocks/EditorialBlocks';
import { PricingTableRenderer, PackageRenderer } from './blocks/PricingBlocks';
import { GalleryRenderer, DividerRenderer, DefaultRenderer } from './blocks/GalleryAndMiscBlocks';
import { TextSizeFloatingPopover } from './TextSizeFloatingPopover';

export interface VisualRendererProps {
  blocks: BlockData[];
  activeIndex: number;
  onSelectBlock: (index: number) => void;
  viewMode: 'desktop' | 'mobile';
  onSectionView?: (blockId: string, blockType: string, position: number) => void;
  /** 'edit' (padrão): chrome de edição. 'public': sem chrome, CTAs funcionais. */
  mode?: 'edit' | 'public';
  /** Acionado em modo público quando o cliente clica num CTA interno da proposta. */
  onCtaClick?: (ctx: { blockType: string; label?: string }) => void;
  /** Paleta/tipografia do template (proposal_templates.design_tokens). */
  designTokens?: ProposalDesignTokens;
  /** Edição de textos/imagens direto na arte (duplo clique) — desktop do editor. */
  inlineEditing?: boolean;
  /** Edição granular de campo por camada pontuada ("details.0.label", "props.photo_a.image_ref"). */
  onUpdateField?: (index: number, path: string, value: any) => void;
  /** Orientação da proposta: 'portrait' (editorial/mobile/A4) ou 'landscape' (ampla/widescreen). */
  orientation?: CoverOrientation;
}

export function VisualRenderer({
  blocks,
  activeIndex,
  onSelectBlock,
  viewMode,
  onSectionView,
  mode = 'edit',
  onCtaClick,
  designTokens,
  inlineEditing = false,
  onUpdateField,
  orientation,
}: VisualRendererProps) {
  const isEditing = mode === 'edit';
  // Bloco sintético de configurações nunca é renderizado como seção
  const visibleBlocks = blocks.filter((b) => b.type !== 'global_settings');

  // Resolução unificada da orientação da proposta (lida do bloco de capa ou informada explicitamente)
  const resolvedOrientation = getProposalOrientation(blocks, undefined, orientation);
  const isPortrait = resolvedOrientation === 'portrait';

// Mapeia chaves de campos para as propriedades canônicas do CoverTypography
function getTypographyPropKey(fieldKey: string): string {
  switch (fieldKey) {
    case 'photographer_name':
      return 'photographerSize';
    case 'btnText':
      return 'ctaSize';
    case 'title_italic':
      return 'titleItalicSize';
    default:
      return `${fieldKey}Size`;
  }
}

  // Estado do popover de tamanho de texto
  const [textSizeState, setTextSizeState] = useState<{
    fieldKey: string | null;
    anchorEl: HTMLElement | null;
    blockIndex: number;
  }>({ fieldKey: null, anchorEl: null, blockIndex: -1 });

  const handleSelectTextField = useCallback(
    (blockIndex: number) => (fieldKey: string | null, anchorEl: HTMLElement | null) => {
      if (fieldKey && anchorEl) {
        setTextSizeState({ fieldKey, anchorEl, blockIndex });
      } else {
        setTextSizeState({ fieldKey: null, anchorEl: null, blockIndex: -1 });
      }
    },
    []
  );

  const handleTextSizeChange = useCallback(
    (fieldKey: string, size: number) => {
      if (textSizeState.blockIndex < 0) return;
      const propKey = getTypographyPropKey(fieldKey);
      onUpdateField?.(textSizeState.blockIndex, `props.typography.${propKey}`, size);
    },
    [textSizeState.blockIndex, onUpdateField]
  );

  React.useEffect(() => {
    ensureFontLoaded(designTokens?.typography?.display);
    ensureFontLoaded(designTokens?.typography?.body);
  }, [designTokens?.typography?.display, designTokens?.typography?.body]);

  return (
    <div
      className={cn(
        "w-full flex items-start justify-center transition-all duration-300",
        mode === 'edit' ? "py-2 md:py-4 px-2 md:px-4" : "p-0 md:py-8 md:px-4"
      )}
    >
      <div
        className={cn(
          '@container bg-white relative transition-all duration-500 origin-top flex flex-col w-full',
          viewMode === 'desktop'
            ? isPortrait
              ? 'max-w-full md:max-w-[580px] rounded-none md:rounded-xl overflow-hidden shadow-none md:shadow-[0_16px_70px_rgba(0,0,0,0.12)] border-0 md:border md:border-black/5'
              : 'max-w-full md:max-w-5xl rounded-none md:rounded-sm overflow-hidden shadow-none md:shadow-2xl border-0'
            : 'max-w-[375px] h-[812px] max-h-[85vh] overflow-y-auto rounded-[3rem] border-[12px] border-zinc-900 custom-scrollbar shadow-2xl'
        )}
        style={{
          ...tokensToCssVars(designTokens),
          paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))',
        }}
      >
        {visibleBlocks.map((block, index) => {
          const realIndex = blocks.indexOf(block);
          const blockIdx = realIndex !== -1 ? realIndex : index;
          const isActive = blockIdx === activeIndex;
          const inlineHandle = {
            editable: isEditing && inlineEditing,
            set: (path: string, value: any) => onUpdateField?.(blockIdx, path, value),
            activeTextField: textSizeState.blockIndex === blockIdx ? textSizeState.fieldKey : null,
            onSelectTextField: handleSelectTextField(blockIdx),
          };

          const content = (
            <InlineEditContext.Provider value={inlineHandle}>
              <BlockObserver
                blockId={block.id}
                blockType={block.type}
                position={blockIdx}
                onView={onSectionView}
              >
                {(block.type === 'cover' || block.type === 'CoverBlock') && (
                  <CoverRenderer
                    data={block.content || block.data}
                    props={{
                      ...block.props,
                      orientation: block.props?.orientation ?? resolvedOrientation,
                    }}
                    onCtaClick={onCtaClick}
                  />
                )}
                {block.type === 'package' && <PackageRenderer data={block.data} onCtaClick={onCtaClick} />}
                {block.type === 'EditorialBlock' && (
                  <EditorialRenderer content={block.content} data={block.data} props={block.props} />
                )}
                {block.type === 'PricingTable' && (
                  <PricingTableRenderer
                    content={block.content}
                    data={block.data}
                    props={block.props}
                    onCtaClick={onCtaClick}
                  />
                )}
                {block.type === 'EditorialComposition' && (
                  <EditorialComposition content={block.content} props={block.props} />
                )}
                {block.type === 'Gallery' && (
                  <GalleryRenderer content={block.content} data={block.data} props={block.props} />
                )}
                {block.type === 'DividerBlock' && (
                  <DividerRenderer content={block.content} data={block.data} props={block.props} />
                )}
                {block.type === 'text' && <DefaultRenderer block={block} />}
              </BlockObserver>
            </InlineEditContext.Provider>
          );

          if (!isEditing) {
            // Modo público/preview: sem chrome de edição, conteúdo interativo (CTAs funcionam)
            return (
              <div 
                key={block.id || `block-${index}`}
                id={`section-block-${index}`}
                data-section-index={index}
              >
                {content}
              </div>
            );
          }

          return (
            <div
              key={block.id || `block-${index}`}
              id={`section-block-${index}`}
              data-section-index={index}
              onClick={() => onSelectBlock(index)}
              className={cn(
                'relative group cursor-pointer transition-all duration-200 outline outline-2 outline-transparent outline-offset-[-2px]',
                isActive ? 'outline-primary z-10 shadow-[0_0_0_4px_rgba(200,106,70,0.1)]' : 'hover:outline-primary/30'
              )}
            >
              {/* Tinta de hover */}
              <div
                className={cn(
                  'absolute inset-0 z-0 pointer-events-none transition-colors',
                  !isActive && 'group-hover:bg-primary/5'
                )}
              />

              {content}

              {/* Dica de edição no bloco ativo */}
              {isActive && inlineEditing && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none rounded-full bg-primary px-3 py-1 text-[10px] font-medium tracking-wide text-primary-foreground shadow-lg whitespace-nowrap">
                  Duplo clique: edita textos · troca imagens
                </div>
              )}
            </div>
          );
        })}

        {visibleBlocks.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground font-medium">A proposta está vazia. Adicione seções.</p>
          </div>
        )}
      </div>

      {/* Popover flutuante de tamanho de texto */}
      {isEditing && inlineEditing && textSizeState.fieldKey && textSizeState.anchorEl && (
        <TextSizeFloatingPopover
          fieldKey={textSizeState.fieldKey}
          currentSize={(() => {
            if (textSizeState.blockIndex < 0) return undefined;
            const typo = (blocks[textSizeState.blockIndex]?.props as any)?.typography;
            if (!typo) return undefined;
            const canonicalKey = getTypographyPropKey(textSizeState.fieldKey);
            return typo[canonicalKey] ?? typo[`${textSizeState.fieldKey}Size`];
          })()}
          anchorEl={textSizeState.anchorEl}
          onChange={handleTextSizeChange}
          onClose={() => setTextSizeState({ fieldKey: null, anchorEl: null, blockIndex: -1 })}
        />
      )}
    </div>
  );
}
