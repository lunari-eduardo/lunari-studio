import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EditableText } from '../../../blocks/EditableText';
import { EditableImage } from '../../../blocks/EditableImage';
import { useInlineEdit } from '../../../blocks/inlineContext';
import { fa, fd, fb, fh, fsc, alignClass, sectionBg, textColorClass, CtaHandler } from './helpers';
import { LABEL, Rule, accentOn } from './kit';
import { resolveFieldInfo } from '../../../blocks/textFields';

// Seções de fechamento da landing page: prova social, chamada final e rodapé.
// Formato de dados herdado dos seeds de proposal_templates (TestimonialBlock, CTABlock, FooterTerms).

function useEt() {
  const inline = useInlineEdit();
  const editable = inline?.editable ?? false;
  const et = (path: string, value: string | undefined) => ({
    editable,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
    fieldKey: resolveFieldInfo(path).fieldKey,
  });
  return { editable, et, set: (path: string, value: any) => inline?.set(path, value) };
}

const ITEMS_BY_ALIGN: Record<string, string> = {
  'text-left': 'items-start',
  'text-right': 'items-end',
  'text-justify': 'items-start',
  'text-center': 'items-center',
};

/** Links digitados pelo fotógrafo viram href só com protocolo seguro. */
const safeHref = (href?: string) => (href && /^(https?:|mailto:|tel:)/i.test(href.trim()) ? href.trim() : undefined);

/**
 * Carrossel sem dependência: trilha nativa com scroll-snap (deslize/trackpad funcionam mesmo sem JS),
 * setas e pontos só rolam a trilha. Um depoimento por vez, em destaque. Sem autoplay.
 */
function TestimonialCarousel({ count, label, children }: { count: number; label: string; children: React.ReactNode[] }) {
  const track = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);
  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: ((i + count) % count) * el.clientWidth }); // suavidade via motion-safe:scroll-smooth
  };
  // Botões não selecionam/rolam a seção no editor
  const press = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div role="region" aria-roledescription="carrossel" aria-label={label}>
      <div
        ref={track}
        tabIndex={0}
        onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none motion-safe:scroll-smooth focus-visible:outline-none"
      >
        {children.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="depoimento"
            aria-label={`${i + 1} de ${count}`}
            className="w-full shrink-0 snap-start px-1"
          >
            {slide}
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="mt-10 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={press(() => go(active - 1))}
            aria-label="Depoimento anterior"
            className="grid h-10 w-10 place-items-center rounded-full border border-current opacity-40 transition-opacity hover:opacity-90"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            {children.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={press(() => go(i))}
                aria-label={`Ir para o depoimento ${i + 1}`}
                aria-current={i === active ? 'true' : undefined}
                className={cn('h-1.5 rounded-full bg-current transition-all', i === active ? 'w-6 opacity-80' : 'w-1.5 opacity-25')}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={press(() => go(active + 1))}
            aria-label="Próximo depoimento"
            className="grid h-10 w-10 place-items-center rounded-full border border-current opacity-40 transition-opacity hover:opacity-90"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

const SAMPLE_TESTIMONIALS = [
  {
    id: 'sample-1',
    quote: 'A direção foi tão leve que esquecemos da câmera nos primeiros cinco minutos. Quando abrimos a galeria, nos emocionamos com cada detalhe registrado.',
    author: 'Mariana & Lucas',
    service: 'Ensaio Autoral',
  },
  {
    id: 'sample-2',
    quote: 'Desde o guia de looks até a entrega final, tudo foi impecável. As fotos têm uma luz e uma verdade que nunca tínhamos visto antes.',
    author: 'Carolina Mendes',
    service: 'Sessão em Família',
  },
  {
    id: 'sample-3',
    quote: 'Uma experiência acolhedora, pontual e de extremo bom gosto. Hoje nossas fotografias estão emolduradas na sala e são a nossa memória mais querida.',
    author: 'Fernanda & Rafael',
    service: 'Coleção Completa',
  },
];

export function TestimonialRenderer({ content, props }: { content?: any; props?: any }) {
  const { editable, et, set } = useEt();
  const c = content || {};
  const items: any[] = c.items || [];
  const align = alignClass(props?.align, 'center');
  const carousel = props?.variant === 'carousel';

  if (!editable && items.length === 0) return null;

  // Mesma ficha nos dois layouts; o carrossel dá mais escala à citação, e colunas criam cartões editoriais suaves
  const quote = (t: any, idx: number) => (
    <figure
      className={
        carousel
          ? cn('mx-auto max-w-[42rem] py-2', align)
          : 'break-inside-avoid mb-6 rounded-[var(--pa-r-card,0.75rem)] border border-[color:color-mix(in_srgb,currentColor_12%,transparent)] bg-[var(--pa-veil-on-cream)] p-7 @md:p-8'
      }
    >
      <span className={cn('block leading-none opacity-25 mb-2', carousel ? 'text-6xl' : 'text-5xl')} style={fd()} aria-hidden>
        “
      </span>
      <EditableText
        as="blockquote"
        {...et(`items.${idx}.quote`, t.quote)}
        multiline
        placeholder="Depoimento do cliente"
        className={cn(
          'italic font-light leading-relaxed opacity-85 mb-6',
          carousel ? 'text-xl @md:text-3xl' : 'text-lg @md:text-[1.15rem]'
        )}
        style={fd()}
      />
      <span className={cn('block h-px w-10 bg-current opacity-30 mb-4', carousel && align === 'text-center' && 'mx-auto')} />
      <figcaption className="text-[10px] tracking-[0.28em] uppercase" style={fb()}>
        <EditableText {...et(`items.${idx}.author`, t.author)} placeholder="Nome do cliente" />
        {(t.service || editable) && (
          <span className="block mt-1 opacity-55">
            <EditableText {...et(`items.${idx}.service`, t.service)} placeholder="Serviço" />
          </span>
        )}
      </figcaption>
    </figure>
  );

  return (
    <section
      className={cn(
        'py-16 @md:py-28 px-6 @md:px-14',
        sectionBg(props?.background, 'cream'),
        textColorClass(props?.text_color, props?.background, 'cream')
      )}
    >
      <div className={cn('max-w-[1000px] mx-auto', align)}>
        <EditableText
          as="p"
          {...et('eyebrow', c.eyebrow)}
          className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-50 mb-4"
        />
        <EditableText as="h2" {...et('title', c.title)} className="text-4xl @md:text-5xl mb-12 @md:mb-16" style={fd()} />

        {items.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-[color:color-mix(in_srgb,currentColor_22%,transparent)] px-6 py-8 text-center">
            <p className="text-sm opacity-65">
              Os depoimentos do modelo são ocultados automaticamente para o cliente até você preencher os seus.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                set(
                  'items',
                  SAMPLE_TESTIMONIALS.map((item) => ({ ...item, id: crypto.randomUUID() }))
                );
              }}
              className="mt-4 inline-flex items-center justify-center rounded-full border border-current px-5 py-2 text-[11px] uppercase tracking-[0.2em] opacity-80 transition-opacity hover:opacity-100"
              style={fb()}
            >
              + Inserir depoimentos de exemplo para editar
            </button>
          </div>
        ) : carousel ? (
          <TestimonialCarousel count={items.length} label={c.title || 'Depoimentos'}>
            {items.map((t: any, idx: number) => (
              <React.Fragment key={t.id || idx}>{quote(t, idx)}</React.Fragment>
            ))}
          </TestimonialCarousel>
        ) : (
          // Colunas: depoimentos de tamanhos diferentes se acomodam sem buracos e crescem para baixo
          <div className="columns-1 @2xl:columns-2 @4xl:columns-3 gap-6 text-left">
            {items.map((t: any, idx: number) => (
              <React.Fragment key={t.id || idx}>{quote(t, idx)}</React.Fragment>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function CtaRenderer({ content, props, onCtaClick }: { content?: any; props?: any; onCtaClick?: CtaHandler }) {
  const { editable, et, set } = useEt();
  const c = content || {};
  if (props?.variant === 'signature') return <CtaSignature c={c} p={props} editable={editable} et={et} set={set} onCtaClick={onCtaClick} />;
  const links: any[] = c.links || [];
  const align = alignClass(props?.align, 'center');
  const btnText = c.btnText || 'Falar no WhatsApp';

  return (
    <section
      className={cn(
        'py-20 @md:py-32 px-6 @md:px-14',
        sectionBg(props?.background, 'cream'),
        textColorClass(props?.text_color, props?.background, 'cream')
      )}
    >
      <div className={cn('max-w-[720px] mx-auto flex flex-col', align, ITEMS_BY_ALIGN[align])}>
        <EditableText
          as="p"
          {...et('eyebrow', c.eyebrow)}
          className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-50 mb-6"
        />
        <EditableText
          as="h2"
          {...et('cta_text', c.cta_text)}
          multiline
          placeholder="Vamos criar algo lindo juntos?"
          className="text-4xl @md:text-6xl font-light leading-[1.05] whitespace-pre-line mb-8"
          style={fd()}
        />
        {(c.body || editable) && (
          <EditableText
            as="p"
            {...et('body', c.body)}
            multiline
            placeholder="Texto de apoio (ex.: as datas da temporada são limitadas)"
            className="text-base @md:text-lg font-light opacity-70 max-w-[46ch] leading-relaxed mb-10"
            style={fb()}
          />
        )}

        {editable ? (
          <div className="inline-flex items-center justify-center bg-[var(--pa-accent,#C86A46)] text-white rounded-[var(--pa-r-btn,0px)] px-8 py-5 text-sm font-medium tracking-wide cursor-text">
            <EditableText {...et('btnText', c.btnText)} placeholder="Falar no WhatsApp" />
          </div>
        ) : (
          // Sem label: o visualizador abre o WhatsApp do perfil com a mensagem padrão
          <Button
            className="bg-[var(--pa-accent,#C86A46)] hover:bg-[var(--pa-accent,#C86A46)]/90 text-white rounded-[var(--pa-r-btn,0px)] px-8 py-5 h-auto text-sm font-medium tracking-wide"
            onClick={() => onCtaClick?.({ blockType: 'CTABlock' })}
          >
            {btnText}
          </Button>
        )}

        {links.length > 0 && (
          <ul className={cn('mt-12 flex flex-wrap gap-x-8 gap-y-3 text-[10px] tracking-[0.24em] uppercase opacity-60', ITEMS_BY_ALIGN[align] === 'items-center' && 'justify-center')} style={fb()}>
            {links.map((l: any, idx: number) => {
              const href = editable ? undefined : safeHref(l.href);
              return (
                <li key={l.id || idx}>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                      {l.label || l.href}
                    </a>
                  ) : (
                    <span>{l.label || l.href}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

// Foto do encerramento: esmaece para o texto (no estreito, de cima; ao lado da assinatura, de cima e da esquerda)
const SIGN_FADE = cn(
  '[mask-image:linear-gradient(to_bottom,transparent,#000_32%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_32%)]',
  '@2xl:[mask-image:linear-gradient(to_bottom,transparent,#000_30%),linear-gradient(to_right,transparent,#000_28%)]',
  '@2xl:[-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_30%),linear-gradient(to_right,transparent,#000_28%)]',
  '@2xl:[mask-composite:intersect] @2xl:[-webkit-mask-composite:source-in]'
);

/**
 * Encerramento · Assinatura (coleção): chamada com a segunda voz em itálico, texto, assinatura em
 * caligrafia (o nome do perfil, preenchido ao criar a proposta) e a foto embaixo, sangrando até a
 * borda. A foto fica ao lado da assinatura, nunca sob o texto. Botão do WhatsApp só se tiver texto.
 */
function CtaSignature({
  c,
  p,
  editable,
  et,
  set,
  onCtaClick,
}: {
  c: any;
  p: any;
  editable: boolean;
  et: ReturnType<typeof useEt>['et'];
  set: (path: string, value: any) => void;
  onCtaClick?: CtaHandler;
}) {
  const accent = accentOn(p);
  const photo = c.image_url || null;
  const hasPhoto = !!photo || editable;
  const links: any[] = (c.links || []).filter((l: any) => l?.label || l?.href);

  return (
    <section
      className={cn(
        'relative overflow-hidden px-6 pt-20 @md:px-14 @md:pt-28',
        hasPhoto ? 'pb-0' : 'pb-20 @md:pb-28',
        sectionBg(p.background, 'white'),
        textColorClass(p.text_color, p.background, 'white')
      )}
    >
      <div className="relative mx-auto max-w-[1000px]">
        {(c.eyebrow || editable) && (
          <div className={cn('mb-8 flex items-center gap-4', accent)}>
            <EditableText as="p" {...et('eyebrow', c.eyebrow)} className="text-lg leading-none @md:text-xl" style={fa()} placeholder="Rótulo (opcional)" />
            <Rule className="w-16 opacity-60 @md:w-24" />
          </div>
        )}
        <h2 className="max-w-full text-[length:clamp(2.9rem,9cqi,6.25rem)] leading-[1.02] tracking-[-0.015em]" style={fd()}>
          <EditableText {...et('cta_text', c.cta_text)} placeholder="Vamos criar" />
          {(c.cta_italic || editable) && (
            <em className={cn('block', accent)} style={fh()}>
              <EditableText {...et('cta_italic', c.cta_italic)} placeholder="memórias juntos?" />
            </em>
          )}
        </h2>
        {(c.body || editable) && (
          <EditableText
            as="div"
            multiline
            {...et('body', c.body)}
            className="mt-10 max-w-[36rem] whitespace-pre-line text-[17px] leading-[1.65] opacity-85 @md:text-[19px]"
            style={fb()}
            placeholder="Uma mensagem final, no seu tom: o convite para reservar."
          />
        )}
        {editable ? (
          <div className={cn('mt-10 inline-flex rounded-full border border-dashed border-current px-7 py-3.5 text-[11px] opacity-80', LABEL, 'tracking-[0.28em]', accent)} style={fb()}>
            <EditableText {...et('btnText', c.btnText)} placeholder="Botão do WhatsApp (opcional)" />
          </div>
        ) : (
          c.btnText?.trim() && (
            <button
              type="button"
              onClick={() => onCtaClick?.({ blockType: 'CTABlock', label: c.btnText })}
              className={cn('mt-10 inline-flex rounded-full border border-current px-7 py-3.5 text-[11px] transition-opacity hover:opacity-70', LABEL, 'tracking-[0.28em]', accent)}
              style={fb()}
            >
              {c.btnText}
            </button>
          )
        )}

        <div className={cn('flex flex-col @2xl:flex-row @2xl:items-end', hasPhoto ? 'mt-14 @2xl:mt-10' : 'mt-16')}>
          <div className={cn('shrink-0', hasPhoto && '@2xl:w-[40%] @2xl:pb-24 @2xl:pr-6')}>
            <Rule className={cn('w-16 opacity-60', accent)} />
            {(c.signature || editable) && (
              <EditableText
                as="p"
                {...et('signature', c.signature)}
                className={cn('mt-7 max-w-full text-[length:clamp(2.4rem,4.6cqi,3.4rem)] leading-[1.15]', accent)}
                style={fsc()}
                placeholder="Seu Nome"
              />
            )}
            {(c.signature_caption || editable) && (
              <EditableText
                as="p"
                multiline
                {...et('signature_caption', c.signature_caption)}
                className={cn('mt-4 max-w-[24ch] whitespace-pre-line text-[11px] opacity-80 @md:text-xs', LABEL, 'tracking-[0.32em]')}
                style={fb()}
                placeholder="Nome do estúdio · Fotografia"
              />
            )}
            {links.length > 0 && (
              <ul className={cn('mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[10px] opacity-70', LABEL, 'tracking-[0.24em]')} style={fb()}>
                {links.map((l: any, idx: number) => {
                  const href = editable ? undefined : safeHref(l.href);
                  return (
                    <li key={l.id || idx}>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
                          {l.label || l.href}
                        </a>
                      ) : (
                        <span>{l.label || l.href}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {hasPhoto && (
            <div className="relative -mx-6 mt-10 aspect-[4/5] @md:-mx-14 @2xl:mx-0 @2xl:-mr-14 @2xl:mt-0 @2xl:aspect-[5/4] @2xl:min-w-0 @2xl:flex-1">
              <EditableImage
                editable={editable}
                value={photo}
                label="Foto do encerramento"
                alt={c.cta_text || 'Foto'}
                onCommit={(url) => set('image_url', url)}
                className="absolute inset-0 w-full h-full"
                imgClassName={cn('object-cover w-full h-full', SIGN_FADE)}
                publicEmptyClassName="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function FooterTermsRenderer({ content, props }: { content?: any; props?: any }) {
  const { editable, et } = useEt();
  const c = content || {};

  if (!editable && !c.terms && !c.copyright) return null;

  return (
    <section
      className={cn(
        'py-12 @md:py-16 px-6 @md:px-14',
        sectionBg(props?.background, 'white'),
        textColorClass(props?.text_color, props?.background, 'white')
      )}
    >
      <div className="max-w-[640px] mx-auto text-center" style={fb()}>
        {(c.terms || editable) && (
          <>
            <EditableText
              as="p"
              {...et('terms', c.terms)}
              multiline
              placeholder="Condições: validade da proposta, forma de pagamento, reserva de data..."
              className="text-xs @md:text-sm font-light leading-relaxed opacity-70 whitespace-pre-line"
            />
            <span className="block h-px w-12 mx-auto bg-current opacity-20 my-8" />
          </>
        )}
        <EditableText
          as="p"
          {...et('copyright', c.copyright)}
          placeholder="© Seu Estúdio"
          className="text-[10px] tracking-[0.3em] uppercase opacity-50"
        />
      </div>
    </section>
  );
}
