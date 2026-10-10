import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { EditableImage } from '../../../../blocks/EditableImage';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { fd, alignClass, sectionBg, textColorClass, coverStyles, HERO_MIN_H, CtaHandler } from '../helpers';

/**
 * Capa Split Lateral — no estreito, foto 4:5 empilhada sobre o texto;
 * a partir de @2xl, costura 50/50 com a foto preenchendo a altura da capa.
 */
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

  const s = coverStyles(props?.typography);
  const titleSize = 'text-[length:clamp(2.5rem,6cqi,4.5rem)]';

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden grid grid-cols-1 @2xl:grid-cols-2',
        HERO_MIN_H,
        sectionBg(props?.background, 'white')
      )}
    >
      {/* Mídia */}
      <div className="relative w-full aspect-[4/5] @2xl:aspect-auto @2xl:border-r border-black/5">
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

      {/* Texto */}
      <div
        className={cn(
          'flex flex-col justify-center min-w-0 p-6 @md:p-10 @2xl:p-12 @4xl:p-16 border-t border-black/5 @2xl:border-t-0',
          alignClass(props?.align),
          textColorClass(props?.text_color, props?.background, 'white')
        )}
      >
        {(data?.eyebrow || editable) && (
          <div className="text-sm uppercase tracking-[0.2em] mb-4 opacity-70" style={s.eyebrow}>
            <EditableText {...et('eyebrow', data?.eyebrow)} placeholder="PROPOSTA EXCLUSIVA" multiline={false} />
          </div>
        )}

        <h2 className="mb-6 flex flex-col gap-1">
          {(data?.title || data?.title_regular || editable) && (
            <span className={cn(titleSize, 'font-light tracking-tight leading-[1.05]')} style={s.title}>
              <EditableText {...et('title', data?.title || data?.title_regular)} placeholder="Título da sessão" multiline={false} />
            </span>
          )}
          {(data?.title_italic || editable) && (
            <span className={cn(titleSize, 'italic leading-[1.05]')} style={{ ...fd(), ...s.italic }}>
              <EditableText {...et('title_italic', data?.title_italic)} placeholder="em itálico" multiline={false} />
            </span>
          )}
        </h2>

        {(data?.subtitle || editable) && (
          <div className="text-lg @md:text-xl font-light mb-10 max-w-xl leading-relaxed opacity-80" style={s.subtitle}>
            <EditableText {...et('subtitle', data?.subtitle)} placeholder="Breve introdução sobre esta narrativa visual..." multiline />
          </div>
        )}

        {(data?.btnText || editable) && (
          <div className="mt-4">
            {editable ? (
              <div
                className="inline-flex items-center justify-center bg-[var(--pa-accent,#C86A46)] text-white rounded-[var(--pa-r-btn,0px)] px-8 py-6 h-auto text-sm font-medium tracking-wide cursor-text"
                style={s.btn}
              >
                <EditableText {...et('btnText', data?.btnText)} placeholder="Texto do botão" multiline={false} />
              </div>
            ) : (
              <Button
                onClick={() => onCtaClick?.({ blockType: 'cover', label: data.btnText })}
                className="bg-[var(--pa-accent,#C86A46)] hover:bg-[var(--pa-accent,#C86A46)]/90 text-white rounded-[var(--pa-r-btn,0px)] px-8 py-6 h-auto text-sm font-medium tracking-wide"
                style={s.btn}
              >
                {data.btnText}
              </Button>
            )}
          </div>
        )}

        {(data?.photographer_name || editable) && (
          <div className="mt-auto pt-12 @lg:pt-16 text-xs uppercase tracking-widest opacity-50" style={s.photographer}>
            <EditableText {...et('photographer_name', data?.photographer_name)} placeholder="FOTOGRAFIA POR NOME" multiline={false} />
          </div>
        )}
      </div>
    </section>
  );
}
