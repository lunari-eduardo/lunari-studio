import React from 'react';
import { cn } from '@/lib/utils';
import { EditableText } from '../../../blocks/EditableText';
import { EditableImage } from '../../../blocks/EditableImage';
import { displayPrice, priceEditPath, slicePad, splitLeadingNumber, type PackageSlice } from '../../../blocks/pricing';
import { ICON_NONE, addonIcon, resolveIconKey, suggestIcon } from '../../../blocks/icons';
import { accentTextClass, fa, fb, fd, fh, sectionBg, textColorClass, veilClass } from './helpers';
import { HighlightsStrip, LABEL, PriceTag, ProposalIcon, Rule, accentOn, useEt, type Et } from './kit';

// ============================================================
// PACOTES DA COLEÇÃO EDITORIAL (Natal): cartões com foto, linhas com foto e cartões em arco.
// Mesma anatomia (nome, descrição curta, itens com ícone, preço editorial); o layout muda.
// Adicionais (AddonsBlock) dividem cabeçalho, preço e destaques: no fim do arquivo.
// Sem botão por pacote/adicional: a proposta é respondida na conversa (CTA de WhatsApp do visualizador).
// "Mais escolhido" = pacote com selo preenchido.
// ============================================================

/** Cartão é superfície "white" do tema: legível também em seções escuras. */
const CARD = 'bg-[var(--pa-white,#FAF6F0)] text-[var(--pa-on-white,#1F2620)]';
const CARD_BORDER = 'border-[color:color-mix(in_srgb,var(--pa-on-white,#1F2620)_7%,transparent)]';
const FEATURED_BORDER = 'border-[color:color-mix(in_srgb,var(--pa-accent,#A67C52)_45%,transparent)]';
const ACCENT_TEXT = 'text-[var(--pa-accent-on-white,#A67C52)]';
// Selo em acento escurecido: texto claro pequeno acima de 4,5:1
const BADGE =
  'whitespace-nowrap rounded-full bg-[color:color-mix(in_srgb,var(--pa-accent,#A67C52)_72%,var(--pa-ink,#1F2620))] px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-[var(--pa-white,#FAF6F0)] shadow-[0_4px_14px_rgba(0,0,0,0.12)]';
const HAIRLINE = 'bg-[color:color-mix(in_srgb,currentColor_12%,transparent)]';

// Estilo do cartão (props.card_style). 'solid' = superfície "white" do tema (propostas antigas, sem o campo);
// 'tint' = veladura translúcida (veilClass: vidro fosco em fundo escuro, branco suave em fundo claro);
// 'outline' = só contorno. Os leves não têm superfície própria: o texto herda a cor da seção
// (funciona em fundo claro e escuro) e o acento vem de accentTextClass.
type CardStyle = 'solid' | 'tint' | 'outline';
const cardStyleOf = (p: any): CardStyle => (p?.card_style === 'tint' || p?.card_style === 'outline' ? p.card_style : 'solid');
const lightCard = (style: CardStyle, p: any, featured = false) =>
  cn(
    style === 'tint' && veilClass(p?.background, 'cream'),
    featured
      ? FEATURED_BORDER
      : style === 'tint'
        ? 'border-[color:color-mix(in_srgb,currentColor_16%,transparent)]'
        : 'border-[color:color-mix(in_srgb,currentColor_26%,transparent)]'
  );
// Sem a sobreposição do painel sobre a foto (a foto apareceria através do cartão translúcido): filete entre os dois
const PANEL_UNDER_PHOTO = 'border-t border-[color:color-mix(in_srgb,currentColor_12%,transparent)]';
/** Acento do cartão: sobre a superfície branca (sólido) ou direto sobre o fundo da seção (leve). */
const cardAccent = (style: CardStyle, p: any) => (style === 'solid' ? ACCENT_TEXT : accentTextClass(p?.text_color, p?.background, 'cream'));

function Badge({ et, idx, text, className }: { et: Et; idx: number; text: string; className?: string }) {
  return (
    <span className={cn(BADGE, className)}>
      <EditableText {...et(`packages.${idx}.badge`, text)} placeholder="Mais escolhido" />
    </span>
  );
}

/** Rótulo + filete, título (com itálico opcional no acento) e frase: em caixa-alta espaçada ou frase corrida. */
function PackagesHeader({
  c,
  et,
  editable,
  accent,
  sentence = false,
  inline = false,
}: {
  c: any;
  et: Et;
  editable: boolean;
  accent: string;
  sentence?: boolean;
  /** Itálico na mesma linha do título ("Adicionais e Extras"); padrão = linha de baixo. */
  inline?: boolean;
}) {
  return (
    <header className="mx-auto flex max-w-[50rem] flex-col items-center text-center">
      {(c.eyebrow || editable) && (
        <>
          <EditableText
            as="p"
            {...et('eyebrow', c.eyebrow)}
            className={cn('pl-[0.42em] text-[11px] @md:text-xs opacity-75', LABEL, 'tracking-[0.42em]')}
            style={fb()}
            placeholder="Nossos pacotes"
          />
          <Rule className={cn('mt-5 w-16 opacity-60', accent)} />
        </>
      )}
      {/* max-w-full: item de flex encolhe ao conteúdo; sem teto, um placeholder longo vazaria da moldura */}
      <h2
        // Sem cn: o tailwind-merge descartaria o leading-[1] ao lado de text-[length:…]
        className={`mt-7 max-w-full leading-[1] tracking-[-0.01em] ${inline ? 'text-[length:clamp(2.75rem,8cqi,5.5rem)]' : 'text-[length:clamp(3rem,10cqi,6.25rem)]'}`}
        style={fd()}
      >
        <EditableText {...et('title', c.title)} placeholder="Pacotes" />
        {(c.title_italic || editable) && (
          <em className={cn(inline ? 'inline' : 'block', accent)} style={fh()}>
            {inline && ' '}
            <EditableText {...et('title_italic', c.title_italic)} placeholder="em itálico (opcional)" />
          </em>
        )}
      </h2>
      {(c.subtitle || editable) &&
        (sentence ? (
          <EditableText
            as="p"
            multiline
            {...et('subtitle', c.subtitle)}
            className="mt-7 max-w-[46ch] whitespace-pre-line text-[15px] leading-[1.7] opacity-80 @md:text-[17px]"
            style={fb()}
            placeholder="Frase de apoio (opcional)"
          />
        ) : (
          <EditableText
            as="p"
            multiline
            {...et('subtitle', c.subtitle)}
            className={cn('mt-6 whitespace-pre-line pl-[0.42em] text-[11px] @md:text-sm opacity-85', LABEL, 'tracking-[0.42em]')}
            style={fb()}
            placeholder="Frase de apoio (opcional)"
          />
        ))}
    </header>
  );
}

/** Faixa de destaques e frase de rodapé (entre filetes longos, ou com filete curto acima). */
function PackagesFooter({ c, et, editable, accent, longRules = true }: { c: any; et: Et; editable: boolean; accent: string; longRules?: boolean }) {
  const foot = (c.footnote || editable) && (
    <EditableText
      as="p"
      {...et('footnote', c.footnote)}
      className={cn('max-w-[80%] pl-[0.42em] text-center text-[11px] @md:text-xs opacity-80', LABEL, 'tracking-[0.42em]')}
      style={fb()}
      placeholder="Frase de rodapé (opcional)"
    />
  );
  return (
    <>
      <HighlightsStrip className="mt-14 @md:mt-16" items={c.highlights ?? []} et={et} editable={editable} underline />
      {foot &&
        (longRules ? (
          <div className="mt-12 flex w-full items-center justify-center gap-5">
            <span aria-hidden className={cn('h-px flex-1 bg-current opacity-50', accent)} />
            {foot}
            <span aria-hidden className={cn('h-px flex-1 bg-current opacity-50', accent)} />
          </div>
        ) : (
          <div className="mt-12 flex flex-col items-center gap-6">
            <Rule className={cn('w-16 opacity-50', accent)} />
            {foot}
          </div>
        ))}
    </>
  );
}

/** Itens com ícone: escolhido no painel (feature_icons) ou sugerido pelo texto; desconhecido = losango neutro. */
function FeatureList({
  pkg,
  idx,
  et,
  editable,
  showIcons,
  className,
  accentText = ACCENT_TEXT,
}: {
  pkg: any;
  idx: number;
  et: Et;
  editable: boolean;
  showIcons: boolean;
  className?: string;
  accentText?: string;
}) {
  const features: string[] = pkg.features || [];
  const icons: string[] = pkg.feature_icons || [];
  return (
    <ul className={cn('flex flex-col gap-3.5', className)}>
      {features.map((feat, i) => {
        if (!editable && !feat?.trim()) return null;
        const key = showIcons ? resolveIconKey(icons[i], suggestIcon(feat)) : null;
        return (
          <li key={i} className="flex items-start gap-4 text-[15px] leading-[1.45]">
            {showIcons && (
              <span aria-hidden className={cn('flex h-6 w-6 shrink-0 items-center justify-center', accentText)}>
                {key ? (
                  <ProposalIcon name={key} className="h-6 w-6" />
                ) : icons[i] === ICON_NONE ? null : (
                  <span className="h-1.5 w-1.5 rotate-45 border border-current" />
                )}
              </span>
            )}
            <EditableText {...et(`packages.${idx}.features.${i}`, feat)} className="min-w-0 pt-[0.1em] opacity-90" placeholder="Item incluso" />
          </li>
        );
      })}
    </ul>
  );
}

/** Preço editorial do tamanho de quem o contém (cqi): "R$ 12.490,00" cabe num cartão de 3 colunas. */
function FittedPrice({
  value,
  editable,
  onCommit,
  className,
  size = 'text-[length:clamp(2.25rem,20cqi,3.6rem)]',
  children,
}: {
  value: string;
  editable: boolean;
  onCommit: (v: string) => void;
  className?: string;
  /** Tamanho em cqi da largura disponível (20cqi = "R$ 12.490,00" inteiro). */
  size?: string;
  children?: React.ReactNode;
}) {
  if (!value && !editable) return null;
  return (
    <div className={cn('w-full [container-type:inline-size]', className)}>
      <PriceTag value={value} editable={editable} onCommit={onCommit} className={size} />
      {children}
    </div>
  );
}

function PackagePrice({ pkg, idx, set, editable, className }: { pkg: any; idx: number; set: (p: string, v: any) => void; editable: boolean; className?: string }) {
  const installments: string = pkg.price_installments || '';
  return (
    <FittedPrice value={displayPrice(pkg)} editable={editable} onCommit={(v) => set(priceEditPath(pkg, idx), v)} className={className}>
      {installments && (
        <p className="mt-2 text-[11px] uppercase tracking-[0.2em] opacity-70" style={fb()}>
          ou {installments}
        </p>
      )}
    </FittedPrice>
  );
}

const sectionCls = (p: any, slice?: PackageSlice) =>
  cn('py-16 @md:py-24 px-5 @md:px-10', slicePad(slice), sectionBg(p.background, 'cream'), textColorClass(p.text_color, p.background, 'cream'));

const emptyHint = (
  <p className="mt-12 rounded-2xl border border-dashed border-[color:color-mix(in_srgb,currentColor_25%,transparent)] p-8 text-center text-sm opacity-60">
    Adicione os pacotes no painel (ou importe os cadastrados).
  </p>
);

/** Cartões com Foto: foto no topo, painel com cantos arredondados sobre a foto, itens com ícone e preço. */
export function PricingPhotoCards({ content, data, props, slice }: { content?: any; data?: any; props?: any; slice?: PackageSlice }) {
  const { editable, et, set } = useEt();
  const c = content || data || {};
  const p = props || {};
  const packages: any[] = c.packages || [];
  const accent = accentOn(p);
  const style = cardStyleOf(p);
  const solid = style === 'solid';
  const accentText = cardAccent(style, p);

  return (
    <section className={sectionCls(p, slice)}>
      <div className="mx-auto max-w-[1100px]">
        {!slice?.hideHeader && <PackagesHeader c={c} et={et} editable={editable} accent={accent} />}
        {slice?.lead}
        {packages.length === 0 && editable && emptyHint}
        <div className="pa-pkg-grid mt-12 [--pa-pkg-gap:1.25rem] @md:mt-14 @md:[--pa-pkg-gap:1.5rem]">
          {packages.map((pkg, idx) => {
            const featured = !!pkg.badge?.trim();
            const hasPhoto = !p.hide_images && (!!pkg.image_ref || editable);
            return (
              <div key={pkg.id || idx} className="relative flex pt-4">
                {featured && <Badge et={et} idx={idx} text={pkg.badge} className="absolute left-1/2 top-0 z-10 -translate-x-1/2" />}
                <article
                  className={cn(
                    'flex w-full flex-col overflow-hidden rounded-[var(--pa-r-card,1.5rem)] border text-center',
                    solid
                      ? cn(CARD, featured ? cn(FEATURED_BORDER, 'shadow-[0_18px_50px_rgba(0,0,0,0.10)]') : cn(CARD_BORDER, 'shadow-[0_4px_30px_rgba(0,0,0,0.06)]'))
                      : lightCard(style, p, featured)
                  )}
                >
                  {hasPhoto && (
                    <div className="relative aspect-[16/15] w-full shrink-0">
                      <EditableImage
                        editable={editable}
                        value={pkg.image_ref || null}
                        label="Foto do pacote"
                        alt={pkg.name || 'Pacote'}
                        onCommit={(url) => set(`packages.${idx}.image_ref`, url)}
                        className="absolute inset-0 w-full h-full"
                        imgClassName="object-cover w-full h-full"
                        publicEmptyClassName="hidden"
                      />
                    </div>
                  )}
                  <div
                    className={cn(
                      'relative flex flex-1 flex-col items-center px-6 pb-8 pt-8 @md:px-7',
                      hasPhoto && (solid ? cn('-mt-6 rounded-t-[var(--pa-r-card,1.5rem)]', CARD) : PANEL_UNDER_PHOTO)
                    )}
                  >
                    <EditableText
                      as="h3"
                      {...et(`packages.${idx}.name`, pkg.name)}
                      className="pl-[0.24em] text-[1.35rem] uppercase leading-tight tracking-[0.24em] @md:text-2xl"
                      style={fd()}
                      placeholder="Nome do pacote"
                    />
                    {(pkg.description || editable) && (
                      <EditableText
                        as="p"
                        multiline
                        {...et(`packages.${idx}.description`, pkg.description)}
                        className={cn('mt-3 max-w-[26ch] whitespace-pre-line pl-[0.3em] text-[10px] @md:text-[11px] opacity-75', LABEL, 'tracking-[0.3em]')}
                        style={fb()}
                        placeholder="Para quem é este pacote"
                      />
                    )}
                    <Rule className="mt-5 w-14 opacity-25" />
                    <FeatureList
                      pkg={pkg}
                      idx={idx}
                      et={et}
                      editable={editable}
                      showIcons={!p.hide_icons}
                      accentText={accentText}
                      className="mt-7 w-full max-w-[17rem] text-left"
                    />
                    <span aria-hidden className="min-h-6 flex-1" />
                    <span aria-hidden className={cn('mt-8 block h-px w-full', HAIRLINE)} />
                    <PackagePrice pkg={pkg} idx={idx} set={set} editable={editable} className={cn('mt-6', accentText)} />
                  </div>
                </article>
              </div>
            );
          })}
        </div>
        {!slice?.hideFooter && <PackagesFooter c={c} et={et} editable={editable} accent={accent} />}
      </div>
    </section>
  );
}

/** Linhas com Foto: cartão horizontal (foto alternando os lados); no estreito, foto em cima. */
export function PricingPhotoRows({ content, data, props, slice }: { content?: any; data?: any; props?: any; slice?: PackageSlice }) {
  const { editable, et, set } = useEt();
  const c = content || data || {};
  const p = props || {};
  const packages: any[] = c.packages || [];
  const accent = accentOn(p);
  const style = cardStyleOf(p);
  const solid = style === 'solid';
  const accentText = cardAccent(style, p);

  return (
    <section className={sectionCls(p, slice)}>
      <div className="mx-auto max-w-[1000px]">
        {!slice?.hideHeader && <PackagesHeader c={c} et={et} editable={editable} accent={accent} />}
        {slice?.lead}
        {packages.length === 0 && editable && emptyHint}
        <div className="mt-12 flex flex-col gap-5 @md:mt-14 @md:gap-6">
          {packages.map((pkg, idx) => {
            const featured = !!pkg.badge?.trim();
            const hasPhoto = !p.hide_images && (!!pkg.image_ref || editable);
            const flip = idx % 2 === 1;
            return (
              <article
                key={pkg.id || idx}
                className={cn(
                  'grid overflow-hidden rounded-[var(--pa-r-card,1.5rem)] border text-left',
                  hasPhoto && '@2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]',
                  solid
                    ? cn(CARD, featured ? cn(FEATURED_BORDER, 'shadow-[0_18px_50px_rgba(0,0,0,0.10)]') : cn(CARD_BORDER, 'shadow-[0_4px_30px_rgba(0,0,0,0.06)]'))
                    : lightCard(style, p, featured)
                )}
              >
                {hasPhoto && (
                  <div className={cn('relative aspect-[4/3] @2xl:aspect-auto @2xl:min-h-[20rem]', flip && '@2xl:order-2')}>
                    <EditableImage
                      editable={editable}
                      value={pkg.image_ref || null}
                      label="Foto do pacote"
                      alt={pkg.name || 'Pacote'}
                      onCommit={(url) => set(`packages.${idx}.image_ref`, url)}
                      className="absolute inset-0 w-full h-full"
                      imgClassName="object-cover w-full h-full"
                      publicEmptyClassName="hidden"
                    />
                  </div>
                )}
                <div className="flex min-w-0 flex-col p-6 @md:p-9">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <EditableText
                      as="h3"
                      {...et(`packages.${idx}.name`, pkg.name)}
                      className={cn('text-[1.4rem] uppercase leading-tight tracking-[0.22em] @md:text-[1.65rem]', accentText)}
                      style={fd()}
                      placeholder="Nome do pacote"
                    />
                    {featured ? (
                      <Badge et={et} idx={idx} text={pkg.badge} />
                    ) : (
                      <span aria-hidden className={cn('h-px w-12 bg-current opacity-40', accentText)} />
                    )}
                  </div>
                  {(pkg.description || editable) && (
                    <EditableText
                      as="p"
                      multiline
                      {...et(`packages.${idx}.description`, pkg.description)}
                      className="mt-2 whitespace-pre-line text-[15px] leading-[1.6] opacity-80 @md:text-base"
                      style={fb()}
                      placeholder="Para quem é este pacote"
                    />
                  )}
                  <FeatureList pkg={pkg} idx={idx} et={et} editable={editable} showIcons={!p.hide_icons} accentText={accentText} className="mt-6" />
                  <span aria-hidden className="min-h-4 flex-1" />
                  <span aria-hidden className={cn('mt-6 block h-px w-full', HAIRLINE)} />
                  <PackagePrice pkg={pkg} idx={idx} set={set} editable={editable} className={cn('mt-5', accentText)} />
                </div>
              </article>
            );
          })}
        </div>
        {!slice?.hideFooter && <PackagesFooter c={c} et={et} editable={editable} accent={accent} />}
      </div>
    </section>
  );
}

/** Item do cartão em arco: quantidade em destaque ao lado do rótulo; sem quantidade, só o rótulo. */
function ArchFeature({ feat, path, et, editable, accentText }: { feat: string; path: string; et: Et; editable: boolean; accentText: string }) {
  const split = splitLeadingNumber(feat);
  const base = et(path, feat);
  const labelCls = cn('text-[10px] @md:text-[11px] opacity-85', LABEL, 'tracking-[0.28em] leading-[1.7]');
  if (!split) {
    return <EditableText {...base} className={cn('mx-auto block max-w-[24ch] text-center', labelCls)} style={fb()} placeholder="Item incluso" />;
  }
  return (
    <div className="flex items-center justify-center gap-4">
      <EditableText
        editable={editable}
        value={split.num}
        onCommit={(v) => base.onCommit(v.trim() ? `${v.trim()} ${split.label}` : split.label)}
        className={cn('shrink-0 whitespace-nowrap text-[2.25rem] leading-none lining-nums', accentText)}
        style={fa()}
      />
      <EditableText
        editable={editable}
        value={split.label}
        onCommit={(v) => base.onCommit(`${split.num} ${v.trim()}`.trim())}
        // Medida fixa: "FOTOGRÁFICO" em caixa-alta espaçada cabe inteira (ch encolheria demais com o tracking)
        className={cn('min-w-0 max-w-[11rem] text-left', labelCls)}
        style={fb()}
      />
    </div>
  );
}

/** Cartões em Arco: sem foto; topo em arco, nome em serifa, itens "quantidade + rótulo" entre filetes. */
export function PricingArchCards({ content, data, props, slice }: { content?: any; data?: any; props?: any; slice?: PackageSlice }) {
  const { editable, et, set } = useEt();
  const c = content || data || {};
  const p = props || {};
  const packages: any[] = c.packages || [];
  const accent = accentOn(p);
  const itemLabel = c.item_label ?? 'Pacote';
  const style = cardStyleOf(p);
  const solid = style === 'solid';
  const accentText = cardAccent(style, p);

  return (
    <section className={sectionCls(p, slice)}>
      <div className="mx-auto max-w-[1050px]">
        {!slice?.hideHeader && <PackagesHeader c={c} et={et} editable={editable} accent={accent} sentence />}
        {slice?.lead}
        {packages.length === 0 && editable && emptyHint}
        <div className="pa-pkg-grid mt-12 [--pa-pkg-gap:1.25rem] @md:mt-14 @md:[--pa-pkg-gap:1.5rem]">
          {packages.map((pkg, idx) => {
            const featured = !!pkg.badge?.trim();
            const features: string[] = (pkg.features || []).filter((f: string) => editable || f?.trim());
            return (
              <div key={pkg.id || idx} className="relative flex pt-4">
                {featured && <Badge et={et} idx={idx} text={pkg.badge} className="absolute left-1/2 top-0 z-10 -translate-x-1/2" />}
                <article
                  className={cn(
                    'flex w-full flex-col items-center border px-6 pb-9 pt-14 text-center @md:px-8',
                    'rounded-b-[var(--pa-r-card,1.25rem)] rounded-t-[50%_4.5rem]',
                    solid
                      ? cn(CARD, featured ? cn(FEATURED_BORDER, 'shadow-[0_18px_50px_rgba(0,0,0,0.08)]') : 'border-[var(--pa-stone,#D9C8AE)]')
                      : lightCard(style, p, featured)
                  )}
                >
                  {(itemLabel || editable) && (
                    <EditableText
                      as="p"
                      {...et('item_label', itemLabel)}
                      className={cn('pl-[0.42em] text-[10px] opacity-60', LABEL, 'tracking-[0.42em]')}
                      style={fb()}
                      placeholder="Pacote"
                    />
                  )}
                  <EditableText
                    as="h3"
                    {...et(`packages.${idx}.name`, pkg.name)}
                    className={cn('mt-3 text-[length:clamp(2rem,4.2cqi,2.75rem)] leading-tight', featured && accentText)}
                    style={fd()}
                    placeholder="Nome do pacote"
                  />
                  <Rule className="mt-5 w-12 opacity-25" />
                  {(pkg.description || editable) && (
                    <EditableText
                      as="p"
                      multiline
                      {...et(`packages.${idx}.description`, pkg.description)}
                      className="mt-5 max-w-[24ch] whitespace-pre-line text-[15px] leading-[1.6] opacity-80"
                      style={fb()}
                      placeholder="Para quem é este pacote"
                    />
                  )}
                  {features.length > 0 && (
                    <ul className="mt-7 w-full">
                      {(pkg.features || []).map((feat: string, i: number) =>
                        !editable && !feat?.trim() ? null : (
                          <li key={i} className="relative py-4 first:pt-0">
                            {i > 0 && <span aria-hidden className={cn('absolute inset-x-0 top-0 h-px', HAIRLINE)} />}
                            <ArchFeature feat={feat} path={`packages.${idx}.features.${i}`} et={et} editable={editable} accentText={accentText} />
                          </li>
                        )
                      )}
                    </ul>
                  )}
                  <span aria-hidden className="min-h-6 flex-1" />
                  <Rule className="mt-6 w-32 opacity-20" />
                  <PackagePrice pkg={pkg} idx={idx} set={set} editable={editable} className="mt-6" />
                </article>
              </div>
            );
          })}
        </div>
        {!slice?.hideFooter && <PackagesFooter c={c} et={et} editable={editable} accent={accent} longRules={false} />}
      </div>
    </section>
  );
}

// ============================================================
// ADICIONAIS (AddonsBlock): extras avulsos com foto, descrição e preço.
// Cartões (3 por linha; a sobra preenche a linha ou fica centralizada) ou linhas com a foto alternando os lados.
// ============================================================

/** Grade de 6 colunas (4 no tablet): sobra de 2 ocupa a linha inteira; sobra de 1 fica centralizada. */
function addonSpan(idx: number, n: number) {
  const last = idx === n - 1;
  const rest = n % 3;
  return cn(
    '@md:col-span-2',
    last && n % 2 === 1 && '@md:col-start-2',
    rest === 2 && idx >= n - 2 && '@4xl:col-span-3',
    rest === 1 && last ? '@4xl:col-start-3' : '@4xl:col-start-auto'
  );
}

function AddonName({ et, idx, item, className }: { et: Et; idx: number; item: any; className?: string }) {
  // Tamanho pela largura do cartão (cqi): "FOTOGRÁFICO" em caixa-alta espaçada cabe inteira em 3 colunas.
  // leading depois do text-[length:…]: o tailwind-merge descarta o que vem antes.
  return (
    <div className="w-full [container-type:inline-size]">
      <EditableText
        as="h3"
        {...et(`items.${idx}.name`, item.name)}
        className={cn('pl-[0.2em] text-[length:clamp(1rem,7.5cqi,1.25rem)] uppercase leading-tight tracking-[0.2em]', className)}
        style={fd()}
        placeholder="Nome do adicional"
      />
    </div>
  );
}

function AddonDescription({ et, idx, item, editable, className }: { et: Et; idx: number; item: any; editable: boolean; className?: string }) {
  if (!item.description && !editable) return null;
  return (
    <EditableText
      as="p"
      multiline
      {...et(`items.${idx}.description`, item.description)}
      className={cn('whitespace-pre-line text-[15px] leading-[1.6] opacity-80', className)}
      style={fb()}
      placeholder="Descrição curta"
    />
  );
}

function AddonPhoto({
  item,
  idx,
  editable,
  set,
  className,
  imgClassName,
}: {
  item: any;
  idx: number;
  editable: boolean;
  set: (p: string, v: any) => void;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <EditableImage
        editable={editable}
        value={item.image_ref || null}
        label="Foto do adicional"
        alt={item.name || 'Adicional'}
        onCommit={(url) => set(`items.${idx}.image_ref`, url)}
        className="absolute inset-0 w-full h-full"
        imgClassName={cn('object-cover w-full h-full', imgClassName)}
        publicEmptyClassName="hidden"
      />
    </div>
  );
}

const ICON_DISC = cn(
  'flex h-12 w-12 items-center justify-center rounded-full shadow-[0_4px_18px_rgba(0,0,0,0.10)] @md:h-14 @md:w-14',
  CARD,
  ACCENT_TEXT
);
// Disco do ícone sobre o painel (cartão leve sem foto): contorno em vez de disco branco sobre o fundo da seção
const ICON_DISC_LIGHT =
  'flex h-12 w-12 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,currentColor_20%,transparent)] @md:h-14 @md:w-14';

type AddonsListProps = { c: any; p: any; et: Et; editable: boolean; set: (p: string, v: any) => void };

/** Cartões: foto no topo com o ícone num disco, painel arredondado sobre a foto, nome, filete, descrição e preço. */
function AddonsGrid({ c, p, et, editable, set }: AddonsListProps) {
  const items: any[] = c.items || [];
  const n = items.length;
  const style = cardStyleOf(p);
  const solid = style === 'solid';
  const accentText = cardAccent(style, p);
  return (
    <div className="mt-12 grid grid-cols-1 gap-5 @md:mt-14 @md:grid-cols-4 @md:gap-6 @4xl:grid-cols-6">
      {items.map((item, idx) => {
        const hasPhoto = !p.hide_images && (!!item.image_ref || editable);
        const wide = n % 3 === 2 && idx >= n - 2;
        const icon = p.hide_icons ? null : resolveIconKey(item.icon, addonIcon(item));
        // Sobre a foto o disco segue sólido (legível sobre qualquer imagem); sem foto, contorno nos cartões leves
        const discSolid = solid || hasPhoto;
        const disc = icon && (
          <span aria-hidden className={discSolid ? ICON_DISC : cn(ICON_DISC_LIGHT, accentText)}>
            <ProposalIcon name={icon} className="h-6 w-6" />
          </span>
        );
        return (
          <article
            key={item.id || idx}
            className={cn(
              'flex flex-col overflow-hidden rounded-[var(--pa-r-card,1.5rem)] border text-center',
              solid ? cn('shadow-[0_4px_30px_rgba(0,0,0,0.06)]', CARD, CARD_BORDER) : lightCard(style, p),
              addonSpan(idx, n)
            )}
          >
            {hasPhoto && (
              <div className="relative">
                <AddonPhoto item={item} idx={idx} editable={editable} set={set} className={cn('aspect-[4/3]', wide && '@4xl:aspect-[16/9]')} />
                {/* Disco sobre a foto, acima do painel que a sobrepõe */}
                {disc && <span className="absolute bottom-3 right-4 z-10">{disc}</span>}
              </div>
            )}
            <div
              className={cn(
                'relative flex flex-1 flex-col items-center px-6 pb-8 pt-7 @md:px-7',
                hasPhoto && (solid ? cn('-mt-5 rounded-t-[var(--pa-r-card,1.5rem)]', CARD) : PANEL_UNDER_PHOTO)
              )}
            >
              {!hasPhoto && disc && <span className="mb-5">{disc}</span>}
              <AddonName et={et} idx={idx} item={item} />
              <Rule className={cn('mt-4 w-12 opacity-50', accentText)} />
              <AddonDescription et={et} idx={idx} item={item} editable={editable} className="mt-4 max-w-[30ch]" />
              <span aria-hidden className="min-h-5 flex-1" />
              <FittedPrice
                value={item.price || ''}
                editable={editable}
                onCommit={(v) => set(`items.${idx}.price`, v)}
                className={cn('mt-5', accentText)}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

// Esmaecimento da foto para o lado do texto (no estreito, para baixo)
const fade = (dir: string) =>
  `[mask-image:linear-gradient(to_bottom,#000_70%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,#000_70%,transparent)] ${dir}`;
const ROW_FADE = {
  start: fade('@2xl:[mask-image:linear-gradient(to_right,#000_72%,transparent)] @2xl:[-webkit-mask-image:linear-gradient(to_right,#000_72%,transparent)]'),
  end: fade('@2xl:[mask-image:linear-gradient(to_left,#000_72%,transparent)] @2xl:[-webkit-mask-image:linear-gradient(to_left,#000_72%,transparent)]'),
};

/** Linhas: foto de um lado (alternando), nome + filete + descrição e o preço numa coluna separada por filete. */
function AddonsRows({ c, p, et, editable, set }: AddonsListProps) {
  const items: any[] = c.items || [];
  const style = cardStyleOf(p);
  const solid = style === 'solid';
  const accentText = cardAccent(style, p);
  return (
    <div className="mt-12 flex flex-col gap-4 @md:mt-14 @md:gap-5">
      {items.map((item, idx) => {
        const hasPhoto = !p.hide_images && (!!item.image_ref || editable);
        const flip = idx % 2 === 1;
        return (
          <article
            key={item.id || idx}
            className={cn(
              'grid overflow-hidden rounded-[var(--pa-r-card,1.5rem)] border text-left',
              solid ? cn('shadow-[0_4px_30px_rgba(0,0,0,0.06)]', CARD, CARD_BORDER) : lightCard(style, p),
              hasPhoto && (flip ? '@2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]' : '@2xl:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)]')
            )}
          >
            {hasPhoto && (
              <AddonPhoto
                item={item}
                idx={idx}
                editable={editable}
                set={set}
                className={cn('aspect-[16/9] @2xl:aspect-auto @2xl:min-h-[13rem]', flip && '@2xl:order-2')}
                imgClassName={flip ? ROW_FADE.end : ROW_FADE.start}
              />
            )}
            <div className="flex min-w-0 flex-col gap-6 p-6 @md:p-8 @4xl:flex-row @4xl:items-center @4xl:gap-0">
              <div className="min-w-0 flex-1 @4xl:pr-7">
                <AddonName et={et} idx={idx} item={item} />
                <Rule className={cn('mt-4 w-12 opacity-50', accentText)} />
                <AddonDescription et={et} idx={idx} item={item} editable={editable} className="mt-4 max-w-[40ch]" />
              </div>
              <span aria-hidden className={cn('block h-px w-full shrink-0 @4xl:h-20 @4xl:w-px', HAIRLINE)} />
              {/* Coluna de largura fixa: o preço ajusta o tamanho a ela (container), nunca a espreme */}
              <FittedPrice
                value={item.price || ''}
                editable={editable}
                onCommit={(v) => set(`items.${idx}.price`, v)}
                // Coluna dedicada: 22cqi ainda cabe "R$ 12.490,00" e deixa o preço comum perto do da referência
                size="text-[length:clamp(2.25rem,22cqi,3.6rem)]"
                className={cn('@4xl:w-[14rem] @4xl:shrink-0 @4xl:pl-7 @4xl:text-center', accentText)}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function AddonsRenderer({ content, data, props }: { content?: any; data?: any; props?: any }) {
  const { editable, et, set } = useEt();
  const c = content || data || {};
  const p = props || {};
  const accent = accentOn(p);
  const rows = p.variant === 'rows';
  const List = rows ? AddonsRows : AddonsGrid;

  return (
    <section className={sectionCls(p)}>
      <div className={cn('mx-auto', rows ? 'max-w-[1000px]' : 'max-w-[1100px]')}>
        <PackagesHeader c={c} et={et} editable={editable} accent={accent} inline />
        {!(c.items || []).length && editable && (
          <p className="mt-12 rounded-2xl border border-dashed border-[color:color-mix(in_srgb,currentColor_25%,transparent)] p-8 text-center text-sm opacity-60">
            Adicione os adicionais no painel.
          </p>
        )}
        <List c={c} p={p} et={et} editable={editable} set={set} />
        <HighlightsStrip className="mt-14 @md:mt-16" items={c.highlights ?? []} et={et} editable={editable} />
      </div>
    </section>
  );
}
