import React from 'react';
import { BlockData } from '@/hooks/useMaterialEditor';
import { cn } from '@/lib/utils';
import { EditableText } from '../../../blocks/EditableText';
import { EditableImage, AddImageTile } from '../../../blocks/EditableImage';
import { useInlineEdit } from '../../../blocks/inlineContext';
import { fd, fb, alignClass, sectionBg, textColorClass } from './helpers';

export function DefaultRenderer({ block }: { block: BlockData }) {
  const inline = useInlineEdit();
  const et = (path: string, value: string | undefined) => ({
    editable: inline?.editable ?? false,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
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
  });
  const c = content || data || {};
  const images: any[] = c.images || [];
  const layout = props?.layout ?? 'masonry';
  const align = alignClass(props?.align, 'center');

  const addImage = (url: string) => {
    inline?.set('images', [
      ...images,
      { id: crypto.randomUUID(), image_ref: url, span: 'normal', ratio: 'auto' },
    ]);
  };

  const addMultipleImages = (urls: string[]) => {
    const newImages = urls.map((url) => ({
      id: crypto.randomUUID(),
      image_ref: url,
      span: 'normal',
      ratio: 'auto',
    }));
    inline?.set('images', [...images, ...newImages]);
  };

  const commitAt = (idx: number) => (url: string) => inline?.set(`images.${idx}.image_ref`, url);
  const addTile = editable && <AddImageTile onAdd={addImage} onAddMultiple={addMultipleImages} />;

  // No público, slots vazios (comuns em modelos recém-criados) não viram caixas; sem fotos, a seção some.
  const shown = images.map((img, idx) => ({ img, idx })).filter(({ img }) => editable || img?.image_ref);
  if (!editable && shown.length === 0) return null;

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
          />
        ))}
        {addTile}
      </div>
    );
  } else if (layout === 'grid') {
    // Grade de proporção fixa: célula normal usa a proporção escolhida (padrão 4:5);
    // células "alta"/"larga" preenchem a área do span. grid-flow-dense fecha os buracos.
    grid = (
      <div className="grid grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4 gap-3 grid-flow-dense">
        {shown.map(({ img, idx }) => {
          const span = img.span === 'tall_2rows' ? 'row-span-2' : img.span === 'wide_2cols' ? 'col-span-2' : '';
          const ratio = img.ratio && img.ratio !== 'auto' ? img.ratio : '4/5';
          return (
            <div
              key={img.id || idx}
              className={cn('relative overflow-hidden rounded-[var(--pa-r-media,2px)] bg-black/5', span, span && 'min-h-[10rem]')}
              style={span ? undefined : { aspectRatio: ratio.replace('/', ' / ') }}
            >
              <EditableImage
                editable={editable}
                value={img.image_ref || null}
                label="Foto"
                alt="Foto do portfólio"
                className="absolute inset-0 w-full h-full"
                imgClassName="object-cover w-full h-full"
                onCommit={commitAt(idx)}
              />
            </div>
          );
        })}
        {addTile}
      </div>
    );
  } else {
    // Masonry (padrão): colunas com a proporção real de cada foto
    grid = (
      <div className="columns-2 @2xl:columns-3 @4xl:columns-4 gap-3">
        {shown.map(({ img, idx }) => (
          <div key={img.id || idx} className="mb-3 break-inside-avoid rounded-[var(--pa-r-media,2px)] overflow-hidden bg-black/5 relative">
            <EditableImage
              editable={editable}
              value={img.image_ref || null}
              label="Foto"
              alt="Foto do portfólio"
              fill={false}
              imgClassName="w-full h-auto block"
              onCommit={commitAt(idx)}
            />
          </div>
        ))}
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
