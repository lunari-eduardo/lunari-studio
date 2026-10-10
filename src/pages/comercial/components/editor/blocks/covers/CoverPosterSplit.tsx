import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { EditableImage } from '../../../../blocks/EditableImage';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { textColorClass, coverStyles, HERO_MIN_H, CtaHandler } from '../helpers';

/**
 * Capa Poster — foto full-bleed como fundo com véu creme no topo e título
 * tipográfico gigante em caixa alta. O título escala pela largura do
 * container (cqi), então palavras longas nunca estouram no celular.
 */
export function CoverPosterSplit({
  data,
  props,
  onCtaClick,
}: {
  data?: any;
  props?: any;
  onCtaClick?: CtaHandler;
}) {
  const inline = useInlineEdit();
  const editable = inline?.editable ?? false;
  const et = (path: string, value: string | undefined) => ({
    editable,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
    fieldKey: path,
  });

  const eyebrow = data?.eyebrow;
  const title = data?.title ?? data?.title_regular;
  const titleItalic = data?.title_italic;
  const subtitle = data?.subtitle;
  const photographerName = data?.photographer_name;
  const btnText = data?.btnText;
  const s = coverStyles(props?.typography);

  return (
    <section className={cn('relative flex flex-col overflow-hidden', HERO_MIN_H)}>
      {/* Foto full-bleed como fundo */}
      <EditableImage
        editable={editable}
        value={data?.image_url || null}
        label="Capa"
        alt="Capa"
        onCommit={(url) => inline?.set('image_url', url)}
        className="absolute inset-0 w-full h-full"
        imgClassName="object-cover w-full h-full"
        publicEmptyClassName="w-full h-full"
      />

      {/* Gradiente cream → transparente no topo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, var(--pa-cream, #F3F0EA) 0%, var(--pa-cream, #F3F0EA) 15%, transparent 55%)`,
        }}
      />

      {/* Conteúdo sobre o gradiente */}
      <div className="relative z-10 flex flex-col items-center text-center flex-1 px-6 pt-10 @md:px-12 @md:pt-16 @2xl:pt-20">
        {/* Ornamento vertical */}
        <div className="w-[1px] h-8 bg-[var(--pa-accent,#7A5C42)] mb-6" />

        {/* Eyebrow */}
        <EditableText
          as="p"
          {...et('eyebrow', eyebrow)}
          className="text-[9px] @md:text-[10px] font-medium tracking-[0.35em] uppercase text-[var(--pa-taupe,#8C7B6E)] mb-6 @md:mb-10"
          style={s.eyebrow}
        />

        {/* Título gigante, fluido pela largura do container */}
        <h1
          className={cn(
            'text-[length:clamp(2.25rem,9cqi,6rem)] uppercase tracking-[0.12em] leading-[1.05] mb-4 @md:mb-6 max-w-[14ch]',
            textColorClass(props?.text_color, props?.background, 'white')
          )}
          style={s.title}
        >
          <EditableText {...et('title', title)} placeholder="TÍTULO" />
          {titleItalic && (
            <em className="italic opacity-70 block text-[0.6em] tracking-[0.06em] mt-1" style={s.italic}>
              <EditableText {...et('title_italic', titleItalic)} />
            </em>
          )}
        </h1>

        {/* Subtítulo */}
        <EditableText
          as="p"
          {...et('subtitle', subtitle)}
          multiline
          className="text-[10px] @md:text-xs tracking-[0.25em] uppercase text-[var(--pa-taupe,#8C7B6E)] max-w-[40ch] leading-relaxed"
          style={s.subtitle}
        />

        {/* Botão CTA */}
        {btnText && (
          <div className="mt-8">
            {editable ? (
              <div
                className="bg-[var(--pa-accent,#C86A46)] text-white rounded-[var(--pa-r-btn,0px)] px-8 py-6 text-sm font-medium tracking-wide cursor-text inline-flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
                style={s.btn}
              >
                <EditableText {...et('btnText', btnText)} placeholder="Texto do botão" />
              </div>
            ) : (
              <Button
                className="bg-[var(--pa-accent,#C86A46)] hover:bg-[var(--pa-accent,#C86A46)]/90 text-white rounded-[var(--pa-r-btn,0px)] px-8 py-6 h-auto text-sm font-medium tracking-wide"
                style={s.btn}
                onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
              >
                {btnText}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Assinatura do fotógrafo no rodapé */}
      <div className="relative z-10 pb-8 @md:pb-12 text-center mt-auto">
        <EditableText
          as="p"
          {...et('photographer_name', photographerName)}
          className="text-[9px] @md:text-[10px] tracking-[0.3em] uppercase text-white/80"
          style={s.photographer}
        />
      </div>
    </section>
  );
}
