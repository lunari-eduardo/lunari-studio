import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { EditableImage } from '../../../../blocks/EditableImage';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { fd, fb, alignClass, sectionBg, textColorClass, CtaHandler } from '../helpers';

/**
 * Capa Minimal Editorial — tipografia centralizada refinada no topo,
 * com moldura fotográfica limpa abaixo. O slot de imagem possui
 * dimensões explícitas governadas por aspect-ratio, independentes
 * do volume de texto.
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

  const isLandscape = props?.orientation === 'landscape';
  const align = alignClass(props?.align, 'left');
  const colAlign =
    props?.align === 'center'
      ? 'items-center'
      : props?.align === 'right'
      ? 'items-end'
      : 'items-start';

  const typography = props?.typography;
  const eyebrowStyle = typography?.eyebrowSize ? { fontSize: `${typography.eyebrowSize}px` } : undefined;
  const titleStyle = {
    ...fd(),
    ...(typography?.titleSize ? { fontSize: `${typography.titleSize}px` } : {}),
  };
  const italicStyle = typography?.titleItalicSize ? { fontSize: `${typography.titleItalicSize}px` } : undefined;
  const subtitleStyle = {
    ...fb(),
    ...(typography?.subtitleSize ? { fontSize: `${typography.subtitleSize}px` } : {}),
  };
  const btnStyle = (typography?.btnTextSize || typography?.ctaSize)
    ? { fontSize: `${typography.btnTextSize || typography.ctaSize}px` }
    : undefined;

  return (
    <section
      className={cn(
        'relative overflow-hidden',
        isLandscape
          ? 'p-6 @md:p-12 @2xl:p-16 grid grid-cols-1 @2xl:grid-cols-12 gap-8 @2xl:gap-12 min-h-[500px]'
          : 'p-6 @md:p-12 flex flex-col items-center text-center gap-8 min-h-[640px]',
        sectionBg(props?.background, 'white'),
        textColorClass(props?.text_color, props?.background, 'white')
      )}
    >
      {/* Texto */}
      <div
        className={cn(
          'flex flex-col justify-center min-w-0 z-10',
          isLandscape ? '@2xl:col-span-7' : 'max-w-xl mx-auto items-center text-center',
          isLandscape && colAlign,
          isLandscape && align
        )}
      >
        <EditableText
          as="p"
          {...et('eyebrow', eyebrow)}
          multiline
          className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-60 mb-4"
          style={eyebrowStyle}
        />
        <h1
          className={cn(
            'text-4xl @md:text-5xl @2xl:text-6xl text-current leading-[1.1] tracking-tight mb-6',
            isLandscape ? 'max-w-[15ch]' : 'max-w-[18ch]'
          )}
          style={titleStyle}
        >
          {hasTitle || editable ? (
            <>
              <EditableText {...et('title', title)} placeholder="Título da capa" />
              <em className="italic opacity-60 block mt-1" style={italicStyle}>
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
          style={subtitleStyle}
        />
        {btnText &&
          (editable ? (
            <div
              className="bg-[var(--pa-accent,#C86A46)] text-white rounded-none px-8 py-5 text-sm font-medium tracking-wide cursor-text inline-flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
              style={btnStyle}
            >
              <EditableText {...et('btnText', btnText)} placeholder="Texto do botão" />
            </div>
          ) : (
            <Button
              className="bg-[var(--pa-accent,#C86A46)] hover:bg-[var(--pa-accent,#C86A46)]/90 text-white rounded-none px-8 py-5 h-auto text-sm font-medium tracking-wide"
              style={btnStyle}
              onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
            >
              {btnText}
            </Button>
          ))}
      </div>

      {/* Imagem */}
      <div
        className={cn(
          'relative rounded-[2rem] overflow-hidden shadow-2xl',
          isLandscape
            ? '@2xl:col-span-5 aspect-[16/10] w-full self-center'
            : 'w-full max-w-md aspect-[3/4] mx-auto'
        )}
      >
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
