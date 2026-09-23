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

  const btnText = data?.btnText;
  
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

  const isLandscape = props?.orientation === 'landscape';
  const aspectClass = isLandscape ? 'aspect-[16/10]' : 'aspect-[3/4]';

  return (
    <section className={cn(
      "overflow-hidden",
      isLandscape
        ? "p-6 @md:p-12 @2xl:p-16 min-h-[500px]"
        : "p-6 @md:p-12 min-h-[640px] flex flex-col items-center",
      sectionBg(props?.background, 'cream'),
      textColorClass(props?.text_color, props?.background, 'cream')
    )}>
      <div className={cn(
        isLandscape
          ? "grid grid-cols-1 @2xl:grid-cols-12 gap-8 @2xl:gap-12"
          : "flex flex-col gap-8 w-full max-w-xl mx-auto items-center text-center"
      )}>
        
        {/* Coluna de texto */}
        <div className={cn(
          "flex flex-col justify-center min-w-0",
          isLandscape ? "@2xl:col-span-4" : "w-full items-center text-center",
          isLandscape && alignClass(props?.align, 'left')
        )}>
          
          {(data?.eyebrow || editable) && (
            <div className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-60 mb-4" style={eyebrowStyle || fb()}>
              <EditableText {...et('eyebrow', data?.eyebrow)} placeholder="EDITORIAL" style={eyebrowStyle} />
            </div>
          )}

          <h1 className="text-3xl @md:text-4xl leading-[1.1] tracking-tight max-w-[15ch] mb-6" style={titleStyle}>
            <EditableText {...et('title', titleVal)} placeholder="O encanto" />{' '}
            {(data?.title_italic || editable) && (
              <em className="italic opacity-60 block mt-1" style={italicStyle}>
                <EditableText {...et('title_italic', data?.title_italic)} placeholder="dos detalhes" />
              </em>
            )}
          </h1>

          {(data?.subtitle || editable) && (
            <div className="text-base max-w-[40ch] mb-8 leading-relaxed font-light" style={subtitleStyle}>
              <EditableText multiline {...et('subtitle', data?.subtitle)} placeholder="Uma narrativa visual em duas perspectivas." />
            </div>
          )}

          {(btnText || editable) && (
            <div>
              {editable ? (
                <div
                  className="bg-[var(--pa-accent,#C86A46)] text-white rounded-none px-8 py-5 h-auto text-sm font-medium tracking-wide inline-flex items-center justify-center cursor-text"
                  style={btnStyle}
                >
                  <EditableText {...et('btnText', btnText)} placeholder="Acessar proposta" />
                </div>
              ) : (
                <Button
                  variant="default"
                  className="bg-[var(--pa-accent,#C86A46)] hover:bg-[var(--pa-accent,#C86A46)]/90 text-white rounded-none px-8 py-5 h-auto text-sm font-medium tracking-wide"
                  style={btnStyle}
                  onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
                >
                  {btnText}
                </Button>
              )}
            </div>
          )}

          {(data?.photographer_name || editable) && (
            <div className="text-[9px] tracking-[0.3em] uppercase opacity-50 mt-6 pt-4 border-t border-black/5" style={photographerStyle}>
              <EditableText {...et('photographer_name', data?.photographer_name)} placeholder="FOTOGRAFIA POR NOME" />
            </div>
          )}
        </div>

        {/* Coluna de fotos */}
        <div className={cn(
          "grid grid-cols-2 gap-4 w-full",
          isLandscape ? "@2xl:col-span-8 self-center" : "max-w-xl mx-auto"
        )}>
          <div className={cn("rounded-lg overflow-hidden relative shadow-lg", aspectClass)}>
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
          <div className={cn("rounded-lg overflow-hidden relative shadow-lg", aspectClass)}>
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
