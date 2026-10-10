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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
  | 'align';          // controle segmentado esquerda/centro/direita/justificado

export interface BlockField {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  options?: { value: string; label: string }[];
  slot?: boolean;
  itemLabel?: string;
  itemFields?: BlockField[];
  itemFactory?: () => Record<string, any>;
}

export interface PropImageSlot {
  key: string;
  label: string;
}

export interface BlockDefinition {
  type: string;
  name: string;
  description: string;
  icon: LucideIcon;
  fields: BlockField[];
  layoutFields?: BlockField[];
  propImageSlots?: PropImageSlot[];
  variants?: { value: string; label: string; description: string }[];
  defaultVariant?: string;
  factory: () => { content: Record<string, any>; props?: Record<string, any> };
}

// Helpers de campos de layout
export const ALIGN_FIELD: BlockField = { key: 'align', label: 'Alinhamento do Texto', kind: 'align' };

export const BACKGROUND_OPTIONS = [
  { value: 'white', label: 'Branco' },
  { value: 'cream', label: 'Creme' },
  { value: 'linen', label: 'Linho' },
  { value: 'dark', label: 'Escuro' },
];

export const backgroundField = (): BlockField => ({
  key: 'background',
  label: 'Fundo da Seção',
  kind: 'select',
  options: BACKGROUND_OPTIONS,
});

export const TEXT_COLOR_OPTIONS = [
  { value: 'default', label: 'Padrão (Automático)' },
  { value: 'dark', label: 'Grafite Escuro' },
  { value: 'black', label: 'Preto Puro' },
  { value: 'light', label: 'Branco / Claro' },
  { value: 'warm', label: 'Tons Quentes (Marrom)' },
  { value: 'accent', label: 'Dourado / Acento' },
];

export const textColorField = (): BlockField => ({
  key: 'text_color',
  label: 'Cor do Texto',
  kind: 'select',
  options: TEXT_COLOR_OPTIONS,
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
export const infoItem = () => ({ id: crypto.randomUUID(), title: '', body: '' });

export const BLOCK_REGISTRY: Record<string, BlockDefinition> = {
  CoverBlock: {
    type: 'CoverBlock',
    name: 'Capa',
    description: 'Seção de abertura com imagem',
    icon: ImageIcon,
    fields: [
      { key: 'eyebrow', label: 'Rótulo Superior (Eyebrow)', kind: 'text', placeholder: 'Proposta personalizada' },
      { key: 'title', label: 'Título Principal', kind: 'textarea', placeholder: 'Seu momento merece ser vivido' },
      { key: 'title_italic', label: 'Título em Itálico', kind: 'text', placeholder: 'e lembrado para sempre.' },
      { key: 'subtitle', label: 'Subtítulo', kind: 'textarea', placeholder: 'Fotografias que eternizam...' },
      { key: 'photographer_name', label: 'Assinatura (Fotógrafo)', kind: 'text', placeholder: 'Camila Ramos · Fotografias' },
      { key: 'btnText', label: 'Texto do Botão', kind: 'text', placeholder: 'Quero viver essa experiência' },
      { key: 'btnLink', label: 'Link do Botão', kind: 'url', placeholder: 'https://wa.me/5511999999999' },
      { key: 'image_url', label: 'Imagem de Capa', kind: 'image' },
    ],
    layoutFields: [ALIGN_FIELD, backgroundField(), textColorField()],
    variants: [
      { value: 'minimal-center', label: 'Minimal', description: 'Editorial Minimalista' },
      { value: 'poster-split', label: 'Poster', description: 'Pôster Tipográfico em Grid' },
      { value: 'seam-side', label: 'Split Lateral', description: 'Costura Lateral 50/50' },
      { value: 'hero-full', label: 'Hero Fotográfico', description: 'Imersivo Full-Bleed' },
      { value: 'editorial-diptych', label: 'Díptico', description: 'Díptico Editorial' },
      { value: 'floating-frame', label: 'Moldura', description: 'Moldura Flutuante Fine Art' },
      { value: 'poster-sky', label: 'Pôster Editorial', description: 'Foto sangrada, título no topo e assinatura no rodapé' },
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
      { key: 'vertical_label', label: 'Assinatura Vertical', kind: 'text', placeholder: 'Camila Ramos · Fotografias' },
      { key: 'aside', label: 'Frases de destaque (Retrato em Arco)', kind: 'textarea', placeholder: 'Toda história\ncomeça com uma memória.' },
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
      },
    ],
    layoutFields: [ALIGN_FIELD, backgroundField(), textColorField()],
    variants: [
      { value: 'overlap-blend', label: 'Fotos Sobrepostas', description: 'Duas fotos com blend mode (padrão)' },
      { value: 'split-portrait', label: 'Split Retrato', description: 'Texto à esquerda + foto retrato à direita' },
      { value: 'text-only', label: 'Só Texto', description: 'Texto estilizado sem fotos' },
      { value: 'arch-portrait', label: 'Retrato em Arco', description: 'Sobre você: texto, frases de destaque e retrato em arco' },
    ],
    defaultVariant: 'overlap-blend',
    propImageSlots: [
      { key: 'photo_a', label: 'Foto Principal (Plano de fundo)' },
      { key: 'photo_b', label: 'Foto Sobreposta (Blend)' },
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
      { key: 'subtitle', label: 'Frase de apoio', kind: 'textarea', placeholder: 'Escolha a melhor experiência para registrar o que é de vocês.' },
      {
        key: 'packages',
        label: 'Pacotes',
        kind: 'list',
        itemLabel: 'Pacote',
        itemFields: [
          { key: 'name', label: 'Nome', kind: 'text', placeholder: 'Essencial' },
          { key: 'price', label: 'Preço (texto livre)', kind: 'text', placeholder: 'R$ 1.200' },
          { key: 'price_unit', label: 'Unidade', kind: 'text', placeholder: 'sessão' },
          { key: 'price_cash', label: 'Preço à Vista', kind: 'text', placeholder: 'R$ 250,00' },
          { key: 'price_installments', label: 'Parcelamento', kind: 'text', placeholder: '3x de R$ 89,62' },
          { key: 'badge', label: 'Selo (ex: Mais escolhido)', kind: 'text', placeholder: 'Mais escolhido' },
          { key: 'image_ref', label: 'Imagem do pacote', kind: 'image' },
          { key: 'features', label: 'Itens inclusos (1 por linha)', kind: 'stringlist', placeholder: '1h de ensaio\n10 fotos digitais' },
        ],
        itemFactory: packageItem,
      },
    ],
    layoutFields: [
      ALIGN_FIELD,
      backgroundField(),
      textColorField(),
      { key: 'hide_cta', label: 'Ocultar botão "Selecionar"', kind: 'boolean' },
      { key: 'hide_images', label: 'Ocultar fotos dos pacotes', kind: 'boolean' },
      {
        key: 'numbering',
        label: 'Numeração dos pacotes (Revista)',
        kind: 'select',
        options: [
          { value: 'continue', label: 'Continua do grupo anterior' },
          { value: 'restart', label: 'Recomeça em 01' },
          { value: 'none', label: 'Sem numeração' },
        ],
      },
      { key: 'eyebrow_rules', label: 'Linhas ao lado do rótulo (Revista)', kind: 'boolean' },
      { key: 'hide_feature_icons', label: 'Ocultar ícones dos itens (Revista)', kind: 'boolean' },
    ],
    variants: [
      { value: 'cards-classic', label: 'Cards', description: 'Cards lado a lado (padrão)' },
      { value: 'cards-minimal', label: 'Cards Minimalistas', description: 'Design limpo sem bordas e foto arredondada' },
      { value: 'numbered-editorial', label: 'Editorial Numerado', description: 'Lista numerada com fotos e hairlines' },
      { value: 'magazine', label: 'Revista', description: 'Cartões com foto lateral, numeração e preço à vista/parcelado' },
    ],
    defaultVariant: 'cards-classic',
    factory: () => ({
      content: { eyebrow: '', title: 'Pacotes', packages: [] },
      props: { align: 'center', background: 'white' },
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
      {
        key: 'images',
        label: 'Imagens',
        kind: 'list',
        itemLabel: 'Imagem',
        itemFields: [
          { key: 'image_ref', label: 'Imagem', kind: 'image' },
          {
            key: 'span',
            label: 'Tamanho na grade',
            kind: 'select',
            options: [
              { value: 'normal', label: 'Normal' },
              { value: 'tall_2rows', label: 'Alta (2 linhas)' },
              { value: 'wide_2cols', label: 'Larga (2 colunas)' },
            ],
          },
          {
            key: 'ratio',
            label: 'Proporção (no modo grade)',
            kind: 'select',
            options: IMAGE_RATIO_OPTIONS,
          },
        ],
        itemFactory: galleryItem,
      },
    ],
    layoutFields: [
      ALIGN_FIELD,
      backgroundField(),
      {
        key: 'layout',
        label: 'Disposição das Fotos',
        kind: 'select',
        options: [
          { value: 'masonry', label: 'Masonry (proporção real)' },
          { value: 'grid', label: 'Grade (proporção fixa)' },
          { value: 'editorial-rows', label: 'Linhas Justificadas (editorial)' },
        ],
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
      { key: 'label', label: 'Rótulo', kind: 'text', placeholder: 'PACOTE — ESTÚDIO' },
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
        ],
        itemFactory: infoItem,
      },
    ],
    layoutFields: [ALIGN_FIELD, backgroundField(), textColorField()],
    variants: [
      { value: 'stacked', label: 'Guia', description: 'Título e texto em sequência, como um guia impresso' },
      { value: 'accordion', label: 'Sanfona', description: 'Títulos visíveis e texto ao clicar: ideal para textos longos' },
      { value: 'columns', label: 'Colunas', description: 'Duas colunas: ideal para textos curtos' },
    ],
    defaultVariant: 'stacked',
    factory: () => ({
      content: { eyebrow: '', title: '', image_url: '', items: [] },
      props: { align: 'left', background: 'white' },
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
