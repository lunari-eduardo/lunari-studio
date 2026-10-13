import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { EditableText } from '../../../blocks/EditableText';
import { InlineEditContext, useInlineEdit } from '../../../blocks/inlineContext';
import { resolveIconKey } from '../../../blocks/icons';
import type { PackageGroup } from '../../../blocks/pricing';
import { fb, fd } from './helpers';
import { Flanked, LABEL, ProposalIcon, Rule, accentOn, useEt } from './kit';

// ============================================================
// GRUPOS DE PACOTES: cabeçalho do grupo (3 composições) e o escopo de edição das páginas.
// A PricingTable renderiza cada página (pacotes sem grupo / cada grupo) com a variante escolhida;
// aqui ficam só as peças que dependem de `groups`. Sem import das variantes (evita ciclo).
// ============================================================

/**
 * Cada página renderiza uma fatia de `packages` (índices locais 0..n). O provider devolve o
 * caminho real (`packages.N.name` → índice global) para a edição inline e o upload de foto.
 */
export function PathScope({ idxs, children }: { idxs: number[]; children: React.ReactNode }) {
  const inline = useInlineEdit();
  const key = idxs.join(',');
  const value = useMemo(
    () =>
      inline && {
        ...inline,
        set: (path: string, v: any) =>
          inline.set(path.replace(/^packages\.(\d+)\./, (_, i) => `packages.${idxs[Number(i)] ?? i}.`), v),
      },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` resume `idxs`
    [inline, key]
  );
  return <InlineEditContext.Provider value={value}>{children}</InlineEditContext.Provider>;
}

type TextKey = 'title' | 'subtitle' | 'period' | 'note' | 'price_note';

const HAIRLINE = 'border-[color:color-mix(in_srgb,currentColor_14%,transparent)]';

/** Título, subtítulo, período, texto explicativo e observação do grupo; ícone opcional. */
export function PackageGroupHeader({
  group,
  index,
  props,
  newPage,
  className,
}: {
  group: PackageGroup;
  /** Posição em `content.groups` (caminho da edição inline). */
  index: number;
  props: any;
  /** Começa uma página própria: no editor, mostra o marcador. */
  newPage: boolean;
  className?: string;
}) {
  const { editable, et } = useEt();
  const accent = accentOn(props);
  const composition = group.composition ?? 'editorial';
  const iconKey = composition === 'divider' ? null : resolveIconKey(group.icon);

  // Texto editável do grupo; vazio some na proposta e continua clicável no editor
  const txt = (
    key: TextKey,
    cls: string,
    placeholder: string,
    { as = 'span', multiline = false, style = fb() }: { as?: keyof React.JSX.IntrinsicElements; multiline?: boolean; style?: React.CSSProperties } = {}
  ) =>
    (group[key] || editable) && (
      <EditableText as={as} multiline={multiline} {...et(`groups.${index}.${key}`, group[key])} className={cls} style={style} placeholder={placeholder} />
    );

  const note = txt('note', 'mt-6 max-w-[52ch] whitespace-pre-line text-[14px] leading-[1.7] opacity-80', 'Texto explicativo (opcional)', { as: 'p', multiline: true });
  const priceNote = txt('price_note', 'mt-3 max-w-[52ch] whitespace-pre-line text-[13px] italic leading-[1.6] opacity-70', 'Observação sobre os preços (opcional)', { as: 'p', multiline: true });
  const marker = editable && newPage && (
    <p aria-hidden className="mb-6 text-center text-[10px] uppercase tracking-[0.3em] opacity-50">
      Nova página
    </p>
  );

  if (composition === 'divider') {
    const meta = (group.subtitle || group.period || editable) && (
      <p className="mt-3 flex flex-wrap items-baseline justify-center gap-x-4 text-center text-[12px] opacity-75" style={fb()}>
        {txt('subtitle', '', 'Subtítulo')}
        {txt('period', cn('uppercase tracking-[0.2em]', accent), 'Período')}
      </p>
    );
    return (
      <header className={cn('mx-auto w-full', className)}>
        {marker}
        <div className="flex items-center gap-4 @md:gap-6">
          <span aria-hidden className="h-px flex-1 bg-current opacity-30" />
          {txt('title', 'max-w-[80%] shrink-0 text-center text-[11px] @md:text-xs uppercase leading-[1.9] tracking-[0.32em]', 'Título do grupo', { as: 'h3', style: fd() })}
          <span aria-hidden className="h-px flex-1 bg-current opacity-30" />
        </div>
        {meta}
        <div className="flex flex-col items-center text-center [&>p]:mt-3">
          {note}
          {priceNote}
        </div>
      </header>
    );
  }

  if (composition === 'banner') {
    return (
      <header className={cn('w-full', className)}>
        {marker}
        <div className={cn('rounded-2xl border bg-[color:color-mix(in_srgb,currentColor_5%,transparent)] px-6 py-6 @md:px-9 @md:py-8', HAIRLINE)}>
          <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-start @2xl:justify-between @2xl:gap-8">
            <div className="flex min-w-0 items-start gap-4">
              {iconKey && <ProposalIcon name={iconKey} className={cn('mt-1 h-7 w-7', accent)} />}
              <div className="min-w-0">
                {txt('title', 'block max-w-full text-[length:clamp(1.5rem,4cqi,2.25rem)] leading-[1.15]', 'Título do grupo', { as: 'h3', style: fd() })}
                {txt('subtitle', 'mt-2 block text-[15px] leading-[1.6] opacity-80', 'Subtítulo (opcional)', { as: 'p' })}
              </div>
            </div>
            {txt(
              'period',
              cn('shrink-0 self-start rounded-full border px-4 py-1.5 text-[10px] uppercase tracking-[0.3em]', 'border-[color:color-mix(in_srgb,currentColor_40%,transparent)]', accent),
              'Período'
            )}
          </div>
          <div className="[&>p]:max-w-none">
            {note}
            {priceNote}
          </div>
        </div>
      </header>
    );
  }

  // editorial: período entre filetes, título em fonte de exibição, filete curto e avisos
  return (
    <header className={cn('mx-auto flex max-w-[46rem] flex-col items-center text-center', className)}>
      {marker}
      {iconKey && <ProposalIcon name={iconKey} className={cn('mb-5 h-7 w-7', accent)} />}
      {(group.period || editable) && (
        <Flanked className={cn('mb-5', accent)}>
          {txt('period', cn('pl-[0.32em] text-[11px] @md:text-xs', LABEL), 'Período')}
        </Flanked>
      )}
      {txt('title', 'max-w-full text-[length:clamp(1.9rem,6cqi,3.25rem)] leading-[1.08] tracking-[-0.005em]', 'Título do grupo', { as: 'h3', style: fd() })}
      {txt('subtitle', 'mt-3 text-[15px] leading-[1.6] opacity-80 @md:text-[17px]', 'Subtítulo (opcional)', { as: 'p' })}
      <Rule className={cn('mt-6 w-12 opacity-60', accent)} />
      {note}
      {priceNote}
    </header>
  );
}
