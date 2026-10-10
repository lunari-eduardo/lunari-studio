import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { EditableImage } from '../../../../blocks/EditableImage';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { coverStyles, HERO_MIN_H, CtaHandler } from '../helpers';

/** Capa Hero Fotográfico — imersiva full-bleed; o object-cover centraliza a foto em qualquer proporção de tela. */
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
  const s = coverStyles(props?.typography);

  return (
    <section className={cn('relative flex flex-col items-center justify-center overflow-hidden w-full py-16 @md:py-24', HERO_MIN_H)}>
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

      <div className="relative z-10 flex flex-col items-center text-center px-6 @md:px-12 max-w-xl @2xl:max-w-3xl">
        {(data?.eyebrow || editable) && (
          <div className="text-[10px] font-medium tracking-[0.28em] uppercase text-white/70 mb-4" style={s.eyebrow}>
            <EditableText {...et('eyebrow', data?.eyebrow)} placeholder="COLEÇÃO EXCLUSIVA" />
          </div>
        )}

        <h1 className="text-4xl @md:text-6xl @lg:text-7xl text-white leading-[1.1] tracking-tight max-w-[15ch] mb-6" style={s.title}>
          <EditableText {...et('title', data?.title_regular || data?.title)} placeholder="Título da sessão" />{' '}
          {(data?.title_italic || editable) && (
            <em className="italic text-white/70" style={s.italic}>
              <EditableText {...et('title_italic', data?.title_italic)} placeholder="em itálico" />
            </em>
          )}
        </h1>

        {(data?.subtitle || editable) && (
          <div className="text-white/80 text-lg max-w-[40ch] mb-10 leading-relaxed font-light" style={s.subtitle}>
            <EditableText {...et('subtitle', data?.subtitle)} placeholder="Uma experiência visual inesquecível em cada detalhe." />
          </div>
        )}

        {(btnText || editable) &&
          (editable ? (
            <div
              className="bg-white text-neutral-900 rounded-[var(--pa-r-btn,0px)] px-8 py-6 h-auto text-sm font-medium tracking-wide inline-flex items-center justify-center cursor-text"
              style={s.btn}
            >
              <EditableText {...et('btnText', btnText)} placeholder="Acessar proposta" />
            </div>
          ) : (
            <Button
              className="bg-white hover:bg-white/90 text-neutral-900 rounded-[var(--pa-r-btn,0px)] px-8 py-6 h-auto text-sm font-medium tracking-wide"
              style={s.btn}
              onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
            >
              {btnText}
            </Button>
          ))}
      </div>

      {(data?.photographer_name || editable) && (
        <div className="absolute bottom-6 @md:bottom-10 z-10 text-center w-full">
          <div className="text-[9px] tracking-[0.3em] uppercase text-white/60" style={s.photographer}>
            <EditableText {...et('photographer_name', data?.photographer_name)} placeholder="FOTOGRAFIA POR NOME" />
          </div>
        </div>
      )}
    </section>
  );
}
