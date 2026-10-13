import {
  Image as ImageIcon,
  AlignLeft,
  DollarSign,
  Briefcase,
  Type,
  Layout,
  Minus,
  Quote,
  MessageCircle,
  ScrollText,
  ListChecks,
  PackagePlus,
  Palette,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { addonIcon, infoIcon } from './icons';

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'url'
  | 'price_cents'     // exibido em R$, armazenado em centavos
  | 'stringlist'      // lista de strings (1 por linha)
  | 'list'            // lista de objetos com itemFields
  | 'image'           // upload de imagem
  | 'select'
  | 'boolean'
  | 'color'
  | 'swatch'          // amostras da paleta do tema + cor livre (fundo da seção)
  | 'gallery'         // fotos em lote: envio múltiplo + miniaturas reordenáveis
  | 'align'           // controle segmentado esquerda/centro/direita/justificado
  | 'icon'            // catálogo visual de ícones (blocks/icons.ts): chave, '' = padrão, 'none' = sem ícone
  | 'iconlist';       // um ícone por item de `features` do mesmo item de lista (alinhado por posição)

/** Grupo do inspector (acordeão). Ausente = inferido pelo tipo do campo (ver PropertiesSidebar). */
export type FieldGroup = 'text' | 'items' | 'media' | 'layout' | 'style' | 'actions';

/** Estado atual da seção (variante já resolvida com a padrão) para campos condicionais. */
export interface FieldCtx {
  content: Record<string, any>;
  props: Record<string, any>;
}

export interface BlockField {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  /** `collection`: opção exclusiva de uma coleção temática (select: ver optionsFor). */
  options?: { value: string; label: string; collection?: string }[];
  slot?: boolean;
  itemLabel?: string;
  itemFields?: BlockField[];
  itemFactory?: () => Record<string, any>;
  group?: FieldGroup;
  /** Some do painel quando a variante/layout atual não usa o campo (o dado continua salvo). */
  showIf?: (ctx: FieldCtx) => boolean;
  /** Campo 'icon' dentro de lista: ícone que o "Automático" usa para o item (o mesmo do renderer). */
  autoIcon?: (item: any) => string | null;
}

export interface PropImageSlot {
  key: string;
  label: string;
  showIf?: (ctx: FieldCtx) => boolean;
}

const variantIn = (...variants: string[]) => ({ props }: FieldCtx) => variants.includes(props.variant);
const variantNotIn = (...variants: string[]) => ({ props }: FieldCtx) => !variants.includes(props.variant);

export interface BlockDefinition {
  type: string;
  name: string;
  description: string;
  icon: LucideIcon;
  fields: BlockField[];
  layoutFields?: BlockField[];
  propImageSlots?: PropImageSlot[];
  /** `collection`: exclusiva de uma coleção temática (blocks/collections.ts) até ser liberada aos modelos padrão. */
  variants?: { value: string; label: string; description: string; collection?: string }[];
  defaultVariant?: string;
  /** Bloco exclusivo de uma coleção temática: só aparece na biblioteca de seções das propostas dela. */
  collection?: string;
  factory: () => { content: Record<string, any>; props?: Record<string, any> };
}

// Helpers de campos de layout
export const ALIGN_FIELD: BlockField = { key: 'align', label: 'Alinhamento do Texto', kind: 'align' };

/** Fundos da paleta do tema (além deles, cor livre #RRGGBB). */
export const BACKGROUND_OPTIONS = [
  { value: 'white', label: 'Branco' },
  { value: 'cream', label: 'Creme' },
  { value: 'linen', label: 'Linho' },
  { value: 'stone', label: 'Pedra' },
  { value: 'taupe', label: 'Taupe' },
  { value: 'dark', label: 'Escuro' },
];

export const backgroundField = (showIf?: BlockField['showIf']): BlockField => ({
  key: 'background',
  label: 'Fundo da Seção',
  kind: 'swatch',
  options: BACKGROUND_OPTIONS,
  showIf,
});

export const TEXT_COLOR_OPTIONS = [
  { value: 'default', label: 'Automático' },
  { value: 'dark', label: 'Grafite Escuro' },
  { value: 'black', label: 'Preto Puro' },
  { value: 'light', label: 'Branco / Claro' },
  { value: 'warm', label: 'Tons Quentes (Marrom)' },
  { value: 'accent', label: 'Dourado / Acento' },
];

export const textColorField = (showIf?: BlockField['showIf']): BlockField => ({
  key: 'text_color',
  label: 'Cor do Texto',
  kind: 'select',
  options: TEXT_COLOR_OPTIONS,
  showIf,
});

export const IMAGE_RATIO_OPTIONS = [
  { value: 'auto', label: 'Proporção original' },
  { value: '1/1', label: 'Quadrada (1:1)' },
  { value: '4/5', label: 'Retrato (4:5)' },
  { value: '4/3', label: 'Paisagem (4:3)' },
  { value: '16/9', label: 'Panorâmica (16:9)' },
];

export const detailItem = () => ({ id: crypto.randomUUID(), label: '', value: '' });
export const packageItem = () => ({
  id: crypto.randomUUID(),
  name: 'Novo Pacote',
  price: '',
  price_unit: 'sessão',
  price_cash: '',
  price_installments: '',
  badge: '',
  features: [],
});
export const testimonialItem = () => ({ id: crypto.randomUUID(), quote: '', author: '', service: '' });
export const linkItem = () => ({ id: crypto.randomUUID(), label: '', href: '' });
export const galleryItem = () => ({ id: crypto.randomUUID(), image_ref: '', span: 'normal', ratio: 'auto' });

/**
 * Fotos novas ocupam primeiro os espaços vazios do modelo (que guardam o desenho: tamanhos
 * da grade) e só depois entram no fim da galeria.
 */
export function fillGallerySlots(images: Record<string, any>[], urls: string[]): Record<string, any>[] {
  const queue = [...urls];
  const next = images.map((img) => (!img?.image_ref && queue.length ? { ...img, image_ref: queue.shift() } : img));
  return [...next, ...queue.map((url) => ({ ...galleryItem(), image_ref: url }))];
}

export const GALLERY_SPAN_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'wide_2cols', label: 'Larga' },
  { value: 'tall_2rows', label: 'Alta' },
  { value: 'feature_2x2', label: 'Destaque' },
];
export const infoItem = () => ({ id: crypto.randomUUID(), title: '', body: '' });
export const addonItem = () => ({ id: crypto.randomUUID(), name: '', description: '', price: '', image_ref: '', icon: '' });
export const paletteColor = () => ({ id: crypto.randomUUID(), name: '', hex: '#D9C8AE' });
export const highlightItem = () => ({ id: crypto.randomUUID(), label: '', icon: '' });

/** Faixa de destaques (frase curta + ícone opcional) — capa Noturna, pacotes da coleção. */
const highlightsField = (label: string, showIf: BlockField['showIf']): BlockField => ({
  key: 'highlights',
  label,
  kind: 'list',
  itemLabel: 'Destaque',
  itemFields: [
    { key: 'label', label: 'Texto', kind: 'text', placeholder: 'Sessões limitadas' },
    { key: 'icon', label: 'Ícone (opcional)', kind: 'icon' },
  ],
  itemFactory: highlightItem,
  showIf,
});

/** Capas da coleção editorial: título em dois tempos ("Sessões de" + "Natal"). */
const LOCKUP_COVERS = ['arches-trio', 'ornament', 'night-hero'];

/** Pacotes da coleção editorial (Natal): mesma anatomia, layouts diferentes. */
const COLLECTION_PACKAGES = ['photo-cards', 'photo-rows', 'arch-cards'];

/** Estilo da palavra em destaque; a 1ª opção é o padrão da variante (o select exibe a 1ª sem valor salvo). */
const titleStyleField = (first: 'script' | 'caps', variants: string[]): BlockField => {
  const options = [
    { value: 'script', label: 'Caligráfico' },
    { value: 'italic', label: 'Itálico' },
    { value: 'caps', label: 'Caixa-alta' },
  ];
  return {
    key: 'title_style',
    label: 'Estilo da palavra em destaque',
    kind: 'select',
    options: [...options.filter((o) => o.value === first), ...options.filter((o) => o.value !== first)],
    group: 'layout',
    showIf: variantIn(...variants),
  };
};

export const BLOCK_REGISTRY: Record<string, BlockDefinition> = {
  CoverBlock: {
    type: 'CoverBlock',
    name: 'Capa',
    description: 'Seção de abertura com imagem',
    icon: ImageIcon,
    // Mesma chave com rótulos por variante: os `showIf` são exclusivos (só um aparece por vez)
    fields: [
      { key: 'eyebrow', label: 'Rótulo Superior (Eyebrow)', kind: 'text', placeholder: 'Proposta personalizada' },
      { key: 'title', label: 'Título Principal', kind: 'textarea', placeholder: 'Seu momento merece ser vivido', showIf: variantNotIn(...LOCKUP_COVERS) },
      { key: 'title', label: 'Linha de abertura', kind: 'text', placeholder: 'Sessões de', showIf: variantIn(...LOCKUP_COVERS) },
      { key: 'title_italic', label: 'Título em Itálico', kind: 'text', placeholder: 'e lembrado para sempre.', showIf: variantNotIn(...LOCKUP_COVERS) },
      { key: 'title_italic', label: 'Palavra em destaque', kind: 'text', placeholder: 'Natal', showIf: variantIn(...LOCKUP_COVERS) },
      { key: 'subtitle', label: 'Subtítulo', kind: 'textarea', placeholder: 'Fotografias que eternizam...' },
      // Minimal não exibe assinatura (só a usa como subtítulo de reserva)
      { key: 'photographer_name', label: 'Assinatura (Fotógrafo)', kind: 'text', placeholder: 'Camila Ramos · Fotografias', showIf: variantNotIn('minimal-center') },
      { key: 'btnText', label: 'Texto do Botão', kind: 'text', placeholder: 'Quero viver essa experiência' },
      { key: 'image_url', label: 'Imagem de Capa', kind: 'image', showIf: variantNotIn('arches-trio') },
      { key: 'photo_b', label: 'Foto B', kind: 'image', showIf: variantIn('editorial-diptych') },
      { key: 'photo_b', label: 'Arco esquerdo', kind: 'image', showIf: variantIn('arches-trio') },
      { key: 'image_url', label: 'Arco central (foto principal)', kind: 'image', showIf: variantIn('arches-trio') },
      { key: 'photo_c', label: 'Arco direito', kind: 'image', showIf: variantIn('arches-trio') },
      highlightsField('Destaques do rodapé', variantIn('night-hero')),
    ],
    layoutFields: [
      // Capas com foto de fundo sangrada não usam alinhamento nem fundo da seção
      { ...ALIGN_FIELD, showIf: variantIn('seam-side', 'minimal-center', 'editorial-diptych') },
      backgroundField(variantNotIn('poster-split', 'hero-full', 'poster-sky', 'night-hero')),
      textColorField(variantNotIn('hero-full', 'night-hero')),
      titleStyleField('script', ['arches-trio']),
      titleStyleField('caps', ['ornament', 'night-hero']),
      { key: 'hide_ornaments', label: 'Ocultar detalhes decorativos (estrela, fio e brilhos)', kind: 'boolean', showIf: variantIn('arches-trio', 'ornament') },
    ],
    variants: [
      { value: 'minimal-center', label: 'Minimal', description: 'Editorial Minimalista' },
      { value: 'poster-split', label: 'Poster', description: 'Pôster Tipográfico em Grid' },
      { value: 'seam-side', label: 'Split Lateral', description: 'Costura Lateral 50/50' },
      { value: 'hero-full', label: 'Hero Fotográfico', description: 'Imersivo Full-Bleed' },
      { value: 'editorial-diptych', label: 'Díptico', description: 'Díptico Editorial' },
      { value: 'floating-frame', label: 'Moldura', description: 'Moldura Flutuante Fine Art' },
      { value: 'poster-sky', label: 'Pôster Editorial', description: 'Foto sangrada, título no topo e assinatura no rodapé' },
      { value: 'arches-trio', label: 'Arcos', description: 'Três fotos em arco e palavra em destaque', collection: 'natal' },
      { value: 'ornament', label: 'Medalhão', description: 'Foto circular suspensa, como um enfeite', collection: 'natal' },
      { value: 'night-hero', label: 'Noturna', description: 'Foto de fundo com véu escuro e destaques no rodapé', collection: 'natal' },
    ],
    defaultVariant: 'minimal-center',
    factory: () => ({
      content: {
        eyebrow: '',
        title: '',
        title_italic: '',
        subtitle: '',
        photographer_name: '',
        btnText: '',
        btnLink: '',
        image_url: '',
      },
      props: { align: 'left', background: 'white', text_color: 'default' },
    }),
  },

  EditorialBlock: {
    type: 'EditorialBlock',
    name: 'Editorial',
    description: 'Bloco de conteúdo com imagens',
    icon: AlignLeft,
    fields: [
      { key: 'eyebrow', label: 'Rótulo Superior (Eyebrow)', kind: 'text', placeholder: 'Como funciona' },
      { key: 'title', label: 'Título Principal', kind: 'text', placeholder: 'Uma tarde' },
      { key: 'title_italic', label: 'Título em Itálico', kind: 'text', placeholder: 'só sua.' },
      { key: 'body', label: 'Texto (Corpo)', kind: 'textarea', placeholder: 'Cada sessão começa com uma conversa...' },
      { key: 'vertical_label', label: 'Assinatura Vertical', kind: 'text', placeholder: 'Camila Ramos · Fotografias', showIf: variantIn('overlap-blend') },
      { key: 'aside', label: 'Frases de destaque', kind: 'textarea', placeholder: 'Toda história\ncomeça com uma memória.', showIf: variantIn('arch-portrait') },
      {
        key: 'details',
        label: 'Detalhes',
        kind: 'list',
        itemLabel: 'Detalhe',
        itemFields: [
          { key: 'label', label: 'Rótulo', kind: 'text', placeholder: 'Duração' },
          { key: 'value', label: 'Valor', kind: 'text', placeholder: '2 a 8 horas' },
        ],
        itemFactory: detailItem,
        showIf: variantNotIn('arch-portrait', 'light-intro'),
      },
    ],
    layoutFields: [
      ALIGN_FIELD,
      backgroundField(),
      textColorField(),
      {
        key: 'photo_style',
        label: 'Estilo da foto',
        kind: 'select',
        options: [
          { value: 'soft', label: 'Luz suave: sem moldura, esmaecida' },
          { value: 'frame', label: 'Moldura arredondada' },
          { value: 'circle', label: 'Círculo' },
        ],
        showIf: variantIn('light-intro'),
      },
    ],
    variants: [
      { value: 'overlap-blend', label: 'Fotos Sobrepostas', description: 'Duas fotos com blend mode (padrão)' },
      { value: 'split-portrait', label: 'Split Retrato', description: 'Texto à esquerda + foto retrato à direita' },
      { value: 'text-only', label: 'Só Texto', description: 'Texto estilizado sem fotos' },
      { value: 'arch-portrait', label: 'Retrato em Arco', description: 'Sobre você: texto, frases de destaque e retrato em arco' },
      { value: 'light-intro', label: 'Texto e Luz', description: 'Título com itálico em destaque e foto suave ao lado, sem moldura', collection: 'natal' },
    ],
    defaultVariant: 'overlap-blend',
    propImageSlots: [
      { key: 'photo_a', label: 'Foto Principal', showIf: variantNotIn('text-only') },
      { key: 'photo_b', label: 'Foto Sobreposta (Blend)', showIf: variantIn('overlap-blend') },
    ],
    factory: () => ({
      content: { eyebrow: '', title: '', title_italic: '', body: '', vertical_label: '', details: [] },
      props: {
        align: 'left',
        background: 'dark',
        text_color: 'default',
        photo_a: { width_pct: 72, height_pct: 80, image_ref: null },
        photo_b: { width_pct: 62, height_pct: 66, image_ref: null },
      },
    }),
  },

  PricingTable: {
    type: 'PricingTable',
    name: 'Tabela de Preços',
    description: 'Pacotes e valores',
    icon: DollarSign,
    fields: [
      { key: 'eyebrow', label: 'Rótulo Superior (Eyebrow)', kind: 'text', placeholder: 'Investimento' },
      { key: 'title', label: 'Título', kind: 'text', placeholder: 'Pacotes' },
      { key: 'title_italic', label: 'Título em itálico (opcional)', kind: 'text', placeholder: 'experiência', showIf: variantIn(...COLLECTION_PACKAGES) },
      { key: 'subtitle', label: 'Frase de apoio', kind: 'textarea', placeholder: 'Escolha a melhor experiência para registrar o que é de vocês.' },
      { key: 'item_label', label: 'Rótulo acima do nome', kind: 'text', placeholder: 'Pacote', showIf: variantIn('arch-cards') },
      {
        key: 'packages',
        label: 'Pacotes',
        kind: 'list',
        itemLabel: 'Pacote',
        itemFields: [
          { key: 'name', label: 'Nome', kind: 'text', placeholder: 'Essencial' },
          { key: 'description', label: 'Descrição curta', kind: 'textarea', placeholder: 'Para guardar o que importa', showIf: variantIn(...COLLECTION_PACKAGES) },
          { key: 'price', label: 'Preço (texto livre)', kind: 'text', placeholder: 'R$ 1.200' },
          { key: 'price_unit', label: 'Unidade', kind: 'text', placeholder: 'sessão', showIf: variantNotIn(...COLLECTION_PACKAGES) },
          { key: 'price_cash', label: 'Preço à Vista', kind: 'text', placeholder: 'R$ 250,00' },
          { key: 'price_installments', label: 'Parcelamento', kind: 'text', placeholder: '3x de R$ 89,62' },
          { key: 'badge', label: 'Selo (ex: Mais escolhido)', kind: 'text', placeholder: 'Mais escolhido' },
          { key: 'image_ref', label: 'Imagem do pacote', kind: 'image', showIf: ({ props }) => !props.hide_images && props.variant !== 'arch-cards' },
          { key: 'features', label: 'Itens inclusos (1 por linha)', kind: 'stringlist', placeholder: '1h de ensaio\n10 fotos digitais' },
          { key: 'feature_icons', label: 'Ícones dos itens', kind: 'iconlist', showIf: ({ props }) => ['photo-cards', 'photo-rows'].includes(props.variant) && !props.hide_icons },
        ],
        itemFactory: packageItem,
      },
      highlightsField('Destaques do rodapé', variantIn(...COLLECTION_PACKAGES)),
      { key: 'footnote', label: 'Frase de rodapé', kind: 'text', placeholder: 'Memórias que aquecem sempre', showIf: variantIn(...COLLECTION_PACKAGES) },
    ],
    layoutFields: [
      { ...ALIGN_FIELD, showIf: variantNotIn(...COLLECTION_PACKAGES) },
      backgroundField(),
      textColorField(),
      { key: 'hide_images', label: 'Ocultar fotos dos pacotes', kind: 'boolean', showIf: variantNotIn('arch-cards') },
      { key: 'hide_icons', label: 'Ocultar ícones dos itens', kind: 'boolean', showIf: variantIn('photo-cards', 'photo-rows') },
      // Só o layout Revista lê estes três
      {
        key: 'numbering',
        label: 'Numeração dos pacotes',
        kind: 'select',
        options: [
          { value: 'continue', label: 'Continua do grupo anterior' },
          { value: 'restart', label: 'Recomeça em 01' },
          { value: 'none', label: 'Sem numeração' },
        ],
        showIf: variantIn('magazine'),
      },
      { key: 'eyebrow_rules', label: 'Linhas ao lado do rótulo', kind: 'boolean', showIf: variantIn('magazine') },
      { key: 'hide_feature_icons', label: 'Ocultar ícones dos itens', kind: 'boolean', showIf: variantIn('magazine') },
    ],
    variants: [
      { value: 'cards-classic', label: 'Cards', description: 'Cards lado a lado (padrão)' },
      { value: 'cards-minimal', label: 'Cards Minimalistas', description: 'Design limpo sem bordas e foto arredondada' },
      { value: 'numbered-editorial', label: 'Editorial Numerado', description: 'Lista numerada com fotos e hairlines' },
      { value: 'magazine', label: 'Revista', description: 'Cartões com foto lateral, numeração e preço à vista/parcelado' },
      { value: 'photo-cards', label: 'Cartões com Foto', description: 'Foto no topo, itens com ícone e preço em destaque', collection: 'natal' },
      { value: 'photo-rows', label: 'Linhas com Foto', description: 'Cartões horizontais com a foto alternando os lados', collection: 'natal' },
      { value: 'arch-cards', label: 'Cartões em Arco', description: 'Sem foto: topo em arco e quantidades em destaque', collection: 'natal' },
    ],
    defaultVariant: 'cards-classic',
    factory: () => ({
      content: { eyebrow: '', title: 'Pacotes', packages: [] },
      props: { align: 'center', background: 'white' },
    }),
  },

  AddonsBlock: {
    type: 'AddonsBlock',
    name: 'Adicionais',
    description: 'Extras avulsos com foto e preço',
    icon: PackagePlus,
    collection: 'natal',
    fields: [
      { key: 'eyebrow', label: 'Rótulo superior', kind: 'text', placeholder: 'Sessões de Natal' },
      { key: 'title', label: 'Título', kind: 'text', placeholder: 'Adicionais e' },
      { key: 'title_italic', label: 'Título em itálico (opcional)', kind: 'text', placeholder: 'Extras' },
      { key: 'subtitle', label: 'Frase de apoio', kind: 'text', placeholder: 'Personalize a sua sessão' },
      {
        key: 'items',
        label: 'Adicionais',
        kind: 'list',
        itemLabel: 'Adicional',
        itemFields: [
          { key: 'name', label: 'Nome', kind: 'text', placeholder: 'Foto extra' },
          { key: 'description', label: 'Descrição curta', kind: 'textarea', placeholder: 'Mais registros para guardar cada detalhe.' },
          { key: 'price', label: 'Preço (texto livre)', kind: 'text', placeholder: 'R$ 35,00' },
          { key: 'image_ref', label: 'Foto', kind: 'image', showIf: ({ props }) => !props.hide_images },
          {
            key: 'icon',
            label: 'Ícone sobre a foto',
            kind: 'icon',
            autoIcon: addonIcon,
            showIf: ({ props }) => props.variant === 'grid' && !props.hide_icons,
          },
        ],
        itemFactory: addonItem,
      },
      highlightsField('Destaques do rodapé', () => true),
    ],
    layoutFields: [
      backgroundField(),
      textColorField(),
      { key: 'hide_images', label: 'Ocultar fotos', kind: 'boolean' },
      { key: 'hide_icons', label: 'Ocultar ícones dos itens', kind: 'boolean', showIf: variantIn('grid') },
    ],
    variants: [
      { value: 'grid', label: 'Cartões', description: 'Foto no topo, ícone e preço em destaque', collection: 'natal' },
      { value: 'rows', label: 'Linhas', description: 'Cartões horizontais com a foto alternando os lados', collection: 'natal' },
    ],
    defaultVariant: 'grid',
    factory: () => ({
      content: { eyebrow: '', title: 'Adicionais e', title_italic: 'Extras', subtitle: '', items: [], highlights: [] },
      props: { background: 'cream' },
    }),
  },

  Gallery: {
    type: 'Gallery',
    name: 'Galeria',
    description: 'Mostre seus resultados',
    icon: Briefcase,
    fields: [
      { key: 'eyebrow', label: 'Rótulo Superior (Eyebrow)', kind: 'text', placeholder: 'Portfólio' },
      { key: 'title', label: 'Título', kind: 'text', placeholder: 'Portfólio' },
      { key: 'caption', label: 'Legenda', kind: 'text', placeholder: 'Alguns momentos recentes' },
      // Envio em lote + miniaturas reordenáveis no painel; tamanho/proporção por foto ficam no canvas (clique na foto)
      { key: 'images', label: 'Fotos', kind: 'gallery', itemFactory: galleryItem },
    ],
    layoutFields: [
      ALIGN_FIELD,
      backgroundField(),
      textColorField(),
      {
        key: 'layout',
        label: 'Disposição das fotos',
        kind: 'select',
        options: [
          { value: 'masonry', label: 'Mosaico: proporção real de cada foto' },
          { value: 'grid', label: 'Grade: proporção única e fotos em destaque' },
          { value: 'editorial-rows', label: 'Linhas editoriais: fotos lado a lado' },
          { value: 'captioned', label: 'Fotos com legenda: inspirações lado a lado', collection: 'natal' },
        ],
      },
      {
        key: 'ratio',
        label: 'Proporção das fotos',
        kind: 'select',
        // 4:5 primeiro: é o padrão da grade quando o bloco ainda não escolheu (o select exibe a 1ª opção)
        options: ['4/5', '1/1', '4/3', '16/9'].map((v) => IMAGE_RATIO_OPTIONS.find((o) => o.value === v)!),
        group: 'layout',
        showIf: ({ props }) => props.layout === 'grid' || props.layout === 'captioned',
      },
    ],
    factory: () => ({
      content: { eyebrow: '', title: 'Portfólio', caption: '', images: [] },
      props: { align: 'center', background: 'dark', layout: 'masonry' },
    }),
  },

  text: {
    type: 'text',
    name: 'Texto Livre',
    description: 'Conteúdo customizado',
    icon: Type,
    fields: [
      { key: 'title', label: 'Título', kind: 'text', placeholder: 'Sobre o processo' },
      { key: 'body', label: 'Conteúdo', kind: 'textarea', placeholder: 'Escreva aqui...' },
    ],
    layoutFields: [ALIGN_FIELD, backgroundField()],
    factory: () => ({
      content: { title: '', body: '' },
      props: { align: 'center', background: 'white' },
    }),
  },

  DividerBlock: {
    type: 'DividerBlock',
    name: 'Divisor',
    description: 'Separador visual com rótulo opcional',
    icon: Minus,
    fields: [
      { key: 'label', label: 'Rótulo', kind: 'text', placeholder: 'PACOTE — ESTÚDIO', showIf: ({ props }) => props.style !== 'spaced' },
    ],
    layoutFields: [
      {
        key: 'style',
        label: 'Estilo',
        kind: 'select',
        options: [
          { value: 'hairline', label: 'Linha fina' },
          { value: 'spaced', label: 'Espaçado' },
          { value: 'ornament', label: 'Ornamento' },
        ],
      },
      backgroundField(),
    ],
    factory: () => ({
      content: { label: '' },
      props: { style: 'hairline', background: 'cream' },
    }),
  },

  EditorialComposition: {
    type: 'EditorialComposition',
    name: 'Composição Editorial',
    description: 'Layout premium com foco em tipografia e impacto visual',
    icon: Layout,
    fields: [
      { key: 'eyebrow', label: 'Rótulo Superior', kind: 'text', placeholder: 'A experiência' },
      { key: 'title', label: 'Título Principal', kind: 'text', placeholder: 'Essência' },
      { key: 'title_italic', label: 'Título em Itálico', kind: 'text', placeholder: 'Através do Olhar' },
      { key: 'body', label: 'Texto (Corpo)', kind: 'textarea', placeholder: 'Uma narrativa visual construída...' },
      { key: 'side_label', label: 'Rótulo Lateral', kind: 'text', placeholder: 'Lunari · Estúdio' },
      { key: 'image_url', label: 'Imagem Principal', kind: 'image' },
    ],
    layoutFields: [
      backgroundField(),
      {
        key: 'layout',
        label: 'Layout da Composição',
        kind: 'select',
        options: [
          { value: 'split-left', label: 'Imagem à Esquerda' },
          { value: 'split-right', label: 'Imagem à Direita' },
          { value: 'full-overlap', label: 'Sobreposição Total' },
        ],
      },
    ],
    factory: () => ({
      content: { eyebrow: '', title: '', title_italic: '', body: '', side_label: '', image_url: '' },
      props: { background: 'cream', layout: 'split-left' },
    }),
  },

  TestimonialBlock: {
    type: 'TestimonialBlock',
    name: 'Depoimentos',
    description: 'Prova social de clientes reais',
    icon: Quote,
    fields: [
      { key: 'eyebrow', label: 'Rótulo Superior (Eyebrow)', kind: 'text', placeholder: 'O que dizem' },
      { key: 'title', label: 'Título', kind: 'text', placeholder: 'Depoimentos' },
      {
        key: 'items',
        label: 'Depoimentos',
        kind: 'list',
        itemLabel: 'Depoimento',
        itemFields: [
          { key: 'quote', label: 'Depoimento', kind: 'textarea', placeholder: 'Nunca imaginei que fotos...' },
          { key: 'author', label: 'Cliente', kind: 'text', placeholder: 'Nome do cliente' },
          { key: 'service', label: 'Serviço', kind: 'text', placeholder: 'Ensaio Gestante' },
        ],
        itemFactory: testimonialItem,
      },
    ],
    layoutFields: [ALIGN_FIELD, backgroundField(), textColorField()],
    variants: [
      { value: 'columns', label: 'Colunas', description: 'Todos à vista, em colunas que se acomodam' },
      { value: 'carousel', label: 'Carrossel', description: 'Um depoimento por vez, em destaque, com setas e deslize' },
    ],
    defaultVariant: 'columns',
    factory: () => ({
      content: { eyebrow: 'O que dizem', title: 'Depoimentos', items: [] },
      props: { align: 'center', background: 'cream' },
    }),
  },

  CTABlock: {
    type: 'CTABlock',
    name: 'Chamada Final',
    description: 'Fechamento com botão de contato',
    icon: MessageCircle,
    fields: [
      { key: 'eyebrow', label: 'Rótulo Superior (Eyebrow)', kind: 'text', placeholder: 'Próximo passo' },
      { key: 'cta_text', label: 'Chamada Principal', kind: 'textarea', placeholder: 'Vamos criar algo lindo juntos?' },
      { key: 'body', label: 'Texto de Apoio', kind: 'textarea', placeholder: 'As datas da temporada são limitadas...' },
      { key: 'btnText', label: 'Texto do Botão (abre o WhatsApp do perfil)', kind: 'text', placeholder: 'Falar no WhatsApp' },
      {
        key: 'links',
        label: 'Links de Contato',
        kind: 'list',
        itemLabel: 'Link',
        itemFields: [
          { key: 'label', label: 'Rótulo', kind: 'text', placeholder: '@seuperfil' },
          { key: 'href', label: 'Endereço (https://, mailto:)', kind: 'url', placeholder: 'https://instagram.com/seuperfil' },
        ],
        itemFactory: linkItem,
        group: 'actions',
      },
    ],
    layoutFields: [ALIGN_FIELD, backgroundField(), textColorField()],
    factory: () => ({
      content: { eyebrow: '', cta_text: 'Vamos criar algo lindo juntos?', body: '', btnText: 'Falar no WhatsApp', links: [] },
      props: { align: 'center', background: 'cream' },
    }),
  },

  InfoBlock: {
    type: 'InfoBlock',
    name: 'Informações e Guia',
    description: 'Dicas, condições, pagamento e prazos',
    icon: ListChecks,
    fields: [
      { key: 'eyebrow', label: 'Rótulo Superior (Eyebrow)', kind: 'text', placeholder: 'Antes da sessão' },
      { key: 'title', label: 'Título da Seção (opcional)', kind: 'text', placeholder: 'Guia do ensaio' },
      { key: 'image_url', label: 'Imagem de abertura (opcional)', kind: 'image' },
      {
        key: 'items',
        label: 'Itens',
        kind: 'list',
        itemLabel: 'Item',
        itemFields: [
          { key: 'title', label: 'Título', kind: 'text', placeholder: 'O que vestir' },
          { key: 'body', label: 'Texto', kind: 'textarea', placeholder: 'Peças leves, de tons neutros...' },
          { key: 'icon', label: 'Ícone', kind: 'icon', autoIcon: infoIcon, showIf: variantIn('icon-columns') },
        ],
        itemFactory: infoItem,
      },
    ],
    layoutFields: [ALIGN_FIELD, backgroundField(), textColorField()],
    variants: [
      { value: 'stacked', label: 'Guia', description: 'Título e texto em sequência, como um guia impresso' },
      { value: 'accordion', label: 'Sanfona', description: 'Títulos visíveis e texto ao clicar: ideal para textos longos' },
      { value: 'columns', label: 'Colunas', description: 'Duas colunas: ideal para textos curtos' },
      { value: 'icon-columns', label: 'Colunas com ícone', description: 'Orientações curtas lado a lado, com ícone e filetes', collection: 'natal' },
    ],
    defaultVariant: 'stacked',
    factory: () => ({
      content: { eyebrow: '', title: '', image_url: '', items: [] },
      props: { align: 'left', background: 'white' },
    }),
  },

  PaletteBlock: {
    type: 'PaletteBlock',
    name: 'Paleta de cores',
    description: 'Cores sugeridas para os looks',
    icon: Palette,
    collection: 'natal',
    fields: [
      { key: 'title', label: 'Título', kind: 'text', placeholder: 'Paleta de cores' },
      { key: 'note', label: 'Nota ao lado do título', kind: 'textarea', placeholder: 'Essas são as cores que mais combinam com o cenário.' },
      {
        key: 'colors',
        label: 'Cores',
        kind: 'list',
        itemLabel: 'Cor',
        itemFields: [
          { key: 'name', label: 'Nome', kind: 'text', placeholder: 'Caramelo' },
          { key: 'hex', label: 'Cor', kind: 'color' },
        ],
        itemFactory: paletteColor,
      },
    ],
    layoutFields: [backgroundField(), textColorField(), { key: 'hide_hex', label: 'Ocultar o código da cor (#)', kind: 'boolean' }],
    factory: () => ({
      content: { title: 'Paleta de cores', note: '', colors: [] },
      props: { background: 'white' },
    }),
  },

  FooterTerms: {
    type: 'FooterTerms',
    name: 'Rodapé e Condições',
    description: 'Validade, pagamento e assinatura',
    icon: ScrollText,
    fields: [
      { key: 'terms', label: 'Condições (validade, pagamento, reserva)', kind: 'textarea', placeholder: 'Proposta válida por 7 dias. Reserva da data mediante sinal de 30%.' },
      { key: 'copyright', label: 'Assinatura / Copyright', kind: 'text', placeholder: '© 2026 Seu Estúdio' },
    ],
    layoutFields: [backgroundField(), textColorField()],
    factory: () => ({
      content: { terms: '', copyright: '' },
      props: { background: 'white' },
    }),
  },
};
