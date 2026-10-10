import React from 'react';
import { cn } from '@/lib/utils';
import { EditableText } from '../../../../blocks/EditableText';
import { EditableImage } from '../../../../blocks/EditableImage';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { fd, coverStyles, textColorClass, HERO_MIN_H, CtaHandler } from '../helpers';

// Véu claro no topo: texto escuro legível sobre qualquer céu/foto (sem o véu preto das capas hero)
const SKY_VEIL =
  'linear-gradient(to bottom, color-mix(in srgb, var(--pa-white,#FFFDFB) 88%, transparent) 0%, color-mix(in srgb, var(--pa-white,#FFFDFB) 45%, transparent) 50%, transparent 100%)';

/**
 * Capa Pôster Editorial — foto sangrada, texto ancorado no TOPO (filete vertical,
 * rótulo, título fino em caixa-alta, frase) e assinatura grande no rodapé sobre a foto.
 */
export function CoverPosterSky({
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
  const btnText = data?.btnText;
  // Sem foto não há o que escurecer: a assinatura volta para a cor do texto (sem faixa cinza)
  const hasImage = !!data?.image_url;
  // Cor escolhida pelo fotógrafo vence; senão, acento do tema com contraste garantido sobre o véu claro
  const ink =
    props?.text_color && props.text_color !== 'default'
      ? textColorClass(props.text_color, 'white', 'white')
      : 'text-[var(--pa-accent-on-white,#6D3C1B)]';

  return (
    <section className={cn('relative flex flex-col items-center overflow-hidden w-full text-center', HERO_MIN_H)}>
      <EditableImage
        editable={editable}
        value={data?.image_url || null}
        label="Capa"
        alt="Capa"
        onCommit={(url) => inline?.set('image_url', url)}
        className="absolute inset-0 w-full h-full"
        imgClassName="object-cover object-[50%_60%] w-full h-full"
        publicEmptyClassName="w-full h-full bg-[var(--pa-cream,#F3F0EA)]"
      />
      <div aria-hidden className="absolute inset-x-0 top-0 h-[60%] pointer-events-none" style={{ background: SKY_VEIL }} />
      {hasImage && (
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
      )}

      <div className={cn('relative z-10 flex flex-col items-center w-full px-6 @md:px-12', ink)}>
        <span aria-hidden className="block w-px h-12 @md:h-16 bg-current opacity-70" />
        {(data?.eyebrow || editable) && (
          <EditableText
            as="p"
            {...et('eyebrow', data?.eyebrow)}
            className="mt-8 @md:mt-10 text-[11px] @md:text-[13px] tracking-[0.32em] uppercase"
            style={s.eyebrow}
            placeholder="Sessão casal"
          />
        )}
        <h1
          className="mt-6 @md:mt-10 text-[length:clamp(2.75rem,12cqi,7.5rem)] leading-[1.05] tracking-[0.06em] uppercase max-w-[14ch]"
          style={s.title}
        >
          <EditableText {...et('title', data?.title_regular || data?.title)} placeholder="Entre nós" />
          {(data?.title_italic || editable) && (
            <>
              {' '}
              <em className="italic opacity-70" style={s.italic}>
                <EditableText {...et('title_italic', data?.title_italic)} placeholder="em itálico" />
              </em>
            </>
          )}
        </h1>
        {(data?.subtitle || editable) && (
          <EditableText
            as="p"
            {...et('subtitle', data?.subtitle)}
            className="mt-6 @md:mt-8 max-w-[60ch] text-[11px] @md:text-[13px] tracking-[0.3em] uppercase leading-[2]"
            style={s.subtitle}
            placeholder="Fotografias que atravessam o tempo."
          />
        )}
        {(btnText || editable) &&
          (editable ? (
            <div
              className="mt-10 border border-current rounded-[var(--pa-r-btn,0px)] px-8 py-3 text-[11px] tracking-[0.3em] uppercase cursor-text"
              style={s.btn}
            >
              <EditableText {...et('btnText', btnText)} placeholder="Ver proposta" />
            </div>
          ) : (
            <button
              type="button"
              className="mt-10 border border-current rounded-[var(--pa-r-btn,0px)] px-8 py-3 text-[11px] tracking-[0.3em] uppercase transition-opacity hover:opacity-70"
              style={s.btn}
              onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
            >
              {btnText}
            </button>
          ))}
      </div>

      {(data?.photographer_name || editable) && (
        <div className={cn('relative z-10 mt-auto pt-16 pb-10 @md:pb-14 px-6', hasImage ? 'text-[var(--pa-white,#FFFDFB)]' : ink)}>
          <EditableText
            as="p"
            {...et('photographer_name', data?.photographer_name)}
            className="text-[length:clamp(1.5rem,4.5cqi,2.75rem)] tracking-[0.35em] uppercase leading-tight"
            style={{ ...s.photographer, ...fd() }}
            placeholder="Seu nome"
          />
        </div>
      )}
    </section>
  );
}
