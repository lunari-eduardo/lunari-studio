import type { BlockData } from '@/hooks/useMaterialEditor';
import type { Pacote, Produto } from '@/types/configuration';
import { formatCurrency } from '@/utils/currencyUtils';
import { BLOCK_REGISTRY, packageItem } from './registryDefinitions';

// Tipos V1 legados mapeados na normalização
const V1_COVER = 'cover';
const V1_ABOUT = 'about';
const V1_PACKAGE = 'package';
const V1_PORTFOLIO = 'portfolio';

export const BLOCK_UNKNOWN_FALLBACK_TITLE = 'Conteúdo (formato antigo)';

/** Variantes de raiz usadas nos seeds de proposal_templates → variantes atuais. */
const SEED_ROOT_VARIANTS = new Map([
  ['gradient_parallax', 'hero-full'],
  ['row_list_with_photo', 'numbered-editorial'],
]);

function withId(block: Partial<BlockData>): BlockData {
  return {
    id: block.id || `${block.type}-${crypto.randomUUID().slice(0, 8)}`,
    type: block.type!,
    content: block.content ?? {},
    props: block.props,
  } as BlockData;
}

export function normalizeBlock(raw: any): BlockData | null {
  if (!raw || typeof raw !== 'object') return null;
  const type: string = raw.type;

  // V2 nativo: garante id e content
  if (BLOCK_REGISTRY[type]) {
    const def = BLOCK_REGISTRY[type];
    const rawContent = raw.content ?? raw.data ?? {};
    if (rawContent.title_regular && !rawContent.title) {
      rawContent.title = rawContent.title_regular;
    }
    
    const normalized = withId({
      ...raw,
      content: rawContent,
    });

    // Seeds antigos declaram a variante na raiz do bloco (fora de props)
    const rootVariant = SEED_ROOT_VARIANTS.get(raw.variant);
    if (rootVariant && !normalized.props?.variant) {
      normalized.props = { ...normalized.props, variant: rootVariant };
    }

    // Fallback de variantes legadas da capa
    if (type === 'CoverBlock' && normalized.props) {
      const v = normalized.props.variant;
      if (v === 'centered') normalized.props.variant = 'minimal-center';
      if (v === 'split') normalized.props.variant = 'poster-split';
      if (v === 'full' || v === 'gradient_parallax') normalized.props.variant = 'hero-full';
    }

    // Garantir variant default para blocos sem variant definida
    if (def.defaultVariant && !normalized.props?.variant) {
      normalized.props = { ...normalized.props, variant: def.defaultVariant };
    }
    return normalized;
  }

  // Prevenção de erro em documentos corrompidos ou V1 incompleto
  const d: Record<string, any> = raw.data || {};

  switch (type) {
    case V1_COVER:
      return withId({
        type: 'CoverBlock',
        content: {
          eyebrow: '',
          title: d.title || d.title_regular || '',
          title_italic: '',
          subtitle: d.subtitle || '',
          photographer_name: '',
          btnText: d.btnText || '',
          btnLink: d.btnLink || '',
          image_url: d.image_url || '',
        },
        props: { align: 'left' },
      });

    case V1_ABOUT:
      return withId({
        type: 'EditorialBlock',
        content: {
          eyebrow: '',
          title: d.title || d.title_regular || 'Sobre o Estúdio',
          title_italic: '',
          body: d.text || '',
          vertical_label: '',
          details: [],
        },
        props: {
          align: 'left',
          background: 'cream',
          photo_a: { width_pct: 72, height_pct: 80, image_ref: d.photo_url || null },
          photo_b: { width_pct: 62, height_pct: 66, image_ref: null },
        },
      });

    case V1_PACKAGE: {
      const price =
        typeof d.price_cents === 'number' && d.price_cents > 0
          ? `R$ ${(d.price_cents / 100).toLocaleString('pt-BR')}`
          : '';
      const features =
        typeof d.description === 'string'
          ? d.description.split('\n').map((s: string) => s.trim()).filter(Boolean)
          : Array.isArray(d.items)
          ? d.items
          : [];
      return withId({
        type: 'PricingTable',
        content: {
          eyebrow: '',
          title: 'Investimento',
          packages: [
            {
              id: crypto.randomUUID(),
              name: d.title || d.title_regular || d.name || 'Pacote',
              price,
              price_unit: 'sessão',
              badge: d.highlight ? 'Mais escolhido' : '',
              features,
            },
          ],
        },
        props: { align: 'center', background: 'white' },
      });
    }

    case V1_PORTFOLIO:
      return withId({
        type: 'Gallery',
        content: {
          eyebrow: '',
          title: d.title || d.title_regular || 'Portfólio',
          caption: '',
          images: Array.isArray(d.images)
            ? d.images.map((img: any) => ({
                id: crypto.randomUUID(),
                image_ref: typeof img === 'string' ? img : img?.image_ref || '',
                span: typeof img === 'object' ? img?.span || 'normal' : 'normal',
                ratio: typeof img === 'object' ? img?.ratio || 'auto' : 'auto',
              }))
            : [],
        },
        props: { align: 'center', background: 'dark', layout: 'masonry' },
      });

    case 'text':
      return withId({
        type: 'text',
        content: { title: d.title || d.title_regular || '', body: d.body || '' },
        props: { align: 'center', background: 'white' },
      });

    // Alias de modelos antigos: contato vira o CTA de fechamento
    case 'ContactBlock':
      return withId({
        id: raw.id,
        type: 'CTABlock',
        content: { cta_text: raw.content?.title || d.title || 'Vamos conversar?', body: '', btnText: '', phone: '', links: [] },
        props: { background: 'cream' },
      });

    default:
      console.warn("%s", `Tipo de bloco desconhecido na normalização: ${type}`, raw);
      // Tipo desconhecido: preserva como bloco de texto livre para não perder conteúdo
      return withId({
        type: 'text',
        content: { title: BLOCK_UNKNOWN_FALLBACK_TITLE, body: JSON.stringify(raw ?? {}, null, 2) },
        props: { align: 'center', background: 'white' },
      });
  }
}

export function normalizeBlocks(raw: any[] | null | undefined): BlockData[] {
  if (!Array.isArray(raw)) return [];
  const out: BlockData[] = [];
  for (const b of raw) {
    if (!b || typeof b !== 'object') continue;
    if (b.type === 'global_settings') continue; // tratado à parte pelo editor
    const n = normalizeBlock(b);
    if (n) out.push(n);
  }
  return out;
}

/** Variáveis do fotógrafo injetadas no modelo no momento da instanciação. */
export interface TemplateVars {
  /** Assinatura (perfil: empresa || nome). Ausente = campos de assinatura limpos. */
  photographerName?: string;
  /** Pacotes reais da categoria, já no formato da PricingTable. Vazio = mantém os do modelo. */
  packages?: Record<string, any>[];
}

/**
 * Pacote cadastrado (Configurações) → item da PricingTable.
 * O preço é texto de vitrine da proposta, não um valor financeiro persistido.
 */
export function pacoteToProposalPackage(p: Pacote, produtos: Produto[] = []) {
  const nomeProduto = new Map(produtos.map((pr) => [pr.id, pr.nome]));
  const min = p.duracao_minutos ?? 0;
  const features = [
    min >= 60
      ? `${(min / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h de sessão`
      : min > 0 ? `${min} min de sessão` : '',
    p.fotos_incluidas > 0 ? `${p.fotos_incluidas} fotos incluídas` : '',
    ...(p.produtosIncluidos ?? []).map(({ produtoId, quantidade }) => {
      const nome = nomeProduto.get(produtoId);
      return nome ? (quantidade > 1 ? `${quantidade}× ${nome}` : nome) : '';
    }),
  ].filter(Boolean);
  return { ...packageItem(), name: p.nome, price: formatCurrency(p.valor_base), features };
}

const renewIds = (list: unknown) =>
  Array.isArray(list) ? list.map((item: any) => ({ ...item, id: crypto.randomUUID() })) : list;

/**
 * Instancia os blocos de um modelo garantindo que:
 * 1. IDs sejam renovados (evitando colisão de chaves no React e estado compartilhado).
 * 2. Dados do autor do modelo sejam limpos, mantendo a estrutura e o design visual.
 * 3. Chaves internas de listas (pacotes, imagens, detalhes) sejam renovadas.
 * 4. As variáveis do fotógrafo (assinatura, pacotes reais) alimentem o modelo.
 */
export function instantiateTemplateBlocks(rawBlocks: any[], vars: TemplateVars = {}): any[] {
  if (!Array.isArray(rawBlocks)) return [];
  const signature = vars.photographerName?.trim() ?? '';
  const realPackages = vars.packages?.length ? vars.packages : null;

  return rawBlocks.map(block => {
    if (!block || typeof block !== 'object') return block;
    if (block.type === 'global_settings') return block; // Preserva configurações globais sem ID

    const newId = `${block.type}-${crypto.randomUUID().slice(0, 8)}`;

    // Deep clone: instâncias do mesmo modelo nunca compartilham referências
    const content = block.content ? JSON.parse(JSON.stringify(block.content)) : {};
    const props = block.props ? JSON.parse(JSON.stringify(block.props)) : {};

    switch (block.type) {
      case 'CoverBlock':
        content.photographer_name = signature;
        if (typeof content.btnLink === 'string' && content.btnLink.includes('wa.me')) content.btnLink = '';
        break;
      case 'EditorialBlock':
        content.vertical_label = signature;
        content.details = renewIds(content.details);
        break;
      case 'EditorialComposition':
        content.side_label = signature;
        break;
      case 'PricingTable':
        content.packages = renewIds(realPackages ?? content.packages);
        break;
      case 'Gallery':
        content.images = renewIds(content.images);
        break;
      case 'TestimonialBlock':
        // Depoimentos do autor do modelo nunca chegam ao cliente final como se fossem reais.
        content.items = [];
        break;
      case 'CTABlock':
        content.phone = '';
        content.links = [];
        break;
      case 'FooterTerms':
        content.copyright = signature ? `© ${new Date().getFullYear()} ${signature}` : '';
        break;
    }

    return { ...block, id: newId, content, props };
  });
}
