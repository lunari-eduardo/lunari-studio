import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../../blocks/EditableText';
import { useInlineEdit } from '../../../blocks/inlineContext';
import { fd, fb, alignClass, sectionBg, textColorClass, CtaHandler } from './helpers';

// Seções de fechamento da landing page: prova social, chamada final e rodapé.
// Formato de dados herdado dos seeds de proposal_templates (TestimonialBlock, CTABlock, FooterTerms).

function useEt() {
  const inline = useInlineEdit();
  const editable = inline?.editable ?? false;
  const et = (path: string, value: string | undefined) => ({
    editable,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
  });
  return { editable, et };
}

const ITEMS_BY_ALIGN: Record<string, string> = {
  'text-left': 'items-start',
  'text-right': 'items-end',
  'text-justify': 'items-start',
  'text-center': 'items-center',
};

/** Links digitados pelo fotógrafo viram href só com protocolo seguro. */
const safeHref = (href?: string) => (href && /^(https?:|mailto:|tel:)/i.test(href.trim()) ? href.trim() : undefined);

export function TestimonialRenderer({ content, props }: { content?: any; props?: any }) {
  const { editable, et } = useEt();
  const c = content || {};
  const items: any[] = c.items || [];
  const align = alignClass(props?.align, 'center');

  if (!editable && items.length === 0) return null;

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
          <p className="text-sm italic opacity-50">Adicione depoimentos reais de clientes no painel de propriedades.</p>
        ) : (
          // Colunas: depoimentos de tamanhos diferentes se acomodam sem buracos e crescem para baixo
          <div className="columns-1 @2xl:columns-2 @4xl:columns-3 gap-10 text-left">
            {items.map((t: any, idx: number) => (
              <figure key={t.id || idx} className="break-inside-avoid mb-12">
                <span className="block text-5xl leading-none opacity-20 mb-2" style={fd()} aria-hidden>
                  “
                </span>
                <EditableText
                  as="blockquote"
                  {...et(`items.${idx}.quote`, t.quote)}
                  multiline
                  placeholder="Depoimento do cliente"
                  className="italic text-lg @md:text-xl font-light leading-relaxed opacity-85 mb-6"
                  style={fd()}
                />
                <span className="block h-px w-10 bg-current opacity-30 mb-4" />
                <figcaption className="text-[10px] tracking-[0.28em] uppercase" style={fb()}>
                  <EditableText {...et(`items.${idx}.author`, t.author)} placeholder="Nome do cliente" />
                  {(t.service || editable) && (
                    <span className="block mt-1 opacity-50">
                      <EditableText {...et(`items.${idx}.service`, t.service)} placeholder="Serviço" />
                    </span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function CtaRenderer({ content, props, onCtaClick }: { content?: any; props?: any; onCtaClick?: CtaHandler }) {
  const { editable, et } = useEt();
  const c = content || {};
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
