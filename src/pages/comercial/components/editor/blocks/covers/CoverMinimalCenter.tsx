import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { EditableImage } from '../../../../blocks/EditableImage';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { sectionBg, textColorClass, wideAlign, coverStyles, HERO_MIN_H, CtaHandler } from '../helpers';

/**
 * Capa Minimal Editorial — no estreito, tipografia centralizada sobre uma moldura
 * fotográfica 3:4; a partir de @2xl, texto (7/12) ao lado da foto 4:5 (5/12).
 * O slot de imagem é governado por aspect-ratio, independente do volume de texto.
 */
export function CoverMinimalCenter({
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
  const subtitle = data?.subtitle ?? data?.photographer_name;
  const btnText = data?.btnText;
  const hasTitle = !!title || !!titleItalic;
  const s = coverStyles(props?.typography);

  return (
    <section
      className={cn(
        'relative overflow-hidden flex flex-col items-center justify-center gap-8 p-6 @md:p-12 text-center',
        '@2xl:grid @2xl:grid-cols-12 @2xl:gap-12 @2xl:p-16',
        HERO_MIN_H,
        sectionBg(props?.background, 'white'),
        textColorClass(props?.text_color, props?.background, 'white')
      )}
    >
      {/* Texto */}
      <div
        className={cn(
          'flex flex-col items-center justify-center min-w-0 z-10 max-w-xl @2xl:max-w-none @2xl:col-span-7',
          wideAlign(props?.align)
        )}
      >
        <EditableText
          as="p"
          {...et('eyebrow', eyebrow)}
          multiline
          className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-60 mb-4"
          style={s.eyebrow}
        />
        <h1
          className="text-4xl @md:text-5xl @2xl:text-6xl text-current leading-[1.1] tracking-tight mb-6 max-w-[18ch] @2xl:max-w-[15ch]"
          style={s.title}
        >
          {hasTitle || editable ? (
            <>
              <EditableText {...et('title', title)} placeholder="Título da capa" />
              <em className="italic opacity-60 block mt-1" style={s.italic}>
                <EditableText {...et('title_italic', titleItalic)} placeholder="continuação em itálico" />
              </em>
            </>
          ) : (
            'Seu momento merece ser vivido e lembrado para sempre.'
          )}
        </h1>
        <EditableText
          as="p"
          {...et('subtitle', subtitle)}
          multiline
          className="text-[var(--pa-taupe,#6D655E)] text-base @md:text-lg max-w-[40ch] mb-8 leading-relaxed font-light"
          style={s.subtitle}
        />
        {btnText &&
          (editable ? (
            <div
              className="bg-[var(--pa-accent,#C86A46)] text-white rounded-[var(--pa-r-btn,0px)] px-8 py-5 text-sm font-medium tracking-wide cursor-text inline-flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
              style={s.btn}
            >
              <EditableText {...et('btnText', btnText)} placeholder="Texto do botão" />
            </div>
          ) : (
            <Button
              className="bg-[var(--pa-accent,#C86A46)] hover:bg-[var(--pa-accent,#C86A46)]/90 text-white rounded-[var(--pa-r-btn,0px)] px-8 py-5 h-auto text-sm font-medium tracking-wide"
              style={s.btn}
              onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
            >
              {btnText}
            </Button>
          ))}
      </div>

      {/* Imagem */}
      <div className="relative w-full max-w-md aspect-[3/4] mx-auto overflow-hidden rounded-[var(--pa-r-media,2rem)] shadow-[0_24px_60px_rgba(0,0,0,0.12)] @2xl:col-span-5 @2xl:max-w-none @2xl:aspect-[4/5]">
        <EditableImage
          editable={editable}
          value={data?.image_url || null}
          label="Capa"
          alt="Capa"
          onCommit={(url) => inline?.set('image_url', url)}
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-[var(--pa-linen,#E8DCCB)] to-[var(--pa-stone,#C9B7A2)]"
          publicEmptyClassName="w-full h-full"
        />
      </div>
    </section>
  );
}
