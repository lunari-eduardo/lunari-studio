import React from 'react';
import { BlockData } from '@/hooks/useMaterialEditor';
import { cn } from '@/lib/utils';
import { EditableText } from '../../../blocks/EditableText';
import { EditableImage, AddImageTile } from '../../../blocks/EditableImage';
import { useInlineEdit } from '../../../blocks/inlineContext';
import { fd, fb, alignClass, sectionBg, textColorClass } from './helpers';
import { fillGallerySlots } from '../../../blocks/registryDefinitions';
import { isHexColor } from '../../../blocks/design';
import { resolveFieldInfo } from '../../../blocks/textFields';
import { LABEL, SubsectionHeader, useEt } from './kit';

export function DefaultRenderer({ block }: { block: BlockData }) {
  const inline = useInlineEdit();
  const et = (path: string, value: string | undefined) => ({
    editable: inline?.editable ?? false,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
    fieldKey: resolveFieldInfo(path).fieldKey,
  });
  const v = block.content ?? block.data ?? {};
  const align = alignClass(block.props?.align, 'center');
  const bg = sectionBg(block.props?.background, 'white');
  const textColor = textColorClass(block.props?.text_color, block.props?.background, 'white');

  return (
    <section className={cn('py-16 px-8', bg, textColor, align)}>
      <div className="max-w-2xl mx-auto">
        <EditableText
          as="h2"
          {...et('title', v.title)}
          multiline
          className="text-3xl text-current mb-4"
          style={fd()}
        />
        <EditableText
          as="p"
          {...et('body', v.body ?? v.content ?? v.description)}
          multiline
          className="opacity-70 whitespace-pre-line"
        />
      </div>
    </section>
  );
}

// Tamanho por foto na grade → data-span lido pelo CSS .pa-gal-grid
const GRID_SPAN: Record<string, string> = { wide_2cols: 'wide', tall_2rows: 'tall', feature_2x2: 'feature' };

export function GalleryRenderer({
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
    fieldKey: resolveFieldInfo(path).fieldKey,
  });
  const c = content || data || {};
  const images: any[] = c.images || [];
  const layout = props?.layout ?? 'masonry';
  const align = alignClass(props?.align, 'center');

  const addImage = (url: string) => inline?.set('images', fillGallerySlots(images, [url]));
  const addMultipleImages = (urls: string[]) => inline?.set('images', fillGallerySlots(images, urls));

  const commitAt = (idx: number) => (url: string) => inline?.set(`images.${idx}.image_ref`, url);
  const addTile = editable && <AddImageTile onAdd={addImage} onAddMultiple={addMultipleImages} />;
  // Clique simples numa foto: barra da foto (tamanho/proporção/ordem) — só no editor
  const selectProps = (idx: number) =>
    editable && inline?.onSelectImage
      ? { onSelect: (el: HTMLElement) => inline.onSelectImage!(idx, el), selected: inline.selectedImage === idx }
      : {};

  // No público, slots vazios (comuns em modelos recém-criados) não viram caixas; sem fotos, a seção some.
  const shown = images.map((img, idx) => ({ img, idx })).filter(({ img }) => editable || img?.image_ref);
  if (!editable && shown.length === 0) return null;

  if (layout === 'captioned') {
    return (
      <GalleryCaptioned
        c={c}
        props={props}
        shown={shown}
        editable={editable}
        et={et}
        addTile={addTile}
        commitAt={commitAt}
        selectProps={selectProps}
      />
    );
  }

  // Todos os modos crescem verticalmente com o número de fotos — nada é cortado por altura de "página".
  let grid: React.ReactNode;
  if (layout === 'editorial-rows') {
    // Linhas justificadas: proporção real de cada foto, linhas fecham a largura (CSS em .pa-justified)
    grid = (
      <div className="pa-justified">
        {shown.map(({ img, idx }) => (
          <EditableImage
            key={img.id || idx}
            editable={editable}
            value={img.image_ref || null}
            label="Foto"
            alt="Foto do portfólio"
            fill={false}
            className="rounded-[var(--pa-r-media,2px)] overflow-hidden"
            imgClassName="w-auto"
            onCommit={commitAt(idx)}
            {...selectProps(idx)}
          />
        ))}
        {addTile}
      </div>
    );
  } else if (layout === 'grid') {
    // Grade: proporção única do bloco (legado migrado no normalizeBlock; padrão 4:5 = 1ª opção do painel) e
    // tamanho por foto em múltiplos exatos da célula (CSS .pa-gal-grid) — normal, larga, alta e destaque coerentes.
    const ratio: string = props?.ratio ?? '4/5';
    const [w, h] = ratio.split('/').map(Number);
    grid = (
      <div className="pa-gal">
        <div className="pa-gal-grid" style={{ ['--pa-gal-r' as any]: w && h ? h / w : 1.25 }}>
          {shown.map(({ img, idx }) => (
            <div
              key={img.id || idx}
              data-span={GRID_SPAN[img.span]}
              className="relative overflow-hidden rounded-[var(--pa-r-media,2px)] bg-black/5"
            >
              <EditableImage
                editable={editable}
                value={img.image_ref || null}
                label="Foto"
                alt="Foto do portfólio"
                className="absolute inset-0 w-full h-full"
                imgClassName="object-cover w-full h-full"
                onCommit={commitAt(idx)}
                {...selectProps(idx)}
              />
            </div>
          ))}
          {addTile}
        </div>
      </div>
    );
  } else {
    // Mosaico (padrão): proporção real de cada foto; recorte opcional por foto. Poucas fotos = menos colunas
    const count = shown.length + (addTile ? 1 : 0);
    const columns = count <= 1 ? 'columns-1' : count === 2 ? 'columns-2' : 'columns-2 @2xl:columns-3 @4xl:columns-4';
    grid = (
      <div className={cn(columns, 'gap-3')}>
        {shown.map(({ img, idx }) => {
          const crop = img.ratio && img.ratio !== 'auto' ? String(img.ratio).replace('/', ' / ') : undefined;
          return (
            <div
              key={img.id || idx}
              className="mb-3 break-inside-avoid rounded-[var(--pa-r-media,2px)] overflow-hidden bg-black/5 relative"
              style={crop ? { aspectRatio: crop } : undefined}
            >
              <EditableImage
                editable={editable}
                value={img.image_ref || null}
                label="Foto"
                alt="Foto do portfólio"
                fill={!!crop}
                className={crop ? 'absolute inset-0 w-full h-full' : undefined}
                imgClassName={crop ? 'object-cover w-full h-full' : 'w-full h-auto block'}
                onCommit={commitAt(idx)}
                {...selectProps(idx)}
              />
            </div>
          );
        })}
        {addTile && <div className="mb-3 break-inside-avoid">{addTile}</div>}
      </div>
    );
  }

  return (
    <section
      className={cn(
        'py-16 @md:py-24 px-6 @md:px-14',
        sectionBg(props?.background, 'dark'),
        textColorClass(props?.text_color, props?.background, 'dark'),
        align
      )}
    >
      <div className="max-w-[1000px] mx-auto">
        <EditableText
          as="p"
          {...et('eyebrow', c.eyebrow)}
          className="text-[10px] font-medium tracking-[0.28em] uppercase opacity-40 mb-4"
        />
        <EditableText as="h2" {...et('title', c.title)} className="text-4xl @md:text-5xl mb-4" style={fd()} />
        <EditableText as="p" {...et('caption', c.caption)} className="italic opacity-50 mb-12" style={fd()} />
        {grid}
      </div>
    </section>
  );
}

// Até 4 fotos lado a lado (no celular, 2); mais que isso quebra a linha
const CAPTIONED_COLS: Record<number, string> = {
  1: 'grid-cols-1 max-w-sm mx-auto',
  2: 'grid-cols-2',
  3: 'grid-cols-2 @2xl:grid-cols-3',
  4: 'grid-cols-2 @2xl:grid-cols-4',
};

/**
 * Fotos com legenda (inspirações de looks): cabeçalho de subseção (título + nota), fotos na
 * proporção do bloco e legenda curta em caixa-alta abaixo de cada uma, editada na arte.
 */
function GalleryCaptioned({
  c,
  props,
  shown,
  editable,
  et,
  addTile,
  commitAt,
  selectProps,
}: {
  c: any;
  props: any;
  shown: { img: any; idx: number }[];
  editable: boolean;
  et: (path: string, value: string | undefined) => any;
  addTile: React.ReactNode;
  commitAt: (idx: number) => (url: string) => void;
  selectProps: (idx: number) => Record<string, any>;
}) {
  const ratio = String(props?.ratio ?? '4/5').replace('/', ' / ');
  const count = Math.min(shown.length + (addTile ? 1 : 0), 4) || 1;
  return (
    <section
      className={cn(
        'px-5 py-10 @md:px-10 @md:py-12',
        sectionBg(props?.background, 'white'),
        textColorClass(props?.text_color, props?.background, 'white')
      )}
    >
      <div className="mx-auto max-w-[1000px]">
        <SubsectionHeader et={et} editable={editable} title={c.title} note={c.caption} notePath="caption" titlePlaceholder="Inspirações de looks" />
        <div className={cn('mt-10 grid gap-x-4 gap-y-8 @md:mt-12 @md:gap-x-5', CAPTIONED_COLS[count])}>
          {shown.map(({ img, idx }) => (
            <figure key={img.id || idx} className="flex min-w-0 flex-col">
              <div className="relative w-full overflow-hidden rounded-[var(--pa-r-media,0.75rem)] bg-black/5" style={{ aspectRatio: ratio }}>
                <EditableImage
                  editable={editable}
                  value={img.image_ref || null}
                  label="Foto"
                  alt={img.caption || 'Inspiração de look'}
                  className="absolute inset-0 w-full h-full"
                  imgClassName="object-cover w-full h-full"
                  onCommit={commitAt(idx)}
                  {...selectProps(idx)}
                />
              </div>
              {(img.caption || editable) && (
                <EditableText
                  as="figcaption"
                  multiline
                  {...et(`images.${idx}.caption`, img.caption)}
                  className={cn('mx-auto mt-4 max-w-[24ch] whitespace-pre-line pl-[0.14em] text-center text-[10px] opacity-75 @md:text-[11px]', LABEL, 'tracking-[0.14em]')}
                  style={fb()}
                  placeholder="Legenda"
                />
              )}
            </figure>
          ))}
          {addTile && <div style={{ aspectRatio: ratio }}>{addTile}</div>}
        </div>
      </div>
    </section>
  );
}

/** Paleta de cores sugeridas: círculos de cor com nome (e o código #, opcional). */
export function PaletteRenderer({ content, props }: { content?: any; props?: any }) {
  const { editable, et } = useEt();
  const c = content || {};
  const p = props || {};
  const colors = ((c.colors as any[]) || []).map((col, idx) => ({ col, idx })).filter(({ col }) => editable || isHexColor(col?.hex));
  if (!editable && !colors.length) return null;

  return (
    <section className={cn('px-5 py-10 @md:px-10 @md:py-12', sectionBg(p.background, 'white'), textColorClass(p.text_color, p.background, 'white'))}>
      <div className="mx-auto max-w-[1000px]">
        <SubsectionHeader et={et} editable={editable} title={c.title} note={c.note} notePath="note" titlePlaceholder="Paleta de cores" />
        {editable && !colors.length && (
          <p className="mt-10 rounded-2xl border border-dashed border-[color:color-mix(in_srgb,currentColor_25%,transparent)] p-8 text-center text-sm opacity-60">
            Adicione as cores no painel.
          </p>
        )}
        {/* 3 por linha no celular, 6 no tablet/desktop; menos cores = centralizadas */}
        <ul className="mt-10 flex flex-wrap justify-center gap-y-9 @md:mt-12">
          {colors.map(({ col, idx }) => (
            <li key={col.id || idx} className="flex w-1/3 min-w-0 flex-col items-center px-1 text-center @md:px-2 @2xl:w-1/6">
              <span
                aria-hidden
                className="block aspect-square w-full max-w-[5.25rem] rounded-full border border-[color:color-mix(in_srgb,currentColor_10%,transparent)] @md:max-w-[6.25rem]"
                style={{ backgroundColor: isHexColor(col.hex) ? col.hex : 'transparent' }}
              />
              <EditableText
                as="p"
                {...et(`colors.${idx}.name`, col.name)}
                className="mt-5 max-w-full pl-[0.14em] text-[10px] uppercase leading-[1.5] tracking-[0.14em] @md:pl-[0.22em] @md:text-[11px] @md:tracking-[0.22em]"
                style={fd()}
                placeholder="Nome"
              />
              {!p.hide_hex && isHexColor(col.hex) && (
                <p className="mt-1 text-[11px] uppercase tracking-[0.06em] opacity-60" style={fb()}>
                  {col.hex}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function DividerRenderer({
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
    fieldKey: resolveFieldInfo(path).fieldKey,
  });
  const c = content || data || {};
  const style = props?.style || 'hairline';
  // Linhas usam bg-current: a cor de texto do tema garante o contraste em qualquer fundo
  const surface = cn(sectionBg(props?.background, 'cream'), textColorClass(props?.text_color, props?.background, 'cream'));

  if (style === 'spaced') {
    return <section className={cn('py-12 @md:py-20', surface)} />;
  }

  if (style === 'ornament') {
    return (
      <section className={cn('py-10 @md:py-16 flex flex-col items-center gap-4', surface)}>
        <div className="flex items-center gap-4 w-full max-w-[200px]">
          <div className="flex-1 h-[0.5px] bg-current opacity-20" />
          <div className="w-2 h-2 rotate-45 border border-current opacity-20" />
          <div className="flex-1 h-[0.5px] bg-current opacity-20" />
        </div>
        {c.label && (
          <EditableText
            as="p"
            {...et('label', c.label)}
            className="text-[9px] tracking-[0.35em] uppercase opacity-40 mt-2"
            style={fb()}
          />
        )}
      </section>
    );
  }

  // hairline (default)
  return (
    <section className={cn('py-6 @md:py-10 px-6 @md:px-14', surface)}>
      <div className="max-w-[900px] mx-auto">
        <div className="flex items-center gap-6">
          <div className="flex-1 h-[0.5px] bg-current opacity-15" />
          {(c.label || editable) && (
            <EditableText
              as="span"
              {...et('label', c.label)}
              className="text-[9px] tracking-[0.35em] uppercase opacity-40 shrink-0"
              style={fb()}
              placeholder="Rótulo"
            />
          )}
          <div className="flex-1 h-[0.5px] bg-current opacity-15" />
        </div>
      </div>
    </section>
  );
}
