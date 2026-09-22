import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { EditableImage } from '../../../../blocks/EditableImage';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { fd, fb, alignClass, sectionBg, textColorClass, CtaHandler } from '../helpers';

export function CoverEditorialDiptych({
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

  const aspectClass = props?.orientation === 'landscape' ? 'aspect-[16/10]' : 'aspect-[3/4]';
  const btnText = data?.btnText || 'EXPLORAR HISTÓRIA';
  
  // Use either title_regular or title depending on what's available
  const titleVal = data?.title_regular ?? data?.title;

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
  const photographerStyle = {
    ...fb(),
    ...((typography?.photographer_nameSize || typography?.photographerSize)
      ? { fontSize: `${typography.photographer_nameSize || typography.photographerSize}px` }
      : {}),
  };

  return (
    <section className={cn(
      "overflow-hidden p-6 @md:p-12 @lg:p-16",
      sectionBg(props?.background, 'cream'),
      textColorClass(props?.text_color, props?.background, 'cream')
    )}>
      <div className="grid grid-cols-1 @lg:grid-cols-12 gap-8 @lg:gap-12">
        
        {/* Coluna de texto */}
        <div className={cn(
          "@lg:col-span-4 flex flex-col justify-center min-w-0",
          alignClass(props?.align, 'left')
        )}>
          
          <div className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-60 mb-4" style={eyebrowStyle || fb()}>
            <EditableText {...et('eyebrow', data?.eyebrow)} placeholder="EDITORIAL" style={eyebrowStyle} />
          </div>

          <h1 className="text-3xl @md:text-4xl leading-[1.1] tracking-tight max-w-[15ch] mb-6" style={titleStyle}>
            <EditableText {...et('title', titleVal)} placeholder="O encanto" />{' '}
            <em className="italic opacity-60" style={italicStyle}>
              <EditableText {...et('title_italic', data?.title_italic)} placeholder="dos detalhes" />
            </em>
          </h1>

          <div className="text-base max-w-[40ch] mb-8 leading-relaxed font-light" style={subtitleStyle}>
            <EditableText multiline {...et('subtitle', data?.subtitle)} placeholder="Uma narrativa visual em duas perspectivas." />
          </div>

          <div>
            {editable ? (
              <div
                className="bg-[var(--pa-accent,#C86A46)] text-white rounded-none px-8 py-6 h-auto text-sm font-medium tracking-wide inline-flex items-center justify-center"
                style={btnStyle}
              >
                <EditableText {...et('btnText', btnText)} placeholder="Botão" />
              </div>
            ) : (
              <Button
                variant="default"
                className="bg-[var(--pa-accent,#C86A46)] hover:bg-[var(--pa-accent,#C86A46)]/90 text-white rounded-none px-8 py-6 h-auto text-sm font-medium tracking-wide"
                style={btnStyle}
                onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
              >
                {btnText}
              </Button>
            )}
          </div>

          <div className="text-[9px] tracking-[0.3em] uppercase opacity-50 mt-auto pt-8" style={photographerStyle}>
            <EditableText {...et('photographer_name', data?.photographer_name)} placeholder="FOTOGRAFIA POR NOME" />
          </div>
        </div>

        {/* Coluna de fotos */}
        <div className="@lg:col-span-8 grid grid-cols-2 gap-4">
          <div className={cn("rounded-lg overflow-hidden relative", aspectClass)}>
          <EditableImage
              editable={editable}
              value={data?.image_url || null}
              onCommit={(url) => inline?.set('image_url', url)}
              className="absolute inset-0 w-full h-full"
              imgClassName="object-cover w-full h-full"
              label="Foto A"
              alt="Foto principal"
              publicEmptyClassName="w-full h-full bg-gradient-to-br from-[var(--pa-linen,#E8DCCB)] to-[var(--pa-stone,#C9B7A2)]"
            />
          </div>
          <div className={cn("rounded-lg overflow-hidden relative", aspectClass)}>
            <EditableImage
              editable={editable}
              value={data?.photo_b || null}
              onCommit={(url) => inline?.set('photo_b', url)}
              className="absolute inset-0 w-full h-full"
              imgClassName="object-cover w-full h-full"
              label="Foto B"
              alt="Foto secundária"
              publicEmptyClassName="w-full h-full bg-gradient-to-br from-[var(--pa-linen,#E8DCCB)] to-[var(--pa-stone,#C9B7A2)]"
            />
          </div>
        </div>

      </div>
    </section>
  );
}
