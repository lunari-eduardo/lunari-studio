import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../blocks/EditableText';
import { EditableImage } from '../../../blocks/EditableImage';
import { useInlineEdit } from '../../../blocks/inlineContext';
import { displayPrice, priceEditPath, featureIcon } from '../../../blocks/pricing';
import { fd, fb, fa, alignClass, sectionBg, textColorClass, CtaHandler } from './helpers';

export function PackageRenderer({ data, onCtaClick }: { data: any; onCtaClick?: CtaHandler }) {
  return (
    <section className="py-16 px-8 bg-white flex flex-col items-center">
      <div className="w-full max-w-md bg-white border border-[var(--pa-linen,#EBE5DF)] rounded-2xl p-8 shadow-sm flex flex-col relative transition-all hover:shadow-md">
        {data?.highlight && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--pa-cream,#F3EBE1)] text-[var(--pa-accent,#A67C52)] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            Mais Escolhido
          </div>
        )}

        <h3 className="text-2xl text-[var(--pa-ink,#2C2825)] mb-2" style={fd()}>
          {data?.title || 'Essencial'}
        </h3>
        <p className="text-sm text-[var(--pa-taupe,#6D655E)] mb-6">
          {data?.subtitle || 'Para quem deseja registros leves e naturais.'}
        </p>

        <div className="flex-1">
          <p className="text-sm text-[var(--pa-ink,#4A4541)] whitespace-pre-line leading-loose">
            {data?.description || '10 fotos digitais\n1h de ensaio\nGaleria online'}
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--pa-cream,#F2EFEA)] flex items-center justify-between">
          <span className="text-2xl font-medium text-[var(--pa-ink,#2C2825)]">
            R$ {((data?.price_cents || 129000) / 100).toLocaleString('pt-BR')}
          </span>
          <Button
            variant="outline"
            className="border-[var(--pa-stone,#D8D2CB)] text-[var(--pa-ink,#2C2825)] hover:bg-[var(--pa-white,#FDFBF7)] rounded-none"
            onClick={() => onCtaClick?.({ blockType: 'package', label: data?.title || 'Pacote' })}
          >
            Escolher pacote
          </Button>
        </div>
      </div>
    </section>
  );
}

export function PricingClassic({
  content,
  data,
  props,
  onCtaClick,
}: {
  content?: any;
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
  });
  const c = content || data || {};
  const packages: any[] = c.packages || [];
  const align = alignClass(props?.align, 'center');

  return (
    <section
      className={cn(
        'py-16 @md:py-24 px-6 @md:px-14',
        sectionBg(props?.background, 'white'),
        textColorClass(props?.text_color, props?.background, 'white')
      )}
    >
      <div className={cn('max-w-[900px] mx-auto', align)}>
        <EditableText
          as="p"
          {...et('eyebrow', c.eyebrow)}
          className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-50 mb-4"
        />
        <div className="mb-12">
          <EditableText as="h2" {...et('title', c.title)} className="text-4xl @md:text-5xl" style={fd()} />
          <EditableText as="p" multiline {...et('subtitle', c.subtitle)} className="mt-4 text-sm opacity-60 whitespace-pre-line" placeholder="Frase de apoio (opcional)" />
        </div>
        <div className="pa-pkg-grid">
          {packages.map((pkg: any, idx: number) => (
            <div
              key={pkg.id || idx}
              className={cn(
                // Cartão é superfície "white" do tema: texto próprio, legível também em seções escuras
                'border border-black/5 shadow-[0_4px_30px_rgba(0,0,0,0.06)] p-8 rounded-[var(--pa-r-card,1rem)] bg-[var(--pa-white,#FDFBF7)] text-[var(--pa-on-white,#1A1714)] flex flex-col relative overflow-hidden',
                align
              )}
            >
              {pkg.badge && (
                <div className="absolute top-0 right-0 bg-[var(--pa-cream,#F3F0EA)] text-[10px] font-medium tracking-[0.28em] uppercase text-[var(--pa-taupe,#8C7B6E)] px-3 py-1 border-b border-l border-black/5 rounded-bl-xl">
                  <EditableText {...et(`packages.${idx}.badge`, pkg.badge)} />
                </div>
              )}
              <EditableText
                as="h3"
                {...et(`packages.${idx}.name`, pkg.name)}
                className="text-2xl mb-2 pr-6"
                style={fd()}
              />
              <p className="text-xl text-[var(--pa-accent,#7A5C42)] mb-6">
                <EditableText {...et(priceEditPath(pkg, idx), displayPrice(pkg))} placeholder="R$" />
                {(pkg.price_unit || editable) && (
                  <span className="text-sm opacity-50 font-light">
                    /<EditableText {...et(`packages.${idx}.price_unit`, pkg.price_unit)} placeholder="un." />
                  </span>
                )}
              </p>

              {/* Imagem do pacote */}
              {!props?.hide_images && (pkg.image_ref || editable) && (
                <div className="h-36 w-full mb-6 rounded-[var(--pa-r-media,0.75rem)] overflow-hidden relative bg-black/5">
                  <EditableImage
                    editable={editable}
                    value={pkg.image_ref || null}
                    label="Foto do pacote"
                    alt={pkg.name || 'Pacote'}
                    onCommit={(url) => inline?.set(`packages.${idx}.image_ref`, url)}
                    publicEmptyClassName="hidden"
                  />
                </div>
              )}

              <ul className={cn('space-y-3 flex-1 mb-8', align)}>
                {(pkg.features || []).map((feat: string, i: number) => (
                  <li key={i} className="text-sm font-light opacity-70 border-b border-black/5 pb-2 last:border-0">
                    <EditableText {...et(`packages.${idx}.features.${i}`, feat)} placeholder="Item incluso" />
                  </li>
                ))}
              </ul>

              {!props?.hide_cta && (
                <Button
                  variant="outline"
                  className="w-full bg-[var(--pa-ink,#2C2825)] border-transparent text-[var(--pa-on-ink,#FFFFFF)] hover:bg-[var(--pa-ink,#2C2825)] hover:opacity-90 hover:text-[var(--pa-on-ink,#FFFFFF)] rounded-[var(--pa-r-btn,0.75rem)] transition-opacity"
                  onClick={() => onCtaClick?.({ blockType: 'PricingTable', label: pkg.name })}
                >
                  Selecionar
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingCardsMinimal({
  content,
  data,
  props,
  onCtaClick,
}: {
  content?: any;
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
  });
  const c = content || data || {};
  const packages: any[] = c.packages || [];
  const align = alignClass(props?.align, 'center');

  return (
    <section
      className={cn(
        'py-16 @md:py-24 px-6 @md:px-14',
        sectionBg(props?.background, 'white'),
        textColorClass(props?.text_color, props?.background, 'white')
      )}
    >
      <div className={cn('max-w-[1000px] mx-auto', align)}>
        <EditableText
          as="p"
          {...et('eyebrow', c.eyebrow)}
          className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-50 mb-4"
        />
        <div className="mb-16">
          <EditableText as="h2" {...et('title', c.title)} className="text-4xl @md:text-5xl" style={fd()} />
          <EditableText as="p" multiline {...et('subtitle', c.subtitle)} className="mt-4 text-sm opacity-60 whitespace-pre-line" placeholder="Frase de apoio (opcional)" />
        </div>

        <div className="pa-pkg-grid [--pa-pkg-gap:2.5rem] @md:[--pa-pkg-gap:3.5rem]">
          {packages.map((pkg: any, idx: number) => (
            <div key={pkg.id || idx} className={cn('flex flex-col relative text-current', align)}>
              {!props?.hide_images && (pkg.image_ref || editable) && (
                <div className="aspect-[4/5] w-full mb-8 rounded-[var(--pa-r-media,1.5rem)] overflow-hidden relative bg-black/5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] group/card">
                  <EditableImage
                    editable={editable}
                    value={pkg.image_ref || null}
                    label="Foto do pacote"
                    alt={pkg.name || 'Pacote'}
                    onCommit={(url) => inline?.set(`packages.${idx}.image_ref`, url)}
                    className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover/card:scale-105"
                    imgClassName="object-cover w-full h-full"
                    publicEmptyClassName="hidden"
                  />
                  {pkg.badge && (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-[9px] font-medium tracking-[0.2em] uppercase text-neutral-900 px-3 py-1.5 rounded-full shadow-sm">
                      <EditableText {...et(`packages.${idx}.badge`, pkg.badge)} />
                    </div>
                  )}
                </div>
              )}

              {!pkg.image_ref && !editable && pkg.badge && (
                <div className="inline-block mx-auto bg-black/5 text-[9px] font-medium tracking-[0.2em] uppercase text-neutral-900 px-3 py-1 mb-4 rounded-full">
                  <EditableText {...et(`packages.${idx}.badge`, pkg.badge)} />
                </div>
              )}

              <EditableText
                as="h3"
                {...et(`packages.${idx}.name`, pkg.name)}
                className="text-2xl @md:text-3xl mb-3"
                style={fd()}
              />

              <p className="text-xl text-[var(--pa-accent,#7A5C42)] mb-8 font-light">
                <EditableText {...et(priceEditPath(pkg, idx), displayPrice(pkg))} placeholder="R$" />
                {(pkg.price_unit || editable) && (
                  <span className="text-sm opacity-50">
                    /<EditableText {...et(`packages.${idx}.price_unit`, pkg.price_unit)} placeholder="un." />
                  </span>
                )}
              </p>

              <ul className={cn('space-y-4 flex-1 mb-10 text-sm font-light opacity-75', align)}>
                {(pkg.features || []).map((feat: string, i: number) => (
                  <li key={i}>
                    <EditableText {...et(`packages.${idx}.features.${i}`, feat)} placeholder="Item incluso" />
                  </li>
                ))}
              </ul>

              {!props?.hide_cta && (
                <Button
                  variant="outline"
                  className={cn(
                    'w-[80%] bg-transparent border-current/20 text-current hover:bg-current hover:text-white rounded-[var(--pa-r-btn,9999px)] transition-all',
                    align === 'text-center' ? 'mx-auto' : align === 'text-right' ? 'ml-auto' : 'mr-auto'
                  )}
                  onClick={() => onCtaClick?.({ blockType: 'PricingTable', label: pkg.name })}
                >
                  Selecionar
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingNumberedEditorial({
  content,
  data,
  props,
}: {
  content?: any;
  data?: any;
  props?: any;
}) {
  const inline = useInlineEdit();
  const editable = inline?.editable ?? false;
  const et = (path: string, value: string | undefined) => ({
    editable,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
  });
  const c = content || data || {};
  const packages: any[] = c.packages || [];
  const align = alignClass(props?.align, 'center');

  return (
    <section
      className={cn(
        'py-16 @md:py-24 px-6 @md:px-14',
        sectionBg(props?.background, 'cream'),
        textColorClass(props?.text_color, props?.background, 'cream')
      )}
    >
      <div className={cn('max-w-[900px] mx-auto', align)}>
        {/* Header */}
        <EditableText
          as="p"
          {...et('eyebrow', c.eyebrow)}
          className="text-[9px] @md:text-[10px] font-medium tracking-[0.35em] uppercase opacity-60 mb-4"
        />
        <EditableText
          as="h2"
          {...et('title', c.title)}
          className="text-[length:clamp(2rem,8.5cqi,6rem)] uppercase tracking-[0.1em] leading-[1.05] mb-6 text-current"
          style={fd()}
        />
        <EditableText
          as="p"
          multiline
          {...et('subtitle', c.subtitle)}
          className="-mt-2 mb-6 text-[10px] @md:text-[11px] tracking-[0.3em] uppercase leading-[2.2] opacity-60 whitespace-pre-line"
          placeholder="Frase de apoio (opcional)"
        />

        {/* Pacotes */}
        <div className="mt-12 @md:mt-16 space-y-0 text-left">
          {packages.map((pkg: any, idx: number) => {
            const num = String(idx + 1).padStart(2, '0');
            const isEven = idx % 2 === 1;

            return (
              <div
                key={pkg.id || idx}
                className={cn(
                  'border-t border-[var(--pa-stone,#C9BFB2)]/30 py-10 @md:py-14',
                  idx === packages.length - 1 && 'border-b'
                )}
              >
                <div
                  className={cn(
                    'grid gap-8 @2xl:gap-12 items-start',
                    !props?.hide_images && (pkg.image_ref || editable)
                      ? 'grid-cols-1 @2xl:grid-cols-[1fr_1fr]'
                      : 'grid-cols-1'
                  )}
                >
                  {/* Lado do conteúdo */}
                  <div className={cn(isEven && '@2xl:order-2')}>
                    <div className="flex items-baseline gap-4 mb-4">
                      <span className="text-5xl @md:text-6xl opacity-15 leading-none" style={fd()}>
                        {num}
                      </span>
                      <div>
                        <EditableText
                          as="h3"
                          {...et(`packages.${idx}.name`, pkg.name)}
                          className="text-sm @md:text-base tracking-[0.2em] uppercase font-medium"
                          style={fb()}
                        />
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-8 ml-0">
                      {(pkg.features || []).map((feat: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm font-light opacity-70">
                          <span className="text-[var(--pa-accent,#7A5C42)] mt-0.5 text-xs">•</span>
                          <EditableText {...et(`packages.${idx}.features.${i}`, feat)} placeholder="Item incluso" />
                        </li>
                      ))}
                    </ul>

                    {/* Preço */}
                    <div className="mt-auto">
                      <p className="text-[9px] tracking-[0.3em] uppercase text-[var(--pa-taupe,#8C7B6E)] mb-1">
                        À VISTA
                      </p>
                      <p className="text-2xl @md:text-3xl tracking-[0.05em]" style={fd()}>
                        <EditableText {...et(priceEditPath(pkg, idx), displayPrice(pkg))} placeholder="R$ 250,00" />
                      </p>
                      {(pkg.price_installments || editable) && (
                        <p className="text-[10px] tracking-[0.15em] uppercase text-[var(--pa-taupe,#8C7B6E)] mt-1">
                          OU{' '}
                          <EditableText
                            {...et(`packages.${idx}.price_installments`, pkg.price_installments)}
                            placeholder="3x de R$ 89,62"
                          />
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lado da foto */}
                  {!props?.hide_images && (pkg.image_ref || editable) && (
                    <div className={cn('aspect-[4/5] @2xl:aspect-[3/4] overflow-hidden rounded-[var(--pa-r-media,0px)]', isEven && '@2xl:order-1')}>
                      <EditableImage
                        editable={editable}
                        value={pkg.image_ref || null}
                        label={`Foto ${pkg.name || 'Pacote'}`}
                        alt={pkg.name || 'Pacote'}
                        onCommit={(url) => inline?.set(`packages.${idx}.image_ref`, url)}
                        className="relative w-full h-full"
                        imgClassName="object-cover w-full h-full"
                        publicEmptyClassName="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// REVISTA (magazine) — fiel ao editorial de referência (A4 "Sessão casal"):
// cartão com borda fina, texto 46% + foto sangrada 54%, numeração serifada
// contínua entre grupos, filetes que esmaecem e preço à vista/parcelado.
// ============================================================

/** Filete horizontal que esmaece (no PDF são degradês, não linhas sólidas). */
const MagRule = ({ className }: { className?: string }) => (
  <span
    aria-hidden
    className={cn(
      'block h-px w-4/5 bg-gradient-to-r from-[var(--pa-stone,#D0C8BC)] via-[var(--pa-stone,#D0C8BC)] to-transparent',
      className
    )}
  />
);

export function PricingMagazine({
  content,
  data,
  props,
  onCtaClick,
  numberOffset = 0,
}: {
  content?: any;
  data?: any;
  props?: any;
  onCtaClick?: CtaHandler;
  numberOffset?: number;
}) {
  const inline = useInlineEdit();
  const editable = inline?.editable ?? false;
  const et = (path: string, value: string | undefined) => ({
    editable,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
  });
  const c = content || data || {};
  const packages: any[] = c.packages || [];
  const rules = !!props?.eyebrow_rules;
  const align = rules ? 'text-center' : alignClass(props?.align, 'center');
  const justify = align === 'text-right' ? 'justify-end' : align === 'text-left' ? 'justify-start' : 'justify-center';
  const measure = align === 'text-right' ? 'ml-auto' : align === 'text-left' ? '' : 'mx-auto';
  // Título no tom de acento só sobre o fundo claro padrão e sem cor de texto escolhida
  const tint =
    (props?.background ?? 'white') === 'white' && (!props?.text_color || props.text_color === 'default')
      ? 'text-[var(--pa-accent-on-white,#6D3C1B)]'
      : '';
  const longTitle = (c.title || '').trim().length > 10;
  const showIcons = !props?.hide_feature_icons;
  const accentText = 'text-[var(--pa-accent-on-white,#6D3C1B)]';

  return (
    <section
      className={cn(
        'py-14 @md:py-20 px-5 @md:px-8',
        sectionBg(props?.background, 'white'),
        textColorClass(props?.text_color, props?.background, 'white')
      )}
    >
      <div className="max-w-[1100px] mx-auto">
        {/* Cabeçalho do grupo: rótulo / título fino em caixa-alta / frase de apoio */}
        <header className={cn('mb-10 @md:mb-14', align, tint)}>
          {(c.eyebrow || editable) && (
            <div className={cn('flex items-center gap-4 @md:gap-6 mb-4 @md:mb-5', justify)}>
              {rules && <span aria-hidden className="flex-1 h-px bg-[var(--pa-stone,#D0C8BC)]" />}
              <EditableText
                as="p"
                {...et('eyebrow', c.eyebrow)}
                className="text-[11px] @md:text-xs tracking-[0.32em] uppercase shrink-0"
                style={fb()}
                placeholder="Pacotes"
              />
              {rules && <span aria-hidden className="flex-1 h-px bg-[var(--pa-stone,#D0C8BC)]" />}
            </div>
          )}
          <EditableText
            as="h2"
            {...et('title', c.title)}
            className={cn(
              longTitle ? 'text-[length:clamp(2rem,6.5cqi,4.25rem)]' : 'text-[length:clamp(2.75rem,10cqi,6rem)]',
              // leading DEPOIS do tamanho: o tailwind-merge descarta leading anterior a um text-*
              'uppercase leading-[1.1] tracking-[0.12em]'
            )}
            style={fd()}
            placeholder="Estúdio"
          />
          {(c.subtitle || editable) && (
            <EditableText
              as="p"
              multiline
              {...et('subtitle', c.subtitle)}
              className={cn(
                'mt-5 @md:mt-7 max-w-[52ch] text-[11px] @md:text-[12px] uppercase tracking-[0.3em] leading-[2.2] whitespace-pre-line',
                measure
              )}
              style={fb()}
              placeholder="Escolha a melhor experiência para registrar o que é de vocês."
            />
          )}
        </header>

        <div className="grid grid-cols-1 @4xl:grid-cols-2 gap-5 @md:gap-6 @4xl:gap-8">
          {packages.map((pkg: any, idx: number) => {
            // Pacote único, ou o último de uma contagem ímpar, vira o cartão largo (como o "03" do PDF)
            const wide = packages.length === 1 || (idx === packages.length - 1 && packages.length % 2 === 1);
            const hasPhoto = !props?.hide_images && (!!pkg.image_ref || editable);
            const features: string[] = pkg.features || [];
            const price = displayPrice(pkg);
            const installments: string = pkg.price_installments || '';
            const number = props?.numbering === 'none' ? null : String(numberOffset + idx + 1).padStart(2, '0');

            return (
              <article
                key={pkg.id || idx}
                className={cn(
                  'flex flex-col @md:flex-row overflow-hidden text-left',
                  'border border-[var(--pa-stone,#D0C8BC)] rounded-[var(--pa-r-card,0px)]',
                  // Cartão é superfície "white" do tema: legível também em seções escuras
                  'bg-[var(--pa-white,#FFFDFB)] text-[var(--pa-on-white,#251910)]',
                  wide && '@4xl:col-span-2'
                )}
              >
                {hasPhoto && (
                  <div
                    className={cn(
                      'relative shrink-0 order-first @md:order-last aspect-[4/3] @md:aspect-auto @md:w-[54%] @md:min-h-[24rem]',
                      wide ? '@4xl:order-first @4xl:w-[36%] @4xl:min-h-[18rem] @4xl:m-3 @4xl:mr-0' : '@4xl:min-h-[30rem]'
                    )}
                  >
                    <EditableImage
                      editable={editable}
                      value={pkg.image_ref || null}
                      label={`Foto ${pkg.name || 'do pacote'}`}
                      alt={pkg.name || 'Pacote'}
                      onCommit={(url) => inline?.set(`packages.${idx}.image_ref`, url)}
                      className="absolute inset-0 w-full h-full"
                      imgClassName="object-cover object-[50%_30%] w-full h-full"
                      publicEmptyClassName="hidden"
                    />
                  </div>
                )}

                <div
                  className={cn(
                    'flex flex-col flex-1 min-w-0 p-6 @md:p-7',
                    wide && '@4xl:flex-row @4xl:items-center @4xl:gap-8'
                  )}
                >
                  <div className={cn('flex flex-col', wide && '@4xl:flex-1 @4xl:min-w-0')}>
                    {pkg.badge && (
                      <p className={cn('mb-3 text-[10px] uppercase tracking-[0.3em]', accentText)} style={fb()}>
                        <EditableText {...et(`packages.${idx}.badge`, pkg.badge)} />
                      </p>
                    )}
                    {number && (
                      <span className={cn('text-[length:clamp(2.25rem,4.5cqi,3rem)] leading-none lining-nums', accentText)} style={fa()}>
                        {number}
                      </span>
                    )}
                    <EditableText
                      as="h3"
                      {...et(`packages.${idx}.name`, pkg.name)}
                      className={cn('mt-3 text-[15px] @md:text-[16px] @4xl:text-[18px] uppercase tracking-[0.3em] leading-snug', accentText)}
                      style={fb()}
                      placeholder="Nome do pacote"
                    />
                    <MagRule className="mt-4" />

                    {features.length > 0 && (
                      <ul
                        className={cn(
                          'mt-5 flex flex-col gap-4',
                          wide && features.length > 5 && '@4xl:grid @4xl:grid-cols-2 @4xl:gap-x-8'
                        )}
                      >
                        {features.map((feat: string, i: number) => {
                          const Icon = featureIcon(feat);
                          return (
                            <li key={i} className="flex items-start gap-3 text-[13px] @md:text-[14px] leading-[1.5]">
                              {showIcons && (
                                <span
                                  aria-hidden
                                  className="mt-[0.15em] flex h-4 w-4 shrink-0 items-center justify-center text-[var(--pa-taupe,#9B6338)]"
                                >
                                  {Icon ? (
                                    <Icon className="h-4 w-4" strokeWidth={1.25} />
                                  ) : (
                                    <span className="h-1.5 w-1.5 rotate-45 border border-current" />
                                  )}
                                </span>
                              )}
                              <EditableText
                                {...et(`packages.${idx}.features.${i}`, feat)}
                                className="min-w-0 opacity-90"
                                placeholder="Item incluso"
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {/* Respiro flexível + filete (cartão normal) ou filete vertical (cartão largo) */}
                  <div className={cn('flex-1 min-h-6', wide && '@4xl:hidden')} />
                  <MagRule className={cn(wide && '@4xl:hidden')} />
                  <span
                    aria-hidden
                    className={cn(
                      'hidden w-px self-stretch bg-gradient-to-b from-transparent via-[var(--pa-stone,#D0C8BC)] to-transparent',
                      wide && '@4xl:block'
                    )}
                  />

                  <div className={cn('mt-5', wide && '@4xl:mt-0 @4xl:w-[34%] @4xl:shrink-0')}>
                    {/* "À vista" só faz sentido em contraste com um parcelamento */}
                    {installments && (
                      <p className="mb-1 text-[10px] @md:text-[11px] uppercase tracking-[0.3em] opacity-70" style={fb()}>
                        À vista
                      </p>
                    )}
                    {(price || editable) && (
                      <p
                        className={cn('text-[length:clamp(1.5rem,2.6cqi,1.875rem)] leading-tight font-semibold lining-nums', accentText)}
                        style={fa()}
                      >
                        <EditableText {...et(priceEditPath(pkg, idx), price)} placeholder="R$ 250,00" />
                      </p>
                    )}
                    {(installments || editable) && (
                      <p className="mt-1.5 text-[11px] uppercase tracking-[0.2em] opacity-80" style={fb()}>
                        ou{' '}
                        <EditableText
                          {...et(`packages.${idx}.price_installments`, installments)}
                          placeholder="3x de R$ 89,62"
                        />
                      </p>
                    )}
                    {!props?.hide_cta && (
                      <button
                        type="button"
                        onClick={() => onCtaClick?.({ blockType: 'PricingTable', label: pkg.name })}
                        className="mt-6 w-full border border-[var(--pa-stone,#D0C8BC)] rounded-[var(--pa-r-btn,0px)] py-3 text-[11px] uppercase tracking-[0.3em] transition-colors hover:border-transparent hover:bg-[var(--pa-accent-on-white,#6D3C1B)] hover:text-[var(--pa-white,#FFFDFB)]"
                        style={fb()}
                      >
                        Selecionar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PricingTableRenderer({
  content,
  data,
  props,
  onCtaClick,
  numberOffset,
}: {
  content?: any;
  data?: any;
  props?: any;
  onCtaClick?: CtaHandler;
  numberOffset?: number;
}) {
  const variant = props?.variant || 'cards-classic';
  switch (variant) {
    case 'magazine':
      return <PricingMagazine content={content} data={data} props={props} onCtaClick={onCtaClick} numberOffset={numberOffset} />;
    case 'numbered-editorial':
      return <PricingNumberedEditorial content={content} data={data} props={props} />;
    case 'cards-minimal':
      return <PricingCardsMinimal content={content} data={data} props={props} onCtaClick={onCtaClick} />;
    default:
      return <PricingClassic content={content} data={data} props={props} onCtaClick={onCtaClick} />;
  }
}
