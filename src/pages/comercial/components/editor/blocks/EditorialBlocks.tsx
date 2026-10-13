import React from 'react';
import { cn } from '@/lib/utils';
import { EditableText } from '../../../blocks/EditableText';
import { EditableImage } from '../../../blocks/EditableImage';
import { useInlineEdit } from '../../../blocks/inlineContext';
import { fd, fb, fh, alignClass, sectionBg, textColorClass } from './helpers';
import { LABEL, Rule, accentOn } from './kit';

export function EditorialOverlapBlend({
  data,
  content,
  props,
}: {
  data?: any;
  content?: any;
  props?: any;
}) {
  const inline = useInlineEdit();
  const editable = inline?.editable ?? false;
  const et = (path: string, value: string | undefined) => ({
    editable,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
    fieldKey: path.includes('.') ? undefined : path, // tamanho ajustável por clique (campos de topo)
  });

  const c = content || data || {};
  const p = props || {};

  const isDark = (p.background ?? 'dark') === 'dark';
  const borderColor = isDark ? 'border-white/10' : 'border-[var(--pa-ink,#1A1714)]/10';
  const align = alignClass(p.align, 'left');

  const imgSlot = (slotKey: 'photo_a' | 'photo_b', label: string, style: React.CSSProperties) => (
    <EditableImage
      editable={editable}
      value={p[slotKey]?.image_ref || null}
      label={label}
      alt={label}
      onCommit={(url) => inline?.set(`props.${slotKey}.image_ref`, url)}
      className="rounded-[var(--pa-r-media,3px)] overflow-hidden"
      style={style}
    />
  );

  return (
    <section
      className={cn(
        'py-16 @md:py-28 px-6 @md:px-14 overflow-hidden',
        sectionBg(p.background, 'dark'),
        textColorClass(p.text_color, p.background, 'dark')
      )}
    >
      <div className="max-w-[900px] mx-auto">
        <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-10 @2xl:gap-20 items-center">
          {/* Visual (Photos) */}
          <div className="relative h-[320px] @md:h-[380px] @2xl:h-[520px] w-full max-w-md mx-auto @2xl:max-w-none">
            {imgSlot('photo_a', 'Foto A', {
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${p.photo_a?.width_pct || 72}%`,
              height: `${p.photo_a?.height_pct || 80}%`,
            })}
            {imgSlot('photo_b', 'Foto B', {
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: `${p.photo_b?.width_pct || 62}%`,
              height: `${p.photo_b?.height_pct || 66}%`,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '4px solid var(--pa-white, #fff)',
            })}
            {c.vertical_label && (
              <p
                className="hidden @2xl:block absolute bottom-8 -left-5 text-[10px] tracking-[0.35em] uppercase text-white/20"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
              >
                {c.vertical_label}
              </p>
            )}
          </div>

          {/* Text Content */}
          <div className={cn('flex flex-col', align)}>
            <EditableText
              as="span"
              {...et('eyebrow', c.eyebrow)}
              className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-50 mb-4 block"
            />

            <h2
              className="text-3xl @md:text-4xl @2xl:text-5xl @3xl:text-[3.5rem] font-light leading-[1.05] tracking-[0.03em] mb-8 @2xl:mb-10 text-current"
              style={fd()}
            >
              <EditableText {...et('title', c.title)} placeholder="Título" />{' '}
              <em className="italic opacity-60" style={fh()}>
                <EditableText {...et('title_italic', c.title_italic)} placeholder="em itálico" />
              </em>
            </h2>

            {c.details && c.details.length > 0 && (
              <div className="flex flex-col gap-0 mb-9">
                {c.details.map((detail: any, idx: number) => (
                  <div
                    key={detail.id || idx}
                    className={cn(
                      'flex justify-between items-baseline gap-6 py-3 border-b',
                      borderColor,
                      idx === 0 && 'border-t'
                    )}
                  >
                    <EditableText
                      as="span"
                      {...et(`details.${idx}.label`, detail.label)}
                      className="text-[10px] font-medium tracking-[0.24em] uppercase opacity-50 whitespace-nowrap"
                    />
                    <EditableText
                      as="span"
                      {...et(`details.${idx}.value`, detail.value)}
                      className="text-base font-light text-right opacity-75"
                      style={fd()}
                    />
                  </div>
                ))}
              </div>
            )}

            <EditableText
              as="p"
              {...et('body', c.body)}
              multiline
              className="italic text-base @md:text-[1.1rem] font-light leading-[1.7] opacity-80"
              style={fd()}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function EditorialSplitPortrait({
  data,
  content,
  props,
}: {
  data?: any;
  content?: any;
  props?: any;
}) {
  const inline = useInlineEdit();
  const editable = inline?.editable ?? false;
  const et = (path: string, value: string | undefined) => ({
    editable,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
    fieldKey: path.includes('.') ? undefined : path, // tamanho ajustável por clique (campos de topo)
  });

  const c = content || data || {};
  const p = props || {};
  const isDark = (p.background ?? 'cream') === 'dark';
  const borderColor = isDark ? 'border-white/10' : 'border-[var(--pa-ink,#1A1714)]/10';
  const align = alignClass(p.align, 'left');

  const photoRef = p.photo_a?.image_ref || null;

  return (
    <section
      className={cn(
        'py-16 @md:py-24 px-6 @md:px-14 overflow-hidden',
        sectionBg(p.background, 'cream'),
        textColorClass(p.text_color, p.background, 'cream')
      )}
    >
      <div className="max-w-[900px] mx-auto">
        <div className="grid grid-cols-1 @2xl:grid-cols-[1fr_minmax(0,42%)] gap-10 @2xl:gap-16 items-start">
          {/* Coluna de texto */}
          <div className={cn('flex flex-col', align)}>
            <EditableText
              as="h2"
              {...et('title', c.title)}
              className="text-2xl @md:text-3xl tracking-[0.15em] uppercase mb-8 @md:mb-12 text-current"
              style={fd()}
            />

            <EditableText
              as="div"
              {...et('body', c.body)}
              multiline
              className="text-sm @md:text-base font-light leading-[2] tracking-[0.02em] whitespace-pre-line opacity-80 mb-8"
              style={fb()}
            />

            {/* Detalhes key-value */}
            {c.details && c.details.length > 0 && (
              <div className="flex flex-col gap-0 mt-4">
                {c.details.map((detail: any, idx: number) => (
                  <div
                    key={detail.id || idx}
                    className={cn(
                      'flex justify-between items-baseline gap-6 py-3 border-b',
                      borderColor,
                      idx === 0 && 'border-t'
                    )}
                  >
                    <EditableText
                      as="span"
                      {...et(`details.${idx}.label`, detail.label)}
                      className="text-[10px] font-medium tracking-[0.24em] uppercase opacity-50 whitespace-nowrap"
                    />
                    <EditableText
                      as="span"
                      {...et(`details.${idx}.value`, detail.value)}
                      className="text-base font-light text-right opacity-75"
                      style={fd()}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna da foto */}
          <div className="aspect-[4/5] overflow-hidden w-full max-w-md mx-auto @2xl:max-w-none rounded-[var(--pa-r-media,0.75rem)] @2xl:rounded-[var(--pa-r-media,0px)]">
            <EditableImage
              editable={editable}
              value={photoRef}
              label="Foto"
              alt="Foto editorial"
              onCommit={(url) => inline?.set('props.photo_a.image_ref', url)}
              className="relative w-full h-full"
              imgClassName="object-cover w-full h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function EditorialTextOnly({
  data,
  content,
  props,
}: {
  data?: any;
  content?: any;
  props?: any;
}) {
  const inline = useInlineEdit();
  const editable = inline?.editable ?? false;
  const et = (path: string, value: string | undefined) => ({
    editable,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
    fieldKey: path.includes('.') ? undefined : path, // tamanho ajustável por clique (campos de topo)
  });

  const c = content || data || {};
  const p = props || {};
  const isDark = (p.background ?? 'cream') === 'dark';
  const borderColor = isDark ? 'border-white/10' : 'border-[var(--pa-ink,#1A1714)]/10';
  const align = alignClass(p.align, 'center');

  return (
    <section
      className={cn(
        'py-20 @md:py-32 px-6 @md:px-14 overflow-hidden',
        sectionBg(p.background, 'cream'),
        textColorClass(p.text_color, p.background, 'cream')
      )}
    >
      <div className={cn('max-w-[800px] mx-auto flex flex-col', align)}>
        <EditableText
          as="span"
          {...et('eyebrow', c.eyebrow)}
          className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-50 mb-6 block"
        />

        <h2 className="text-4xl @md:text-6xl font-light leading-[1.1] tracking-[0.02em] mb-12" style={fd()}>
          <EditableText {...et('title', c.title)} placeholder="Título" />{' '}
          <em className="italic opacity-60" style={fh()}>
            <EditableText {...et('title_italic', c.title_italic)} placeholder="em itálico" />
          </em>
        </h2>

        <EditableText
          as="p"
          {...et('body', c.body)}
          multiline
          className="italic text-lg @md:text-xl font-light leading-[1.8] opacity-70 mb-16 max-w-[650px] mx-auto"
          style={fd()}
        />

        {c.details && c.details.length > 0 && (
          <div className="flex flex-col gap-0 max-w-[500px] w-full mx-auto">
            {c.details.map((detail: any, idx: number) => (
              <div
                key={detail.id || idx}
                className={cn(
                  'flex justify-between items-baseline gap-6 py-4 border-b',
                  borderColor,
                  idx === 0 && 'border-t'
                )}
              >
                <EditableText
                  as="span"
                  {...et(`details.${idx}.label`, detail.label)}
                  className="text-[10px] font-medium tracking-[0.24em] uppercase opacity-50 whitespace-nowrap"
                />
                <EditableText
                  as="span"
                  {...et(`details.${idx}.value`, detail.value)}
                  className="text-base font-light text-right opacity-80"
                  style={fd()}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Sobre · Retrato em Arco — título em caixa-alta, corpo (justificado a partir de @md se
 * align = justify) e, embaixo, frases de destaque ao lado de um retrato em arco que encosta
 * na base da seção. Funciona só com frases (essencial), só com corpo (narrativo) ou ambos.
 */
export function EditorialArchPortrait({
  data,
  content,
  props,
}: {
  data?: any;
  content?: any;
  props?: any;
}) {
  const inline = useInlineEdit();
  const editable = inline?.editable ?? false;
  const et = (path: string, value: string | undefined) => ({
    editable,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
    fieldKey: path.includes('.') ? undefined : path, // tamanho ajustável por clique (campos de topo)
  });

  const c = content || data || {};
  const p = props || {};
  const photoRef = p.photo_a?.image_ref || null;
  const hasPhoto = !!photoRef || editable;
  const hasAside = !!c.aside?.trim() || editable;
  // Justificado só com largura para isso: no celular cria "rios" entre as palavras
  const bodyAlign = p.align === 'justify' ? 'text-left @md:text-justify' : alignClass(p.align, 'left');

  return (
    <section
      className={cn(
        'pt-16 @md:pt-24 px-6 @md:px-14 overflow-hidden',
        // O arco encosta na base da seção (como no editorial de referência)
        hasPhoto ? 'pb-0' : 'pb-16 @md:pb-24',
        sectionBg(p.background, 'white'),
        textColorClass(p.text_color, p.background, 'white')
      )}
    >
      <div className="max-w-[860px] mx-auto">
        {(c.eyebrow || editable) && (
          <EditableText
            as="p"
            {...et('eyebrow', c.eyebrow)}
            className="mb-4 text-center text-[11px] @md:text-xs tracking-[0.32em] uppercase opacity-60"
            style={fb()}
            placeholder="Rótulo (opcional)"
          />
        )}
        <EditableText
          as="h2"
          {...et('title', c.title)}
          className="text-center text-[length:clamp(1.75rem,4.5cqi,2.75rem)] leading-[1.15] tracking-[0.14em] uppercase"
          style={fd()}
          placeholder="Conheça sua fotógrafa"
        />
        {(c.body || editable) && (
          <EditableText
            as="div"
            {...et('body', c.body)}
            multiline
            className={cn(
              'mt-8 @md:mt-12 text-[16px] @md:text-[18px] leading-[1.65] tracking-[0.03em] whitespace-pre-line hyphens-auto opacity-80',
              bodyAlign
            )}
            style={fb()}
            placeholder="Sua história, seu olhar e o que você valoriza em cada sessão."
          />
        )}

        {(hasAside || hasPhoto) && (
          <div
            className={cn(
              'mt-12 @md:mt-16 grid grid-cols-1 gap-10',
              hasAside && hasPhoto && '@2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] @2xl:gap-12 @2xl:items-end'
            )}
          >
            {hasAside && (
              <EditableText
                as="div"
                {...et('aside', c.aside)}
                multiline
                className={cn(
                  'text-[18px] @md:text-[20px] leading-[1.7] tracking-[0.03em] whitespace-pre-line',
                  hasPhoto ? '@2xl:pb-24' : 'text-center'
                )}
                style={fb()}
                placeholder={'Toda história\ncomeça com uma memória.'}
              />
            )}
            {hasPhoto && (
              <div className="relative w-full max-w-sm mx-auto @2xl:max-w-none aspect-[3/4] rounded-t-full overflow-hidden">
                <EditableImage
                  editable={editable}
                  value={photoRef}
                  label="Retrato"
                  alt={c.title || 'Retrato'}
                  onCommit={(url) => inline?.set('props.photo_a.image_ref', url)}
                  className="absolute inset-0 w-full h-full"
                  imgClassName="object-cover object-top w-full h-full"
                  publicEmptyClassName="hidden"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const ITEMS_BY_ALIGN: Record<string, string> = { left: 'items-start', center: 'items-center', right: 'items-end', justify: 'items-start' };

// Máscara só na foto (não degradê por cima): no estreito esmaece no topo, ao lado do texto esmaece à esquerda
const LIGHT_FADE = cn(
  '[mask-image:linear-gradient(to_bottom,transparent,#000_38%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_38%)]',
  '@2xl:[mask-image:linear-gradient(to_right,transparent,#000_45%)] @2xl:[-webkit-mask-image:linear-gradient(to_right,transparent,#000_45%)]'
);

// Foto emoldurada (cartão arredondado) ou em círculo que sangra pelo canto superior direito
const SHAPED_PHOTO: Record<string, string> = {
  frame:
    'mt-12 aspect-[6/5] w-full overflow-hidden rounded-[var(--pa-r-card,1.25rem)] shadow-[0_4px_30px_rgba(0,0,0,0.06)] @2xl:mt-0 @2xl:w-[48%] @2xl:shrink-0',
  circle:
    'mx-auto mt-12 aspect-square w-[82%] overflow-hidden rounded-full @2xl:absolute @2xl:-right-[7%] @2xl:-top-[14%] @2xl:mt-0 @2xl:w-[52%]',
};

/**
 * Introdução · Texto e Luz — rótulo, título com a segunda voz em itálico no acento, filete curto
 * e corpo. A foto (luz, ambiente, detalhe) fica ao lado; o texto nunca fica sobre ela.
 * photo_style: soft = sem moldura, esmaecendo para o fundo (no estreito, faixa abaixo do texto);
 * frame = cartão arredondado ao lado; circle = círculo sangrando pelo canto. Sem foto, só texto.
 */
export function EditorialLightIntro({
  data,
  content,
  props,
}: {
  data?: any;
  content?: any;
  props?: any;
}) {
  const inline = useInlineEdit();
  const editable = inline?.editable ?? false;
  const et = (path: string, value: string | undefined) => ({
    editable,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
    fieldKey: path.includes('.') ? undefined : path, // tamanho ajustável por clique (campos de topo)
  });

  const c = content || data || {};
  const p = props || {};
  const photoRef = p.photo_a?.image_ref || null;
  const hasPhoto = !!photoRef || editable;
  const accent = accentOn(p);
  const alignKey = p.align && ITEMS_BY_ALIGN[p.align] ? p.align : 'left';
  // Justificado só no corpo e só com largura para isso (no celular cria "rios" entre as palavras)
  const headAlign = alignClass(alignKey === 'justify' ? 'left' : alignKey, 'left');
  const bodyAlign = alignKey === 'justify' ? 'text-left @md:text-justify' : headAlign;
  const photoStyle = SHAPED_PHOTO[p.photo_style] ? p.photo_style : 'soft';
  const soft = hasPhoto && photoStyle === 'soft';
  const shaped = hasPhoto && !soft && (
    <div className={cn('relative', SHAPED_PHOTO[photoStyle])}>
      <EditableImage
        editable={editable}
        value={photoRef}
        label="Foto principal"
        alt={c.title || 'Foto'}
        onCommit={(url) => inline?.set('props.photo_a.image_ref', url)}
        className="absolute inset-0 w-full h-full"
        imgClassName="object-cover w-full h-full"
        publicEmptyClassName="hidden"
      />
    </div>
  );

  return (
    <section
      className={cn(
        'relative overflow-hidden px-6 pt-20 @md:px-14 @md:pt-28',
        soft ? 'pb-0 @2xl:pb-28 @2xl:min-h-[38rem]' : hasPhoto ? 'pb-14 @md:pb-16' : 'pb-20 @md:pb-28',
        hasPhoto && photoStyle === 'circle' && '@2xl:min-h-[36rem]',
        sectionBg(p.background, 'white'),
        textColorClass(p.text_color, p.background, 'white')
      )}
    >
      <div className={cn('relative z-10 mx-auto w-full max-w-[1000px]', photoStyle === 'frame' && hasPhoto && '@2xl:flex @2xl:items-center @2xl:gap-10')}>
        <div
          className={cn(
            'flex flex-col',
            ITEMS_BY_ALIGN[alignKey],
            headAlign,
            !hasPhoto ? 'max-w-[40rem]' : photoStyle === 'frame' ? '@2xl:min-w-0 @2xl:flex-1' : '@2xl:w-[56%] @2xl:pr-8',
            !hasPhoto && alignKey === 'center' && 'mx-auto',
            !hasPhoto && alignKey === 'right' && 'ml-auto'
          )}
        >
          <EditableText
            as="p"
            {...et('eyebrow', c.eyebrow)}
            className={cn('mb-8 text-[11px] @md:text-xs opacity-75', LABEL)}
            style={fb()}
            placeholder="Rótulo (opcional)"
          />
          <h2 className="max-w-full text-[length:clamp(2.75rem,7.2cqi,4.9rem)] leading-[1.04] tracking-[-0.01em]" style={fd()}>
            <EditableText {...et('title', c.title)} placeholder="Mais que fotografias," />
            {(c.title_italic || editable) && (
              <em className={cn('block', accent)} style={fh()}>
                <EditableText {...et('title_italic', c.title_italic)} placeholder="memórias." />
              </em>
            )}
          </h2>
          <Rule className={cn('mt-10 w-20 @md:w-32', accent || 'opacity-50')} />
          {(c.body || editable) && (
            <EditableText
              as="div"
              {...et('body', c.body)}
              multiline
              className={cn('mt-10 max-w-[30rem] text-[16px] @md:text-[18px] leading-[1.75] whitespace-pre-line opacity-85', bodyAlign)}
              style={fb()}
              placeholder="O conceito da sessão: o que vocês vão viver e o que as fotografias vão guardar."
            />
          )}
        </div>
        {photoStyle === 'frame' && shaped}
      </div>
      {photoStyle === 'circle' && shaped}

      {soft && (
        <div
          className={cn(
            'relative mt-14 -mx-6 aspect-[4/3] @md:-mx-14 @2xl:absolute @2xl:inset-y-0 @2xl:right-0 @2xl:mx-0 @2xl:mt-0 @2xl:aspect-auto',
            // Com foto, a faixa que encosta no texto é transparente (máscara); vazio, o espaço começa depois do texto
            photoRef ? '@2xl:w-1/2' : '@2xl:w-[42%]'
          )}
        >
          <EditableImage
            editable={editable}
            value={photoRef}
            label="Foto de ambiente"
            alt={c.title || 'Foto de ambiente'}
            onCommit={(url) => inline?.set('props.photo_a.image_ref', url)}
            className="absolute inset-0 w-full h-full"
            imgClassName={cn('object-cover w-full h-full', LIGHT_FADE)}
            publicEmptyClassName="hidden"
          />
        </div>
      )}
    </section>
  );
}

export function EditorialRenderer({
  data,
  content,
  props,
}: {
  data?: any;
  content?: any;
  props?: any;
}) {
  const variant = props?.variant || 'overlap-blend';
  switch (variant) {
    case 'light-intro':
      return <EditorialLightIntro data={data} content={content} props={props} />;
    case 'split-portrait':
      return <EditorialSplitPortrait data={data} content={content} props={props} />;
    case 'text-only':
      return <EditorialTextOnly data={data} content={content} props={props} />;
    case 'arch-portrait':
      return <EditorialArchPortrait data={data} content={content} props={props} />;
    default:
      return <EditorialOverlapBlend data={data} content={content} props={props} />;
  }
}
