import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { sectionBg, textColorClass, coverStyles, HERO_MIN_H, CtaHandler } from '../helpers';
import { Flanked, LABEL, Rule, ShapedMedia, TitleLockup, accentOn, type TitleStyle } from '../kit';

/**
 * Capa Arcos: assinatura do estúdio no topo, três fotos em arco (a central maior,
 * todas esmaecendo na base), título em dois tempos e frase em caixa-alta.
 * O trio se mantém no celular (só encolhe): é a identidade da composição.
 */
export function CoverArchesTrio({
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
  const accent = accentOn(props);
  const ornaments = !props?.hide_ornaments;
  const btnText = data?.btnText;
  const arch = (key: 'image_url' | 'photo_b' | 'photo_c', label: string, className: string) => (
    <ShapedMedia
      shape="arch"
      fadeBottom
      editable={editable}
      value={data?.[key]}
      onCommit={(url) => inline?.set(key, url)}
      label={label}
      alt={label}
      className={className}
    />
  );

  return (
    <section
      className={cn(
        'relative overflow-hidden flex flex-col items-center justify-center text-center px-3 py-14 @md:px-12 @md:py-20',
        HERO_MIN_H,
        sectionBg(props?.background, 'white'),
        textColorClass(props?.text_color, props?.background, 'white')
      )}
    >
      {(data?.photographer_name || editable) && (
        <EditableText
          as="p"
          {...et('photographer_name', data?.photographer_name)}
          className={cn('pl-[0.42em] text-[12px] @md:text-sm opacity-80', LABEL, 'tracking-[0.42em]')}
          style={s.photographer}
          placeholder="Nome do estúdio"
        />
      )}
      {(data?.eyebrow || editable) && (
        <Flanked className="mt-2">
          <EditableText
            as="p"
            {...et('eyebrow', data?.eyebrow)}
            className={cn('pl-[0.5em] text-[10px] @md:text-[11px] opacity-60', LABEL, 'tracking-[0.5em]')}
            style={s.eyebrow}
            placeholder="Fotografia"
          />
        </Flanked>
      )}

      {/* Arcos com a mesma proporção: a coluna central mais larga fica mais alta e as bases alinham.
          No estreito o central cresce menos (1,2×), para os laterais não ficarem minúsculos. */}
      <div className="mt-10 grid w-full max-w-[34rem] grid-cols-[1fr_1.2fr_1fr] items-end gap-2 @md:mt-14 @md:grid-cols-[1fr_1.35fr_1fr] @md:gap-4 @2xl:max-w-[42rem]">
        {arch('photo_b', 'Esquerda', 'aspect-[3/5]')}
        {arch('image_url', 'Central', 'aspect-[3/5]')}
        {arch('photo_c', 'Direita', 'aspect-[3/5]')}
      </div>

      <div className={cn('flex flex-col items-center', accent)}>
        <TitleLockup
          className="mt-6 @md:mt-8"
          lead={data?.title ?? data?.title_regular}
          word={data?.title_italic}
          wordStyle={(props?.title_style as TitleStyle) ?? 'script'}
          et={et}
        />
        {ornaments && <Rule star className="mt-5 @md:mt-7" />}
      </div>

      {(data?.subtitle || editable) && (
        <EditableText
          as="p"
          {...et('subtitle', data?.subtitle)}
          className={cn('mt-6 max-w-[34ch] pl-[0.34em] text-[11px] @md:text-[13px] opacity-80', LABEL, 'tracking-[0.34em] leading-[2]')}
          style={s.subtitle}
          placeholder="Memórias que iluminam todas as estações"
        />
      )}
      <Rule className={cn('mt-8 opacity-70', accent)} />

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
            className="mt-10 h-auto border border-current rounded-[var(--pa-r-btn,9999px)] px-8 py-3 text-[11px] tracking-[0.3em] uppercase hover:bg-transparent hover:opacity-70"
            style={s.btn}
            onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
          >
            {btnText}
          </Button>
        ))}
    </section>
  );
}
