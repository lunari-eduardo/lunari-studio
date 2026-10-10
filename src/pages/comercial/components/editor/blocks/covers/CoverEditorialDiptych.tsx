import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { EditableImage } from '../../../../blocks/EditableImage';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { sectionBg, textColorClass, wideAlign, coverStyles, HERO_MIN_H, CtaHandler } from '../helpers';

/**
 * Capa Díptico — duas fotos 3:4 lado a lado. No estreito o texto fica
 * centralizado acima; a partir de @2xl, texto (4/12) ao lado do díptico (8/12).
 */
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
  const titleVal = data?.title_regular ?? data?.title;
  const s = coverStyles(props?.typography);

  const photo = (key: 'image_url' | 'photo_b', label: string, alt: string) => (
    <div className="relative overflow-hidden aspect-[3/4] rounded-[var(--pa-r-media,0.5rem)] shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
      <EditableImage
        editable={editable}
        value={data?.[key] || null}
        onCommit={(url) => inline?.set(key, url)}
        className="absolute inset-0 w-full h-full"
        imgClassName="object-cover w-full h-full"
        label={label}
        alt={alt}
        publicEmptyClassName="w-full h-full bg-gradient-to-br from-[var(--pa-linen,#E8DCCB)] to-[var(--pa-stone,#C9B7A2)]"
      />
    </div>
  );

  return (
    <section
      className={cn(
        'overflow-hidden flex flex-col justify-center p-6 @md:p-12 @2xl:p-16',
        HERO_MIN_H,
        sectionBg(props?.background, 'cream'),
        textColorClass(props?.text_color, props?.background, 'cream')
      )}
    >
      <div className="flex flex-col items-center gap-8 w-full max-w-xl mx-auto text-center @2xl:max-w-none @2xl:grid @2xl:grid-cols-12 @2xl:gap-12">
        {/* Coluna de texto */}
        <div className={cn('flex flex-col items-center justify-center min-w-0 w-full @2xl:col-span-4', wideAlign(props?.align))}>
          {(data?.eyebrow || editable) && (
            <div className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-60 mb-4" style={s.eyebrow}>
              <EditableText {...et('eyebrow', data?.eyebrow)} placeholder="EDITORIAL" />
            </div>
          )}

          <h1 className="text-3xl @md:text-4xl leading-[1.1] tracking-tight max-w-[15ch] mb-6" style={s.title}>
            <EditableText {...et('title', titleVal)} placeholder="O encanto" />{' '}
            {(data?.title_italic || editable) && (
              <em className="italic opacity-60 block mt-1" style={s.italic}>
                <EditableText {...et('title_italic', data?.title_italic)} placeholder="dos detalhes" />
              </em>
            )}
          </h1>

          {(data?.subtitle || editable) && (
            <div className="text-base max-w-[40ch] mb-8 leading-relaxed font-light" style={s.subtitle}>
              <EditableText multiline {...et('subtitle', data?.subtitle)} placeholder="Uma narrativa visual em duas perspectivas." />
            </div>
          )}

          {(btnText || editable) && (
            <div>
              {editable ? (
                <div
                  className="bg-[var(--pa-accent,#C86A46)] text-white rounded-[var(--pa-r-btn,0px)] px-8 py-5 h-auto text-sm font-medium tracking-wide inline-flex items-center justify-center cursor-text"
                  style={s.btn}
                >
                  <EditableText {...et('btnText', btnText)} placeholder="Acessar proposta" />
                </div>
              ) : (
                <Button
                  variant="default"
                  className="bg-[var(--pa-accent,#C86A46)] hover:bg-[var(--pa-accent,#C86A46)]/90 text-white rounded-[var(--pa-r-btn,0px)] px-8 py-5 h-auto text-sm font-medium tracking-wide"
                  style={s.btn}
                  onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
                >
                  {btnText}
                </Button>
              )}
            </div>
          )}

          {(data?.photographer_name || editable) && (
            <div className="text-[9px] tracking-[0.3em] uppercase opacity-50 mt-6 pt-4 border-t border-black/5" style={s.photographer}>
              <EditableText {...et('photographer_name', data?.photographer_name)} placeholder="FOTOGRAFIA POR NOME" />
            </div>
          )}
        </div>

        {/* Díptico */}
        <div className="grid grid-cols-2 gap-4 w-full @2xl:col-span-8">
          {photo('image_url', 'Foto A', 'Foto principal')}
          {photo('photo_b', 'Foto B', 'Foto secundária')}
        </div>
      </div>
    </section>
  );
}
