import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditableText } from '../../../blocks/EditableText';
import { EditableImage } from '../../../blocks/EditableImage';
import { useInlineEdit } from '../../../blocks/inlineContext';
import { fa, fd, fb, fh, alignClass, sectionBg, textColorClass } from './helpers';
import { infoIcon, resolveIconKey } from '../../../blocks/icons';
import { resolveFieldInfo } from '../../../blocks/textFields';
import { LABEL, ProposalIcon, Rule, SubsectionHeader, accentOn } from './kit';

/**
 * Informações e Guia — pares título/texto (dicas, o que vestir, pagamento, prazos).
 * - stacked: guia impresso (título em caixa-alta colado ao texto, banner opcional no topo)
 * - accordion: <details> nativo; títulos visíveis e texto sob demanda (textos longos)
 * - columns: duas colunas a partir de @2xl (textos curtos)
 */
export function InfoRenderer({ content, props }: { content?: any; props?: any }) {
  const inline = useInlineEdit();
  const editable = inline?.editable ?? false;
  const et = (path: string, value: string | undefined) => ({
    editable,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
    fieldKey: resolveFieldInfo(path).fieldKey,
  });

  const c = content || {};
  const p = props || {};
  const variant = p.variant || 'stacked';
  const items: any[] = c.items || [];
  const filled = (it: any) => !!(it?.title?.trim() || it?.body?.trim());
  const editorial = variant === 'icon-list' || variant === 'steps';
  const hasBanner = !!c.image_url || editable;

  // Público: seção sem nada preenchido some por inteiro
  if (!editable && !items.some(filled) && !c.title?.trim() && !c.image_url && !(editorial && (c.note_title?.trim() || c.note_body?.trim()))) return null;
  if (editorial) return <InfoEditorial c={c} p={p} et={et} editable={editable} filled={filled} steps={variant === 'steps'} setPhoto={(url) => inline?.set('image_url', url)} />;
  if (variant === 'icon-columns') return <InfoIconColumns c={c} p={p} et={et} editable={editable} filled={filled} />;

  const headAlign = p.align === 'center' ? 'text-center' : p.align === 'right' ? 'text-right' : 'text-left';
  // Justificado só a partir de @md: no celular cria "rios" entre as palavras
  const bodyAlign = p.align === 'justify' ? 'text-left @md:text-justify' : alignClass(p.align, 'left');

  const itemTitle = (it: any, i: number) => (
    <EditableText
      as="h3"
      {...et(`items.${i}.title`, it.title)}
      className={cn('text-[length:clamp(1.25rem,3.2cqi,1.75rem)] leading-[1.2] tracking-[0.14em] uppercase', headAlign)}
      style={fd()}
      placeholder="Título"
    />
  );
  const itemBody = (it: any, i: number, className?: string) => (
    <EditableText
      as="div"
      {...et(`items.${i}.body`, it.body)}
      multiline
      className={cn(
        'text-[16px] @md:text-[17px] leading-[1.65] tracking-[0.02em] whitespace-pre-line hyphens-auto opacity-80',
        bodyAlign,
        className
      )}
      style={fb()}
      placeholder="Texto"
    />
  );

  let list: React.ReactNode;
  if (variant === 'accordion') {
    list = (
      <div className="border-t border-[var(--pa-stone,#D0C8BC)]">
        {items.map((it, i) =>
          !editable && !filled(it) ? null : (
            // No editor fica sempre aberto (e o clique não fecha) para editar o texto
            <details key={it.id || i} open={editable || undefined} className="group border-b border-[var(--pa-stone,#D0C8BC)]">
              <summary
                className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 @md:py-6 [&::-webkit-details-marker]:hidden"
                onClick={editable ? (e) => e.preventDefault() : undefined}
              >
                {itemTitle(it, i)}
                <Plus aria-hidden className="h-4 w-4 shrink-0 opacity-60 transition-transform group-open:rotate-45" strokeWidth={1.25} />
              </summary>
              {itemBody(it, i, 'pb-6 @md:pb-8')}
            </details>
          )
        )}
      </div>
    );
  } else if (variant === 'columns') {
    const accent = accentOn(p);
    list = (
      <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-x-12 gap-y-10 @md:gap-y-12">
        {items.map((it, i) =>
          !editable && !filled(it) ? null : (
            <article
              key={it.id || i}
              className="border-t border-[color:color-mix(in_srgb,currentColor_14%,transparent)] pt-6"
            >
              <span
                aria-hidden
                className={cn('mb-2.5 block text-[11px] tracking-[0.28em] opacity-75 lining-nums', accent, headAlign)}
                style={fa()}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              {itemTitle(it, i)}
              {itemBody(it, i, 'mt-3')}
            </article>
          )
        )}
      </div>
    );
  } else {
    const accent = accentOn(p);
    list = (
      <div className="flex flex-col">
        {items.map((it, i) =>
          !editable && !filled(it) ? null : (
            <article
              key={it.id || i}
              className="border-t border-[color:color-mix(in_srgb,currentColor_14%,transparent)] py-7 @md:py-9 last:border-b @2xl:grid @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.65fr)] @2xl:gap-12 @2xl:items-baseline"
            >
              <div className="min-w-0">
                <span
                  aria-hidden
                  className={cn('mb-2 block text-[11px] tracking-[0.28em] opacity-75 lining-nums', accent, headAlign)}
                  style={fa()}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {itemTitle(it, i)}
              </div>
              {itemBody(it, i, 'mt-3 @2xl:mt-0')}
            </article>
          )
        )}
      </div>
    );
  }

  return (
    <section
      className={cn(
        'py-16 @md:py-24 px-6 @md:px-14',
        sectionBg(p.background, 'white'),
        textColorClass(p.text_color, p.background, 'white')
      )}
    >
      <div className={cn('mx-auto', variant === 'accordion' ? 'max-w-[780px]' : 'max-w-[960px]')}>
        {hasBanner && (
          <div className="relative mb-12 @md:mb-16 aspect-[4/3] @md:aspect-[21/9] w-full overflow-hidden rounded-[var(--pa-r-media,0px)]">
            <EditableImage
              editable={editable}
              value={c.image_url || null}
              label="Imagem de abertura"
              alt={c.title || 'Imagem'}
              onCommit={(url) => inline?.set('image_url', url)}
              className="absolute inset-0 w-full h-full"
              imgClassName="object-cover w-full h-full"
              publicEmptyClassName="hidden"
            />
          </div>
        )}
        <EditableText
          as="p"
          {...et('eyebrow', c.eyebrow)}
          className={cn('mb-4 text-[11px] @md:text-xs tracking-[0.32em] uppercase opacity-60', headAlign)}
          style={fb()}
          placeholder="Rótulo (opcional)"
        />
        <EditableText
          as="h2"
          {...et('title', c.title)}
          className={cn('mb-10 @md:mb-14 text-[length:clamp(1.75rem,4.5cqi,2.75rem)] leading-[1.15] tracking-[0.06em]', headAlign)}
          style={fd()}
          placeholder="Título da seção (opcional)"
        />
        {list}
      </div>
    </section>
  );
}

// Até 4 lado a lado no desktop (com filete vertical entre elas), 2 no tablet, 1 no celular
const ICON_COLS: Record<number, string> = { 1: '', 2: '@md:grid-cols-2', 3: '@md:grid-cols-2 @4xl:grid-cols-3', 4: '@md:grid-cols-2 @4xl:grid-cols-4' };

/** Colunas com ícone (orientações de looks): ícone num disco suave, título em caixa-alta e texto curto. */
function InfoIconColumns({
  c,
  p,
  et,
  editable,
  filled,
}: {
  c: any;
  p: any;
  et: (path: string, value: string | undefined) => any;
  editable: boolean;
  filled: (it: any) => boolean;
}) {
  const items = ((c.items as any[]) || []).map((it, i) => ({ it, i })).filter(({ it }) => editable || filled(it));
  const accent = accentOn(p);
  const perRow = Math.min(items.length, 4) || 1; // colunas no desktop
  return (
    <section className={cn('px-5 py-10 @md:px-10 @md:py-12', sectionBg(p.background, 'white'), textColorClass(p.text_color, p.background, 'white'))}>
      <div className="mx-auto max-w-[1000px]">
        <SubsectionHeader et={et} editable={editable} title={c.title} titlePlaceholder="Algumas orientações" />
        <div className={cn('mt-10 grid grid-cols-1 gap-y-10 @md:mt-12', ICON_COLS[Math.min(items.length, 4)] ?? ICON_COLS[4])}>
          {items.map(({ it, i }, n) => {
            const icon = resolveIconKey(it.icon, infoIcon(it));
            // Filete vertical (e recuo) só entre colunas lado a lado; o início de cada linha alinha com o título
            const ruleMd = n % 2 === 1;
            const rule4xl = perRow > 2 ? n % perRow !== 0 : ruleMd;
            return (
              <article
                key={it.id || i}
                className={cn(
                  'min-w-0 border-[color:color-mix(in_srgb,currentColor_14%,transparent)] @md:pr-6',
                  ruleMd && '@md:border-l @md:pl-6',
                  ruleMd && !rule4xl && '@4xl:border-l-0 @4xl:pl-0',
                  !ruleMd && rule4xl && '@4xl:border-l @4xl:pl-6'
                )}
              >
                {icon && (
                  <span
                    aria-hidden
                    className={cn('mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,currentColor_9%,transparent)]', accent)}
                  >
                    <ProposalIcon name={icon} className="h-6 w-6" />
                  </span>
                )}
                <EditableText
                  as="h3"
                  {...et(`items.${i}.title`, it.title)}
                  className={cn('pl-[0.2em] text-[11px] @md:text-xs', LABEL, 'tracking-[0.2em] leading-[1.7]')}
                  style={fd()}
                  placeholder="Orientação"
                />
                <EditableText
                  as="div"
                  multiline
                  {...et(`items.${i}.body`, it.body)}
                  className="mt-3 whitespace-pre-line text-[14px] leading-[1.6] opacity-80"
                  style={fb()}
                  placeholder="Texto curto"
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Foto do cabeçalho: no estreito, faixa acima do texto esmaecendo para baixo; ao lado, esmaece para a esquerda
const HEADER_FADE = cn(
  '[mask-image:linear-gradient(to_bottom,#000_55%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,#000_55%,transparent)]',
  '@2xl:[mask-image:linear-gradient(to_right,transparent,#000_40%)] @2xl:[-webkit-mask-image:linear-gradient(to_right,transparent,#000_40%)]'
);

const TINT = 'bg-[color:color-mix(in_srgb,var(--pa-accent,#A67C52)_13%,transparent)]';
const HAIR = 'border-[color:color-mix(in_srgb,currentColor_13%,transparent)]';

/**
 * Informações editoriais (coleção): cabeçalho com título + itálico, frase em caixa-alta e foto
 * opcional; depois a lista com ícones (icon-list) ou as etapas numeradas (steps) e o aviso final.
 * Sem título, rótulo e frase (lista de continuação, ex.: pagamento após as etapas), o cabeçalho some.
 */
function InfoEditorial({
  c,
  p,
  et,
  editable,
  filled,
  steps,
  setPhoto,
}: {
  c: any;
  p: any;
  et: (path: string, value: string | undefined) => any;
  editable: boolean;
  filled: (it: any) => boolean;
  steps: boolean;
  setPhoto: (url: string) => void;
}) {
  const accent = accentOn(p);
  const items = ((c.items as any[]) || []).map((it, i) => ({ it, i })).filter(({ it }) => editable || filled(it));
  const photo = c.image_url || null;
  const hasHeader = !!(c.title?.trim() || c.title_italic?.trim() || c.subtitle?.trim() || c.eyebrow?.trim() || photo);
  const showHeader = hasHeader || editable;
  // Espaço da foto no editor só com cabeçalho preenchido: numa lista de continuação ficaria sobre os itens
  const showPhoto = !!photo || (editable && !!(c.title?.trim() || c.title_italic?.trim()));
  const hasNote = !!(c.note_title?.trim() || c.note_body?.trim());
  const noteIcon = resolveIconKey(c.note_icon, 'sparkles');

  return (
    <section
      className={cn(
        'relative overflow-hidden px-5 pb-14 @md:px-10 @md:pb-20',
        showHeader ? 'pt-14 @md:pt-20' : 'pt-4',
        sectionBg(p.background, 'white'),
        textColorClass(p.text_color, p.background, 'white')
      )}
    >
      {showPhoto && (
        <div className="relative -mx-5 -mt-14 mb-10 aspect-[16/9] @md:-mx-10 @md:-mt-20 @2xl:absolute @2xl:right-0 @2xl:top-0 @2xl:m-0 @2xl:aspect-auto @2xl:h-[24rem] @2xl:w-[46%]">
          <EditableImage
            editable={editable}
            value={photo}
            label="Foto do cabeçalho"
            alt={c.title || 'Foto'}
            onCommit={setPhoto}
            className="absolute inset-0 w-full h-full"
            imgClassName={cn('object-cover w-full h-full', HEADER_FADE)}
            publicEmptyClassName="hidden"
          />
        </div>
      )}
      <div className="relative mx-auto max-w-[860px]">
        {showHeader && (
          // Com foto ao lado, o cabeçalho ocupa ao menos a altura dela (24rem - respiro do topo): a lista nunca sobe para baixo da foto
          <header className={cn('flex flex-col items-start', showPhoto && '@2xl:min-h-[19rem] @2xl:max-w-[56%]')}>
            {(c.eyebrow || editable) && (
              <div className={cn('mb-5 flex items-center gap-4', accent)}>
                <EditableText as="p" {...et('eyebrow', c.eyebrow)} className="text-lg leading-none @md:text-xl" style={fa()} placeholder="Rótulo (opcional)" />
                <Rule className="w-16 opacity-60 @md:w-20" />
              </div>
            )}
            <h2 className="max-w-full text-[length:clamp(2.6rem,7cqi,4.5rem)] leading-[1.04] tracking-[-0.01em]" style={fd()}>
              <EditableText {...et('title', c.title)} placeholder="Título (opcional)" />
              {(c.title_italic || editable) && (
                <em className={cn('block', accent)} style={fh()}>
                  <EditableText {...et('title_italic', c.title_italic)} placeholder="em itálico (opcional)" />
                </em>
              )}
            </h2>
            {(c.subtitle || editable) && (
              <EditableText
                as="p"
                multiline
                {...et('subtitle', c.subtitle)}
                className={cn('mt-6 max-w-[26rem] whitespace-pre-line text-[11px] opacity-80 @md:text-xs', LABEL, 'tracking-[0.36em]')}
                style={fb()}
                placeholder="Frase de apoio (opcional)"
              />
            )}
          </header>
        )}

        {steps && (c.list_title || editable) && (
          <EditableText
            as="h3"
            {...et('list_title', c.list_title)}
            className="mt-12 max-w-full text-[length:clamp(1rem,2.2cqi,1.3rem)] uppercase leading-[1.5] tracking-[0.28em] @md:mt-16"
            style={fd()}
            placeholder="Como funciona"
          />
        )}

        {steps ? (
          <ol className="mt-8">
            {items.map(({ it, i }, n) => (
              <li key={it.id || i} className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-x-5 pb-7 last:pb-0 @md:grid-cols-[3.5rem_minmax(0,1fr)] @md:gap-x-6">
                {/* Linha entre as etapas, do disco até o próximo */}
                {n < items.length - 1 && <span aria-hidden className="absolute bottom-0 left-6 top-12 w-px bg-current opacity-25 @md:left-7 @md:top-14" />}
                <span className={cn('flex h-12 w-12 items-center justify-center rounded-full text-xl leading-none lining-nums @md:h-14 @md:w-14 @md:text-2xl', TINT, accent)} style={fa()}>
                  {String(n + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 pt-2 @md:pt-3">
                  <EditableText
                    as="h4"
                    {...et(`items.${i}.title`, it.title)}
                    className={cn('pl-[0.2em] text-[11px] @md:text-xs', LABEL, 'tracking-[0.2em] leading-[1.7]')}
                    style={fd()}
                    placeholder="Etapa"
                  />
                  <EditableText
                    as="div"
                    multiline
                    {...et(`items.${i}.body`, it.body)}
                    className="mt-1 whitespace-pre-line text-[14px] leading-[1.6] opacity-80 @md:text-[15px]"
                    style={fb()}
                    placeholder="Texto curto"
                  />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <ul className={cn(showHeader && 'mt-10 @md:mt-12')}>
            {items.map(({ it, i }, n) => {
              const icon = resolveIconKey(it.icon, infoIcon(it));
              return (
                <li
                  key={it.id || i}
                  className={cn('grid grid-cols-[3rem_minmax(0,1fr)] gap-x-5 py-7 @md:grid-cols-[3.5rem_minmax(0,1fr)] @md:gap-x-8', n > 0 && cn('border-t', HAIR))}
                >
                  <span aria-hidden className={cn('flex h-12 w-12 items-center justify-center rounded-full @md:h-14 @md:w-14', icon && TINT, accent)}>
                    {icon && <ProposalIcon name={icon} className="h-6 w-6" />}
                  </span>
                  <div className="min-w-0 @md:pt-1">
                    <EditableText
                      as="h3"
                      {...et(`items.${i}.title`, it.title)}
                      className={cn('pl-[0.24em] text-xs @md:text-[13px]', LABEL, 'tracking-[0.24em] leading-[1.7]')}
                      style={fd()}
                      placeholder="Título"
                    />
                    <EditableText
                      as="div"
                      multiline
                      {...et(`items.${i}.body`, it.body)}
                      className="mt-1.5 max-w-[56ch] whitespace-pre-line text-[15px] leading-[1.6] opacity-80"
                      style={fb()}
                      placeholder="Texto"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {(hasNote || editable) && (
          <aside className="mt-10 flex items-center gap-5 rounded-2xl bg-[var(--pa-linen,#E9DFD0)] px-5 py-5 text-[var(--pa-on-linen,#1F2620)] @md:mt-12 @md:gap-7 @md:px-8">
            {noteIcon && <ProposalIcon name={noteIcon} className="h-7 w-7 shrink-0 text-[var(--pa-accent-on-white,#A67C52)]" />}
            {noteIcon && <span aria-hidden className={cn('h-12 w-px shrink-0 bg-current opacity-20')} />}
            <div className="min-w-0">
              <EditableText
                as="p"
                {...et('note_title', c.note_title)}
                className={cn('pl-[0.24em] text-[11px] @md:text-xs', LABEL, 'tracking-[0.24em] leading-[1.7]')}
                style={fd()}
                placeholder="Aviso final (opcional)"
              />
              <EditableText
                as="div"
                multiline
                {...et('note_body', c.note_body)}
                className="mt-1 whitespace-pre-line text-[13px] leading-[1.6] opacity-80 @md:text-sm"
                style={fb()}
                placeholder="Texto do aviso"
              />
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
