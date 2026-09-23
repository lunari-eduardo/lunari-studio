import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { EditableImage } from '../../../../blocks/EditableImage';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { fd, fb, alignClass, sectionBg, textColorClass, CtaHandler } from '../helpers';

export function CoverSeamSide({
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

  const isPortrait = props?.orientation === 'portrait';
  const aspectClass = isPortrait ? 'aspect-[3/4]' : 'aspect-[16/10]';
  const align = alignClass(props?.align);
  const bgClass = sectionBg(props?.background, 'white');
  const txtClass = textColorClass(props?.text_color, props?.background, 'white');

  const typography = props?.typography;
  const eyebrowStyle = typography?.eyebrowSize ? { fontSize: `${typography.eyebrowSize}px` } : undefined;
  const titleStyle = {
    ...fd(),
    ...(typography?.titleSize ? { fontSize: `${typography.titleSize}px` } : {}),
  };
  const italicStyle = {
    ...fd(),
    ...(typography?.titleItalicSize ? { fontSize: `${typography.titleItalicSize}px` } : {}),
  };
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
    <section className={cn('relative w-full overflow-hidden @container', bgClass)}>
      <div className="grid grid-cols-1 @lg:grid-cols-2">
        {/* Media Column */}
        <div className={cn("relative w-full h-full min-h-[360px] @lg:min-h-[420px] @lg:border-r border-black/5", aspectClass)}>
          <EditableImage
            editable={editable}
            value={data?.image_url || null}
            label="Capa"
            alt="Capa"
            onCommit={(v) => inline?.set('image_url', v)}
            className="absolute inset-0 w-full h-full"
            imgClassName="object-cover w-full h-full"
            publicEmptyClassName="w-full h-full bg-gradient-to-br from-[var(--pa-linen,#E8DCCB)] to-[var(--pa-stone,#C9B7A2)]"
          />
        </div>

        {/* Text Column */}
        <div className={cn("flex flex-col justify-center min-w-0 p-6 @md:p-12 @lg:p-16", align, txtClass)}>
          {(data?.eyebrow || editable) && (
            <div className={cn('text-sm uppercase tracking-[0.2em] mb-4 opacity-70')} style={eyebrowStyle || fb()}>
              <EditableText {...et('eyebrow', data?.eyebrow)} placeholder="PROPOSTA EXCLUSIVA" multiline={false} style={eyebrowStyle} />
            </div>
          )}

          <h2 className="mb-6 flex flex-col gap-1">
            {(data?.title || data?.title_regular || editable) && (
              <span className={cn('text-5xl @md:text-6xl @lg:text-7xl font-light tracking-tight')} style={titleStyle}>
                <EditableText {...et('title', data?.title || data?.title_regular)} placeholder="Título da sessão" multiline={false} />
              </span>
            )}
            {(data?.title_italic || editable) && (
              <span className="text-5xl @md:text-6xl @lg:text-7xl font-serif italic" style={italicStyle}>
                <EditableText {...et('title_italic', data?.title_italic)} placeholder="em itálico" multiline={false} />
              </span>
            )}
          </h2>

          {(data?.subtitle || editable) && (
            <div className="text-lg @md:text-xl font-light mb-10 max-w-xl leading-relaxed opacity-80" style={subtitleStyle}>
              <EditableText {...et('subtitle', data?.subtitle)} placeholder="Breve introdução sobre esta narrativa visual..." multiline />
            </div>
          )}

          {(data?.btnText || editable) && (
            <div className="mt-4">
              {editable ? (
                <div
                  className="inline-flex items-center justify-center bg-[var(--pa-accent,#C86A46)] text-white rounded-none px-8 py-6 h-auto text-sm font-medium tracking-wide cursor-text"
                  style={btnStyle}
                >
                  <EditableText {...et('btnText', data?.btnText)} placeholder="Texto do botão" multiline={false} />
                </div>
              ) : (
                <Button
                  onClick={() => onCtaClick?.({ blockType: 'cover', label: data.btnText })}
                  className="bg-[var(--pa-accent,#C86A46)] hover:bg-[var(--pa-accent,#C86A46)]/90 text-white rounded-none px-8 py-6 h-auto text-sm font-medium tracking-wide"
                  style={btnStyle}
                >
                  {data.btnText}
                </Button>
              )}
            </div>
          )}

          {(data?.photographer_name || editable) && (
            <div className="mt-auto pt-12 @lg:pt-16 text-xs uppercase tracking-widest opacity-50" style={photographerStyle}>
              <EditableText {...et('photographer_name', data?.photographer_name)} placeholder="FOTOGRAFIA POR NOME" multiline={false} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
