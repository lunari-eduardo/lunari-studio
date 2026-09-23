import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { EditableImage } from '../../../../blocks/EditableImage';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { fd, fb, textColorClass, CtaHandler } from '../helpers';

export function CoverHeroFull({
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

  const isPortrait = (props?.orientation ?? 'portrait') === 'portrait';

  return (
    <section className={cn(
      "relative flex flex-col items-center justify-center overflow-hidden w-full",
      isPortrait
        ? "min-h-[680px] @md:min-h-[820px] py-16"
        : "min-h-[520px] @md:min-h-[640px] py-12"
    )}>
      <EditableImage
        editable={editable}
        value={data?.image_url || null}
        label="Capa"
        alt="Capa"
        onCommit={(url) => inline?.set('image_url', url)}
        className="absolute inset-0 w-full h-full"
        imgClassName="object-cover w-full h-full"
        publicEmptyClassName="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-600"
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20 pointer-events-none" />
      
      <div className={cn(
        "relative z-10 flex flex-col items-center text-center px-6 @md:px-12",
        isPortrait ? "max-w-xl" : "max-w-3xl"
      )}>
        {(data?.eyebrow || editable) && (
          <div className="text-[10px] font-medium tracking-[0.28em] uppercase text-white/70 mb-4" style={eyebrowStyle}>
            <EditableText {...et('eyebrow', data?.eyebrow)} placeholder="COLEÇÃO EXCLUSIVA" style={eyebrowStyle} />
          </div>
        )}
        
        <h1 className="text-4xl @md:text-6xl @lg:text-7xl text-white leading-[1.1] tracking-tight max-w-[15ch] mb-6" style={titleStyle}>
          <EditableText {...et('title', data?.title_regular || data?.title)} placeholder="Título da sessão" />{' '}
          {(data?.title_italic || editable) && (
            <em className="italic text-white/70" style={italicStyle}>
              <EditableText {...et('title_italic', data?.title_italic)} placeholder="em itálico" />
            </em>
          )}
        </h1>
        
        {(data?.subtitle || editable) && (
          <div className="text-white/80 text-lg max-w-[40ch] mb-10 leading-relaxed font-light" style={subtitleStyle}>
            <EditableText {...et('subtitle', data?.subtitle)} placeholder="Uma experiência visual inesquecível em cada detalhe." />
          </div>
        )}
        
        {(btnText || editable) && (
          editable ? (
            <div
              className="bg-white text-neutral-900 rounded-none px-8 py-6 h-auto text-sm font-medium tracking-wide inline-flex items-center justify-center cursor-text"
              style={btnStyle}
            >
              <EditableText {...et('btnText', btnText)} placeholder="Acessar proposta" />
            </div>
          ) : (
            <Button 
              className="bg-white hover:bg-white/90 text-neutral-900 rounded-none px-8 py-6 h-auto text-sm font-medium tracking-wide"
              style={btnStyle}
              onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
            >
              {btnText}
            </Button>
          )
        )}
      </div>

      {(data?.photographer_name || editable) && (
        <div className="absolute bottom-6 @md:bottom-10 z-10 text-center w-full">
          <div className="text-[9px] tracking-[0.3em] uppercase text-white/60" style={photographerStyle}>
            <EditableText {...et('photographer_name', data?.photographer_name)} placeholder="FOTOGRAFIA POR NOME" />
          </div>
        </div>
      )}
    </section>
  );
}
