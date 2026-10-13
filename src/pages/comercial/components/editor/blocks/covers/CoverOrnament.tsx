import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../../blocks/EditableText';
import { useInlineEdit } from '../../../../blocks/inlineContext';
import { EditableImage } from '../../../../blocks/EditableImage';
import { sectionBg, textColorClass, coverStyles, HERO_MIN_H, CtaHandler } from '../helpers';
import { LABEL, Rule, Sparkle, TitleLockup, accentOn, type TitleStyle } from '../kit';

// Recorte da foto por máscara (não pelo contêiner): o botão "Trocar foto" nunca é cortado.
// Com ornamentos, árvores vazadas (alfa de medalhao-mascara.png); sem, círculo simples.
const maskStyle = (image: string): React.CSSProperties => ({
  maskImage: image,
  WebkitMaskImage: image,
  maskSize: '100% 100%',
  WebkitMaskSize: '100% 100%',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
});
const TREES = maskStyle('url(/images/natal/medalhao-mascara.png)');
const CIRCLE = maskStyle('radial-gradient(circle closest-side, #000 99.5%, transparent 100%)');

// Brilhos ao redor do medalhão (% da largura do círculo; dentro da margem da seção)
const SPARKLES: React.CSSProperties[] = [
  { top: '4%', left: '-9%', width: '7%' },
  { top: '-2%', right: '7%', width: '4%' },
  { top: '36%', left: '-12%', width: '4.5%' },
  { top: '46%', right: '-11%', width: '7%' },
  { bottom: '10%', left: '-6%', width: '5%' },
  { bottom: '0%', right: '4%', width: '5.5%' },
];

/**
 * Capa Medalhão: globo de neve "pendurado" por um fio que desce do topo da seção
 * (cresce com a altura disponível), árvores vazadas sobre a foto, título em dois tempos.
 * Gancho, árvores e brilhos são opcionais (hide_ornaments): sem eles, círculo simples e centralizado.
 */
export function CoverOrnament({
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

  return (
    <section
      className={cn(
        'relative overflow-hidden flex flex-col items-center text-center px-4 pb-14 @md:px-12 @md:pb-20',
        !ornaments && 'justify-center pt-14 @md:pt-20',
        HERO_MIN_H,
        sectionBg(props?.background, 'white'),
        textColorClass(props?.text_color, props?.background, 'white')
      )}
    >
      {/* Fio do medalhão: ocupa o espaço livre acima (até um teto), então sempre nasce na borda superior */}
      {ornaments && (
        <span
          aria-hidden
          className={cn('block w-px flex-1 min-h-14 max-h-48 bg-current opacity-60 @md:min-h-20 @md:max-h-64', accent)}
        />
      )}

      <div className="relative aspect-square w-[min(78%,24rem)] @2xl:w-[min(46%,26rem)]">
        {/* Vidro do globo: sombra e um véu claro que aparece pelo recorte das árvores */}
        <span aria-hidden className="absolute inset-0 rounded-full bg-white/50 shadow-[0_24px_60px_rgba(0,0,0,0.10)]" />
        {ornaments && (
          <span
            aria-hidden
            className={cn(
              'absolute left-1/2 top-0 z-10 block h-4 w-9 -translate-x-1/2 -translate-y-[70%] rounded-t-[0.45rem] rounded-b-[0.2rem] border border-current',
              accent
            )}
            style={{ background: 'color-mix(in srgb, currentColor 22%, var(--pa-white, #FAF6F0))' }}
          />
        )}
        <EditableImage
          editable={editable}
          value={data?.image_url || null}
          onCommit={(url) => inline?.set('image_url', url)}
          label="Foto do medalhão"
          alt="Capa"
          className="absolute inset-0 w-full h-full"
          imgClassName="object-cover w-full h-full"
          imgStyle={ornaments ? TREES : CIRCLE}
          publicEmptyClassName="w-full h-full bg-[var(--pa-linen,#E9DFD0)]"
        />
        {/* Aro sobre a borda da foto */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-[var(--pa-stone,#D9C8AE)] shadow-[inset_0_0_0_4px_rgba(255,255,255,0.5)]"
        />
        {ornaments &&
          SPARKLES.map((pos, i) => (
            <Sparkle key={i} className={cn('pointer-events-none absolute aspect-square h-auto opacity-80', accent)} style={pos} />
          ))}
      </div>

      <div className={cn('flex flex-col items-center', accent)}>
        <TitleLockup
          className="mt-10 @md:mt-12"
          lead={data?.title ?? data?.title_regular}
          word={data?.title_italic}
          wordStyle={(props?.title_style as TitleStyle) ?? 'caps'}
          et={et}
          between={ornaments ? <Rule star className="my-3 @md:my-4" /> : undefined}
        />
      </div>

      {(data?.subtitle || editable) && (
        <EditableText
          as="p"
          {...et('subtitle', data?.subtitle)}
          className={cn('mt-5 max-w-[36ch] pl-[0.34em] text-[11px] @md:text-[13px] opacity-80', LABEL, 'tracking-[0.34em] leading-[2]')}
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
            className="mt-10 h-auto border border-current rounded-[var(--pa-r-btn,9999px)] px-8 py-3 text-[11px] tracking-[0.3em] uppercase hover:bg-transparent hover:opacity-70"
            style={s.btn}
            onClick={() => onCtaClick?.({ blockType: 'cover', label: btnText })}
          >
            {btnText}
          </Button>
        ))}

      {(data?.photographer_name || editable) && (
        <EditableText
          as="p"
          {...et('photographer_name', data?.photographer_name)}
          className={cn('mt-10 pl-[0.42em] text-[11px] @md:text-xs opacity-70', LABEL, 'tracking-[0.42em]')}
          style={s.photographer}
          placeholder="Nome do estúdio"
        />
      )}
    </section>
  );
}
