import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { EditableImage } from '../../../../blocks/EditableImage';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { sectionBg, textColorClass, coverStyles, HERO_MIN_H, CtaHandler } from '../helpers';

/** Capa Moldura Fine Art — foto 4:5 em passe-partout flutuante, centralizada em qualquer largura. */
export function CoverFloatingFrame({
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
  const s = coverStyles(props?.typography);

  return (
    <section
      className={cn(
        'overflow-hidden flex flex-col items-center justify-center py-10 px-6 @md:py-16 @md:px-12 @2xl:py-20 @2xl:px-16',
        HERO_MIN_H,
        sectionBg(props?.background, 'white'),
        textColorClass(props?.text_color, props?.background, 'white')
      )}
    >
      {/* Eyebrow */}
      {(data?.eyebrow || editable) && (
        <div className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-60 mb-6" style={s.eyebrow}>
          <EditableText {...et('eyebrow', data?.eyebrow)} placeholder="TÍTULO DA COLEÇÃO" />
        </div>
      )}

      {/* Título centralizado */}
      <div className="text-3xl @md:text-4xl @lg:text-5xl text-center leading-[1.1] tracking-tight max-w-[15ch] mb-2" style={s.title}>
        <EditableText {...et('title', data?.title ?? data?.title_regular)} placeholder="Título da proposta" />{' '}
        {(data?.title_italic || editable) && (
          <em className="italic opacity-60" style={s.italic}>
            <EditableText {...et('title_italic', data?.title_italic)} placeholder="em itálico" />
          </em>
        )}
      </div>

      {/* Subtítulo */}
      {(data?.subtitle || editable) && (
        <div className="text-center text-base max-w-[40ch] mb-10 leading-relaxed font-light opacity-80" style={s.subtitle}>
          <EditableText {...et('subtitle', data?.subtitle)} placeholder="Uma breve descrição sobre esta proposta ou galeria de arte." />
        </div>
      )}

      {/* Moldura flutuante */}
      <div className="relative mx-auto w-full max-w-sm @2xl:max-w-md">
        <div className="p-3 @md:p-4 bg-white rounded-[var(--pa-r-media,0.125rem)] shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
          <div className="overflow-hidden relative aspect-[4/5]">
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
        </div>
      </div>

      {/* Metadados */}
      <div className="mt-8 flex flex-col items-center gap-4">
        {(data?.photographer_name || editable) && (
          <div className="text-[9px] tracking-[0.3em] uppercase opacity-50" style={s.photographer}>
            <EditableText {...et('photographer_name', data?.photographer_name)} placeholder="NOME DO FOTÓGRAFO" />
          </div>
        )}

        {/* CTA */}
        {(btnText || editable) &&
          (editable ? (
            <div
              className="inline-flex items-center justify-center bg-[var(--pa-accent,#C86A46)] text-white rounded-[var(--pa-r-btn,0px)] px-8 py-6 h-auto text-sm font-medium tracking-wide cursor-text"
              style={s.btn}
            >
              <EditableText {...et('btnText', btnText)} placeholder="Acessar proposta" />
            </div>
          ) : (
            <Button
              onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
              className="bg-[var(--pa-accent,#C86A46)] hover:bg-[var(--pa-accent,#C86A46)]/90 text-white rounded-[var(--pa-r-btn,0px)] px-8 py-6 h-auto text-sm font-medium tracking-wide"
              style={s.btn}
            >
              {btnText}
            </Button>
          ))}
      </div>
    </section>
  );
}
