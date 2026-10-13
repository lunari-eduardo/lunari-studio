import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditableText } from '../../../blocks/EditableText';
import { EditableImage } from '../../../blocks/EditableImage';
import { useInlineEdit } from '../../../blocks/inlineContext';
import { fd, fb, alignClass, sectionBg, textColorClass } from './helpers';
import { infoIcon, resolveIconKey } from '../../../blocks/icons';
import { LABEL, ProposalIcon, SubsectionHeader, accentOn } from './kit';

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
    fieldKey: path.includes('.') ? undefined : path, // tamanho ajustável por clique (campos de topo)
  });

  const c = content || {};
  const p = props || {};
  const variant = p.variant || 'stacked';
  const items: any[] = c.items || [];
  const filled = (it: any) => !!(it?.title?.trim() || it?.body?.trim());
  const hasBanner = !!c.image_url || editable;

  // Público: seção sem nada preenchido some por inteiro
  if (!editable && !items.some(filled) && !c.title?.trim() && !c.image_url) return null;
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
  } else {
    list = (
      <div
        className={cn(
          variant === 'columns' ? 'grid grid-cols-1 @2xl:grid-cols-2 gap-x-12 gap-y-12' : 'flex flex-col gap-12 @md:gap-14'
        )}
      >
        {items.map((it, i) =>
          !editable && !filled(it) ? null : (
            <article key={it.id || i}>
              {itemTitle(it, i)}
              {itemBody(it, i, 'mt-3')}
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
      <div className={cn('mx-auto', variant === 'columns' ? 'max-w-[960px]' : 'max-w-[760px]')}>
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
