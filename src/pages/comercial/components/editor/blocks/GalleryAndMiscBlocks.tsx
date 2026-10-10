import React from 'react';
import { BlockData } from '@/hooks/useMaterialEditor';
import { cn } from '@/lib/utils';
import { EditableText } from '../../../blocks/EditableText';
import { EditableImage, AddImageTile } from '../../../blocks/EditableImage';
import { useInlineEdit } from '../../../blocks/inlineContext';
import { fd, fb, alignClass, sectionBg, textColorClass } from './helpers';
import { fillGallerySlots } from '../../../blocks/registryDefinitions';

export function DefaultRenderer({ block }: { block: BlockData }) {
  const inline = useInlineEdit();
  const et = (path: string, value: string | undefined) => ({
    editable: inline?.editable ?? false,
    value: value ?? '',
    onCommit: (v: string) => inline?.set(path, v),
    fieldKey: path.includes('.') ? undefined : path, // tamanho ajustável por clique (campos de topo)
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
    fieldKey: path.includes('.') ? undefined : path, // tamanho ajustável por clique (campos de topo)
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
    fieldKey: path.includes('.') ? undefined : path, // tamanho ajustável por clique (campos de topo)
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
