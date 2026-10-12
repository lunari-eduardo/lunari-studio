import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { EditableImage } from '../../../../blocks/EditableImage';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { coverStyles, HERO_MIN_H, CtaHandler } from '../helpers';
import { HighlightsStrip, LABEL, Rule, TitleLockup, type TitleStyle } from '../kit';

// Véu uniforme (sem degradê) + halo nas letras: a foto respira e o texto pequeno segue legível em trechos claros
const VEIL = 'color-mix(in srgb, var(--pa-ink, #1F2620) 56%, transparent)';
const HALO = '0 1px 14px rgba(0, 0, 0, 0.35)';

/**
 * Capa Noturna: foto sangrada sob o véu na tinta do tema, estúdio no topo, título claro
 * ao centro e faixa de destaques no rodapé. Sem foto, o fundo é a própria tinta.
 */
export function CoverNightHero({
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
    fieldKey: path.includes('.') ? undefined : path, // tamanho ajustável por clique (campos de topo)
  });

  const s = coverStyles(props?.typography);
  const hasImage = !!data?.image_url;
  const btnText = data?.btnText;

  return (
    <section
      className={cn(
        'relative overflow-hidden flex flex-col items-center w-full text-center px-5 pt-14 pb-10 @md:px-12 @md:pt-20 @md:pb-14',
        'bg-[var(--pa-ink,#1F2620)] text-[var(--pa-white,#FAF6F0)]',
        HERO_MIN_H
      )}
      style={hasImage ? { textShadow: HALO } : undefined}
    >
      <EditableImage
        editable={editable}
        value={data?.image_url || null}
        label="Capa"
        actionCorner
        alt="Capa"
        onCommit={(url) => inline?.set('image_url', url)}
        className="absolute inset-0 w-full h-full"
        imgClassName="object-cover w-full h-full"
        publicEmptyClassName="w-full h-full bg-[var(--pa-ink,#1F2620)]"
      />
      {hasImage && (
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: VEIL }} />
      )}

      <div className="relative z-10 flex flex-col items-center">
        {(data?.photographer_name || editable) && (
          <EditableText
            as="p"
            {...et('photographer_name', data?.photographer_name)}
            className={cn('pl-[0.42em] text-[12px] @md:text-sm', LABEL, 'tracking-[0.42em]')}
            style={s.photographer}
            placeholder="Seu estúdio"
          />
        )}
        {(data?.eyebrow || editable) && (
          <EditableText
            as="p"
            {...et('eyebrow', data?.eyebrow)}
            className={cn('mt-1 pl-[0.5em] text-[9px] @md:text-[10px] opacity-75', LABEL, 'tracking-[0.5em]')}
            style={s.eyebrow}
            placeholder="Apresenta"
          />
        )}
      </div>

      <div className="relative z-10 my-auto flex flex-col items-center py-14 @md:py-16">
        <TitleLockup
          lead={data?.title ?? data?.title_regular}
          word={data?.title_italic}
          wordStyle={(props?.title_style as TitleStyle) ?? 'caps'}
          et={et}
        />
        <Rule className="mt-8 w-20 opacity-60 @md:mt-10" />
        {(data?.subtitle || editable) && (
          <EditableText
            as="p"
            {...et('subtitle', data?.subtitle)}
            className={cn('mt-8 max-w-[26ch] pl-[0.34em] text-[11px] @md:text-[13px] opacity-90', LABEL, 'tracking-[0.34em] leading-[2.1]')}
            style={s.subtitle}
            placeholder="Memórias que aquecem sempre"
          />
        )}
        {btnText &&
          (editable ? (
            <div
              className="mt-10 border border-current rounded-[var(--pa-r-btn,9999px)] px-8 py-3 text-[11px] tracking-[0.3em] uppercase cursor-text"
              style={s.btn}
            >
              <EditableText {...et('btnText', btnText)} placeholder="Texto do botão" />
            </div>
          ) : (
            <Button
              variant="ghost"
              className="mt-10 h-auto border border-current rounded-[var(--pa-r-btn,9999px)] px-8 py-3 text-[11px] tracking-[0.3em] uppercase hover:bg-transparent hover:text-current hover:opacity-70"
              style={s.btn}
              onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
            >
              {btnText}
            </Button>
          ))}
      </div>

      <HighlightsStrip
        className="relative z-10 max-w-[56rem] opacity-90"
        items={data?.highlights ?? []}
        et={et}
        editable={editable}
      />
    </section>
  );
}
