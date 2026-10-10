import React, { useState, useCallback } from 'react';
import { BlockData } from '@/hooks/useMaterialEditor';
import { cn } from '@/lib/utils';
import { ProposalDesignTokens, tokensToCssVars, ensureFontLoaded, isHexColor, onColor, DEFAULT_DESIGN_TOKENS } from '../../blocks/design';
import { InlineEditContext } from '../../blocks/inlineContext';
import { EditorialComposition } from '../../blocks/EditorialComposition';
import { BlockObserver } from './blocks/helpers';
import { CoverRenderer } from './blocks/CoverBlocks';
import { EditorialRenderer } from './blocks/EditorialBlocks';
import { PricingTableRenderer, PackageRenderer } from './blocks/PricingBlocks';
import { computePackageNumberOffsets } from '../../blocks/pricing';
import { GalleryRenderer, DividerRenderer, DefaultRenderer } from './blocks/GalleryAndMiscBlocks';
import { TestimonialRenderer, CtaRenderer, FooterTermsRenderer } from './blocks/ClosingBlocks';
import { InfoRenderer } from './blocks/InfoBlocks';
import { TextSizeFloatingPopover } from './TextSizeFloatingPopover';
import { SectionToolbar, InsertSectionButton } from './CanvasToolbars';

// Altura da "tela" onde a capa ancora: viewport real (público/editor) ou a moldura do celular (812px - bordas).
const HERO_HEIGHT = { desktop: '100svh', mobile: '788px' } as const;

export interface VisualRendererProps {
  blocks: BlockData[];
  activeIndex: number;
  /** `scroll: false` seleciona sem rolar o canvas (clique num texto já visível). */
  onSelectBlock: (index: number, opts?: { scroll?: boolean }) => void;
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
  /** Ações do canvas (barra da seção selecionada e "+" entre seções). Ausente = sem esse chrome. */
  sectionActions?: {
    move: (index: number, direction: 'up' | 'down') => void;
    duplicate: (index: number) => void;
    remove: (index: number) => void;
    insertAfter: (index: number) => void;
  };
  /** Zoom aplicado ao canvas pelo editor: o chrome compensa para manter o tamanho real. */
  uiScale?: number;
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
  sectionActions,
  uiScale = 1,
}: VisualRendererProps) {
  const isEditing = mode === 'edit';
  // Bloco sintético de configurações nunca é renderizado como seção
  const visibleBlocks = blocks.filter((b) => b.type !== 'global_settings');
  // Numeração contínua dos pacotes "Revista" entre grupos (ordem real do documento)
  const packageNumberOffsets = computePackageNumberOffsets(visibleBlocks);
  // Fundo em cor livre: sectionBg/textColorClass leem estas variáveis do wrapper da seção
  const palette = { ...DEFAULT_DESIGN_TOKENS.colors, ...(designTokens?.colors ?? {}) };
  const sectionVars = (bg: unknown): React.CSSProperties | undefined =>
    isHexColor(bg)
      ? { ['--pa-sec-bg' as any]: bg, ['--pa-on-sec' as any]: onColor(bg, palette.ink, palette.white) }
      : undefined;

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
        // O clique no texto não chega ao wrapper da seção: sem isto o painel lateral ficaria noutra seção
        if (blockIndex !== activeIndex) onSelectBlock(blockIndex, { scroll: false });
      } else {
        setTextSizeState({ fieldKey: null, anchorEl: null, blockIndex: -1 });
      }
    },
    [activeIndex, onSelectBlock]
  );

  const handleTextSizeChange = useCallback(
    (fieldKey: string, size: number | undefined) => {
      if (textSizeState.blockIndex < 0) return;
      const propKey = getTypographyPropKey(fieldKey);
      onUpdateField?.(textSizeState.blockIndex, `props.typography.${propKey}`, size);
    },
    [textSizeState.blockIndex, onUpdateField]
  );

  React.useEffect(() => {
    ensureFontLoaded(designTokens?.typography?.display);
    ensureFontLoaded(designTokens?.typography?.body);
    ensureFontLoaded(designTokens?.typography?.accent);
  }, [designTokens?.typography?.display, designTokens?.typography?.body, designTokens?.typography?.accent]);

  return (
    <div
      className={cn(
        "w-full flex items-start justify-center transition-all duration-300",
        mode === 'edit' ? "pt-2 md:pt-4 px-2 md:px-4" : "p-0 md:pt-8 md:px-4"
      )}
      // Respiro de rolagem fora da arte: a última seção não ganha faixa vazia embaixo
      style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}
    >
      <div
        className={cn(
          'pa-doc @container relative transition-all duration-500 origin-top flex flex-col w-full bg-[var(--pa-white,#FFFFFF)] text-[var(--pa-on-white,#1A1714)]',
          viewMode === 'desktop'
            ? // max-w-5xl: a content-box (64rem - borda) precisa passar de 56rem para os layouts @4xl dispararem
              // overflow-clip (não hidden): recorta os cantos sem virar contêiner de rolagem, então a barra da seção gruda ao rolar
              'max-w-full md:max-w-5xl h-auto rounded-none md:rounded-2xl overflow-clip shadow-none md:shadow-[0_16px_70px_rgba(0,0,0,0.12)] border-0 md:border md:border-black/5'
            : 'max-w-[375px] h-auto min-h-[812px] max-h-[85vh] overflow-y-auto rounded-[3rem] border-[12px] border-zinc-900 custom-scrollbar shadow-2xl'
        )}
        data-title-case={designTokens?.typography?.title_case}
        style={{
          ...tokensToCssVars(designTokens),
          ['--pa-hero-h' as any]: HERO_HEIGHT[viewMode],
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
                  <CoverRenderer data={block.content || block.data} props={block.props} onCtaClick={onCtaClick} />
                )}
                {block.type === 'package' && <PackageRenderer data={block.data} />}
                {block.type === 'EditorialBlock' && (
                  <EditorialRenderer content={block.content} data={block.data} props={block.props} />
                )}
                {block.type === 'PricingTable' && (
                  <PricingTableRenderer
                    content={block.content}
                    data={block.data}
                    props={block.props}
                    numberOffset={packageNumberOffsets.get(block)}
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
                {block.type === 'TestimonialBlock' && <TestimonialRenderer content={block.content} props={block.props} />}
                {block.type === 'CTABlock' && (
                  <CtaRenderer content={block.content} props={block.props} onCtaClick={onCtaClick} />
                )}
                {block.type === 'FooterTerms' && <FooterTermsRenderer content={block.content} props={block.props} />}
                {block.type === 'InfoBlock' && <InfoRenderer content={block.content} props={block.props} />}
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
                className="relative w-full h-auto"
                style={sectionVars(block.props?.background)}
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
              style={sectionVars(block.props?.background)}
              onClick={() => onSelectBlock(index)}
              className={cn(
                'relative group cursor-pointer transition-all duration-200 outline outline-2 outline-transparent outline-offset-[-2px] w-full h-auto',
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

              {/* Barra da seção selecionada: composição, fundo, mover, duplicar, remover */}
              {isActive && sectionActions && (
                <SectionToolbar
                  block={block}
                  index={blockIdx}
                  count={blocks.length}
                  palette={palette}
                  uiScale={uiScale}
                  onSetPath={(path, value) => onUpdateField?.(blockIdx, path, value)}
                  onMove={(dir) => sectionActions.move(blockIdx, dir)}
                  onDuplicate={() => sectionActions.duplicate(blockIdx)}
                  onRemove={() => sectionActions.remove(blockIdx)}
                />
              )}

              {content}

              {sectionActions && (
                <InsertSectionButton
                  onClick={() => sectionActions.insertAfter(blockIdx)}
                  uiScale={uiScale}
                  last={index === visibleBlocks.length - 1}
                />
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
