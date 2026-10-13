import React from 'react';
import { cn } from '@/lib/utils';
import { EditableText } from '../../../blocks/EditableText';
import { EditableImage } from '../../../blocks/EditableImage';
import { PROPOSAL_ICONS, resolveIconKey } from '../../../blocks/icons';
import { splitPrice } from '../../../blocks/pricing';
import { useInlineEdit } from '../../../blocks/inlineContext';
import { fa, fb, fd, fh, fsc } from './helpers';

// ============================================================
// KIT EDITORIAL COMPARTILHADO
// Peças pequenas das variantes editoriais (Coleção Natal e futuras):
// rótulo espaçado, filete com estrela, título em dois tempos, foto
// recortada por máscara, faixa de destaques e ícone do catálogo.
// Só container queries: a moldura "Celular" do editor = celular real.
// ============================================================

/** Props do EditableText montadas pelo bloco: et(path, value). */
export type EtProps = { editable: boolean; value: string; onCommit: (v: string) => void; fieldKey?: string };
export type Et = (path: string, value: string | undefined) => EtProps;

/** Edição na arte: `et(path, value)` monta o EditableText; `set` grava qualquer caminho do bloco. */
export function useEt() {
  const inline = useInlineEdit();
  const editable = inline?.editable ?? false;
  const et: Et = (path, value) => ({
    editable,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
    fieldKey: path.includes('.') ? undefined : path, // tamanho ajustável por clique (campos de topo)
  });
  return { editable, et, set: (path: string, value: any) => inline?.set(path, value) };
}

/**
 * Cabeçalho de subseção (guia de estilo: paleta, inspirações, orientações): filete no topo,
 * título em caixa-alta espaçada à esquerda e nota curta à direita (embaixo, no estreito).
 */
export function SubsectionHeader({
  et,
  editable,
  title,
  note,
  notePath,
  titlePlaceholder = 'Título',
}: {
  et: Et;
  editable: boolean;
  title?: string;
  note?: string;
  /** Sem caminho = sem nota. */
  notePath?: string;
  titlePlaceholder?: string;
}) {
  return (
    <header className="flex flex-col gap-3 border-t border-[color:color-mix(in_srgb,currentColor_14%,transparent)] pt-8 @md:pt-10 @2xl:flex-row @2xl:items-start @2xl:justify-between @2xl:gap-12">
      <EditableText
        as="h2"
        {...et('title', title)}
        className="max-w-full text-[length:clamp(1.05rem,2.4cqi,1.4rem)] uppercase leading-[1.5] tracking-[0.3em]"
        style={fd()}
        placeholder={titlePlaceholder}
      />
      {notePath && (note || editable) && (
        <EditableText
          as="p"
          multiline
          {...et(notePath, note)}
          className="max-w-[46ch] whitespace-pre-line text-[13px] leading-[1.6] opacity-75 @2xl:pt-1 @2xl:text-right"
          style={fb()}
          placeholder="Nota curta (opcional)"
        />
      )}
    </header>
  );
}

/** Caixa-alta espaçada. Centralizado, some com `pl-[0.32em]` o espaço extra da última letra. */
export const LABEL = 'uppercase tracking-[0.32em] leading-[1.9]';

/** Acento do tema nos títulos/filetes só sobre fundo claro e sem cor de texto escolhida. */
export function accentOn(props: any): string {
  const light = ['white', 'cream', 'linen'].includes(props?.background ?? 'white');
  return light && (!props?.text_color || props.text_color === 'default') ? 'text-[var(--pa-accent-on-white,#A67C52)]' : '';
}

/** Estrela de 4 pontas (✦): o único ornamento do kit. */
export function Sparkle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('shrink-0', className)} style={style} fill="currentColor">
      <path d="M12 0c.6 7 4.9 11.4 12 12-7.1.6-11.4 4.9-12 12-.6-7.1-5-11.4-12-12C7 11.4 11.4 7 12 0Z" />
    </svg>
  );
}

/** Filete curto, ou longo com a estrela ao centro. */
export function Rule({ star = false, className }: { star?: boolean; className?: string }) {
  if (!star) return <span aria-hidden className={cn('block h-px w-12 bg-current', className)} />;
  return (
    <span aria-hidden className={cn('flex w-full max-w-[22rem] items-center gap-3', className)}>
      <span className="h-px flex-1 bg-current opacity-70" />
      <Sparkle className="h-3.5 w-3.5 @md:h-4 @md:w-4" />
      <span className="h-px flex-1 bg-current opacity-70" />
    </span>
  );
}

/** Rótulo entre dois filetes ("—— FOTOGRAFIA ——"). */
export function Flanked({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-3 @md:gap-4', className)}>
      <span aria-hidden className="h-px w-8 shrink-0 bg-current opacity-40 @md:w-14" />
      {children}
      <span aria-hidden className="h-px w-8 shrink-0 bg-current opacity-40 @md:w-14" />
    </div>
  );
}

export type TitleStyle = 'script' | 'italic' | 'caps';

// Tamanhos fluidos pela largura do documento; o popover de tamanho ainda vale (fieldKey)
const WORD: Record<TitleStyle, { className: string; style: () => React.CSSProperties }> = {
  script: { className: 'text-[length:clamp(4.25rem,21cqi,12rem)] leading-[1.1]', style: fsc },
  italic: { className: 'text-[length:clamp(3.5rem,14cqi,8rem)] leading-[1.05]', style: fh },
  caps: { className: 'text-[length:clamp(3.25rem,15cqi,8.5rem)] uppercase tracking-[0.04em] leading-[1.05]', style: fd },
};

/**
 * Título em dois tempos: linha de abertura em caixa-alta espaçada ("SESSÕES DE") e a
 * palavra em destaque ("Natal"), caligráfica, itálica ou em caixa-alta.
 * `between` entra entre as duas (ex.: filete com estrela da capa Medalhão).
 */
export function TitleLockup({
  lead,
  word,
  wordStyle,
  et,
  between,
  className,
}: {
  lead?: string;
  word?: string;
  wordStyle?: TitleStyle;
  et: Et;
  between?: React.ReactNode;
  className?: string;
}) {
  const w = WORD[wordStyle ?? 'script'] ?? WORD.script;
  return (
    <h1 className={cn('flex flex-col items-center text-center', className)}>
      <EditableText
        {...et('title', lead)}
        className="block pl-[0.3em] text-[length:clamp(1rem,4.2cqi,2.35rem)] uppercase leading-tight tracking-[0.3em]"
        style={fd()}
        placeholder="Sessões de"
      />
      {between}
      <EditableText {...et('title_italic', word)} className={cn('block', w.className)} style={w.style()} placeholder="Natal" />
    </h1>
  );
}

export type MediaShape = 'arch' | 'circle' | 'soft';

const SHAPE: Record<MediaShape, string> = {
  arch: 'rounded-t-full',
  circle: 'rounded-full',
  soft: 'rounded-[var(--pa-r-media,1rem)]',
};

// Máscara (não degradê por cima): funciona sobre qualquer fundo e nunca encobre texto
const FADE_BOTTOM: React.CSSProperties = {
  maskImage: 'linear-gradient(to bottom, #000 62%, transparent 100%)',
  WebkitMaskImage: 'linear-gradient(to bottom, #000 62%, transparent 100%)',
};

/** Foto recortada em arco, círculo ou retângulo suave; o tamanho vem do chamador (aspect-ratio). */
export function ShapedMedia({
  shape,
  fadeBottom = false,
  className,
  value,
  onCommit,
  editable,
  label,
  alt,
}: {
  shape: MediaShape;
  fadeBottom?: boolean;
  className?: string;
  value?: string | null;
  onCommit: (url: string) => void;
  editable: boolean;
  label: string;
  alt: string;
}) {
  return (
    <div className={cn('relative overflow-hidden', SHAPE[shape], className)}>
      <EditableImage
        editable={editable}
        value={value || null}
        label={label}
        alt={alt}
        onCommit={onCommit}
        className="absolute inset-0 w-full h-full"
        imgClassName="object-cover w-full h-full"
        imgStyle={fadeBottom ? FADE_BOTTOM : undefined}
        publicEmptyClassName="w-full h-full bg-[var(--pa-linen,#E9DFD0)]"
      />
    </div>
  );
}

/** Ícone do catálogo pela chave (traço fino, cor do texto ao redor); chave desconhecida = nada. */
export function ProposalIcon({ name, className }: { name?: string | null; className?: string }) {
  const def = name ? PROPOSAL_ICONS[name] : undefined;
  if (!def) return null;
  const Icon = def.icon;
  return <Icon aria-hidden className={cn('h-5 w-5 shrink-0', className)} strokeWidth={1.25} />;
}

/**
 * Preço editorial: "R$" pequeno no alto, valor grande e centavos menores (fonte de números).
 * Na edição inline muda só o valor; "R$" e centavos são preservados. Formato livre = texto puro.
 */
export function PriceTag({
  value,
  editable,
  onCommit,
  className,
}: {
  value: string;
  editable: boolean;
  onCommit: (v: string) => void;
  className?: string;
}) {
  const parts = splitPrice(value);
  // div (não p): a regra `.pa-doc p { text-wrap: pretty }` religaria a quebra e jogaria o "R$" para outra linha.
  // Entrelinha no estilo: o tailwind-merge descarta leading-* diante de um text-[length].
  const style = { ...fa(), lineHeight: 1 };
  if (!parts) {
    return (
      <EditableText as="div" editable={editable} value={value} onCommit={onCommit} className={cn('lining-nums', className)} style={style} placeholder="R$ 490" />
    );
  }
  const commitAmount = (v: string) => {
    const amount = v.trim();
    // Digitou centavos junto ("1.290,50"): vale o que foi digitado
    onCommit(amount ? `${parts.currency} ${amount}${amount.includes(',') ? '' : parts.cents ?? ''}` : '');
  };
  return (
    <div className={cn('whitespace-nowrap lining-nums', className)} style={style}>
      <span className="mr-[0.4em] mt-[0.45em] inline-block align-top text-[0.36em] leading-none">{parts.currency}</span>
      <EditableText editable={editable} value={parts.amount} onCommit={commitAmount} placeholder="490" />
      {parts.cents && <span className="text-[0.5em]">{parts.cents}</span>}
    </div>
  );
}

/**
 * Faixa de destaques (2 a 4 frases curtas, ícone opcional): empilhada com filetes curtos
 * no estreito; lado a lado com separadores verticais a partir de @2xl (`underline`: traço sob cada uma).
 * `iconFallback` = ícone padrão da seção quando o item não escolheu (null = sem ícone).
 */
export function HighlightsStrip({
  items,
  et,
  editable,
  path = 'highlights',
  iconFallback = null,
  underline = false,
  className,
}: {
  items: any[];
  et: Et;
  editable: boolean;
  path?: string;
  iconFallback?: string | null;
  underline?: boolean;
  className?: string;
}) {
  const shown = (items || []).map((it, idx) => ({ it, idx })).filter(({ it }) => editable || it?.label?.trim());
  if (!shown.length) return null;
  // Até 3 frases cabem lado a lado em @2xl; 4 ou mais só em @4xl (antes disso as palavras quebrariam)
  const row = shown.length > 3 ? ROW_WIDE : ROW;

  return (
    <div className={cn('flex w-full flex-col items-center gap-5', row.wrap, className)}>
      {shown.map(({ it, idx }, i) => {
        const icon = resolveIconKey(it?.icon, iconFallback);
        return (
          <React.Fragment key={it?.id || idx}>
            {i > 0 && <span aria-hidden className={cn('block h-px w-8 shrink-0 bg-current opacity-30', row.sep)} />}
            <div className={cn('flex min-w-0 flex-col items-center text-center', row.item)}>
              {icon && <ProposalIcon name={icon} className="mb-3 opacity-80" />}
              <EditableText
                {...et(`${path}.${idx}.label`, it?.label)}
                className={cn('max-w-[28ch] pl-[0.32em] text-[10px] @md:text-[11px]', LABEL, row.label)}
                placeholder="Destaque"
              />
              {underline && <span aria-hidden className={cn('mt-3 hidden h-px w-8 bg-current opacity-40', row.underline)} />}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Classes completas (o Tailwind só gera o que aparece escrito por inteiro)
const ROW = {
  wrap: '@2xl:flex-row @2xl:items-stretch @2xl:justify-center @2xl:gap-0',
  sep: '@2xl:h-auto @2xl:w-px',
  item: '@2xl:flex-1 @2xl:px-6',
  label: '@2xl:max-w-none',
  underline: '@2xl:block',
};
const ROW_WIDE = {
  wrap: '@4xl:flex-row @4xl:items-stretch @4xl:justify-center @4xl:gap-0',
  sep: '@4xl:h-auto @4xl:w-px',
  item: '@4xl:flex-1 @4xl:px-6',
  label: '@4xl:max-w-none',
  underline: '@4xl:block',
};
