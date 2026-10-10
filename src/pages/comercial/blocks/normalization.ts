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
    // Migra o legado uma única vez: `title` vira a única fonte (senão limpar o título reabre o antigo)
    if (rawContent.title_regular !== undefined) {
      rawContent.title ||= rawContent.title_regular;
      delete rawContent.title_regular;
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

const LEGACY_TYPES = new Set([V1_COVER, V1_ABOUT, V1_PACKAGE, V1_PORTFOLIO, 'ContactBlock']);

/**
 * Versão pública: mesma normalização do editor (paridade do que o fotógrafo vê com o que o
 * cliente vê), mas tipos desconhecidos são descartados em vez de virarem o JSON cru em texto.
 */
export function normalizePublicBlocks(raw: any[] | null | undefined): BlockData[] {
  if (!Array.isArray(raw)) return [];
  return normalizeBlocks(raw.filter((b) => b && (BLOCK_REGISTRY[b.type] || LEGACY_TYPES.has(b.type))));
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

/** Renova ids e esvazia a foto de cada item, mantendo o espaço (slot) para o fotógrafo enviar a sua. */
const renewIdsWithoutPhotos = (list: unknown) =>
  Array.isArray(list) ? list.map((item: any) => ({ ...item, id: crypto.randomUUID(), image_ref: '' })) : list;

const clearSlotPhoto = (slot: any) => (slot && typeof slot === 'object' ? { ...slot, image_ref: null } : slot);

/**
 * Instancia os blocos de um modelo garantindo que:
 * 1. IDs sejam renovados (evitando colisão de chaves no React e estado compartilhado).
 * 2. Dados do autor do modelo sejam limpos, mantendo a estrutura e o design visual.
 * 3. Chaves internas de listas (pacotes, imagens, detalhes) sejam renovadas.
 * 4. As variáveis do fotógrafo (assinatura, pacotes reais) alimentem o modelo.
 * 5. Fotos do modelo fiquem só na vitrine: a proposta nasce com os espaços vazios, para
 *    nenhum cliente receber fotos que não são do fotógrafo que enviou.
 */
export function instantiateTemplateBlocks(rawBlocks: any[], vars: TemplateVars = {}): any[] {
  if (!Array.isArray(rawBlocks)) return [];
  const signature = vars.photographerName?.trim() ?? '';
  const realPackages = vars.packages?.length ? vars.packages : null;
  let realPackagesPlaced = false;
  const DROP = Symbol('drop');

  return rawBlocks.map((block): any => {
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
        content.image_url = '';
        if ('photo_b' in content) content.photo_b = '';
        break;
      case 'EditorialBlock':
        content.vertical_label = signature;
        content.details = renewIds(content.details);
        props.photo_a = clearSlotPhoto(props.photo_a);
        props.photo_b = clearSlotPhoto(props.photo_b);
        break;
      case 'EditorialComposition':
        content.side_label = signature;
        content.image_url = '';
        break;
      case 'PricingTable':
        // Pacotes reais entram UMA vez (no 1º bloco de preços): grupos extras do modelo
        // (ex.: "Estúdio" + "Estúdio ou externo") sairiam com os mesmos pacotes duplicados.
        if (realPackages && realPackagesPlaced) return DROP;
        if (realPackages) realPackagesPlaced = true;
        content.packages = renewIdsWithoutPhotos(realPackages ?? content.packages);
        break;
      case 'Gallery':
        content.images = renewIdsWithoutPhotos(content.images);
        break;
      case 'InfoBlock':
        content.items = renewIds(content.items);
        content.image_url = '';
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
  }).filter((b) => b !== DROP);
}

/** Chaves de item que só existem por estrutura (slot de galeria, unidade do pacote): não são conteúdo. */
const STRUCTURAL_KEYS = new Set(['id', 'span', 'ratio', 'price_unit']);

/**
 * Vazio recursivo: null, texto em branco, lista só de vazios (`['']` do stringlist) e objeto
 * sem conteúdo real (slot de galeria sem foto). Números e booleanos nunca são vazios.
 */
export const isEmptyValue = (v: unknown): boolean =>
  v == null ||
  (typeof v === 'string'
    ? !v.trim()
    : Array.isArray(v)
    ? v.every(isEmptyValue)
    : typeof v === 'object'
    ? Object.entries(v as object).every(([k, x]) => STRUCTURAL_KEYS.has(k) || isEmptyValue(x))
    : false);

export interface TemplateSwitchResult {
  blocks: BlockData[];
  /** Ids das seções da proposta sem par no modelo (mantidas logo após a seção que as precedia). */
  unmatched: string[];
  /** Ids das seções novas trazidas pelo modelo (texto de exemplo do autor: revisar). */
  added: string[];
}

/**
 * Troca de modelo preservando o que o fotógrafo preencheu.
 * `templateBlocks` = `instantiateTemplateBlocks(blocks_json, { photographerName })`, SEM `packages`
 * (a regra de pacotes reais do hidratador apagaria grupos de preços e quebraria o pareamento).
 *
 * - Pareamento por tipo e ordem: cada seção do modelo pega a próxima seção ainda livre do mesmo tipo.
 * - content: do modelo, e todo valor não vazio da proposta vence (textos, listas, fotos).
 * - props: do modelo (variante, layout, fundo…; ajustes finos de tamanho da variante antiga caem),
 *   exceto as fotos dos slots `photo_a/photo_b`, que ganham a geometria do modelo.
 * - Grupo de preços do modelo sem par é descartado se a proposta já tem pacotes (preço de exemplo nunca vai ao cliente).
 * - Nada da proposta é descartado: seção sem par entra logo após a seção que a precedia.
 */
export function applyTemplate(current: BlockData[], templateBlocks: any[]): TemplateSwitchResult {
  const pool = new Map<string, BlockData[]>();
  for (const b of current) pool.set(b.type, [...(pool.get(b.type) ?? []), b]);
  const hasRealPackages = current.some((b) => b.type === 'PricingTable' && !isEmptyValue(b.content?.packages));
  const placed = new Map<BlockData, BlockData>(); // seção da proposta → seção no resultado
  const added: string[] = [];
  const out: BlockData[] = [];

  for (const t of normalizeBlocks(templateBlocks)) {
    const cur = pool.get(t.type)?.shift();
    if (!cur) {
      if (t.type === 'PricingTable' && hasRealPackages) continue;
      added.push(t.id!);
      out.push(t);
      continue;
    }
    const content: Record<string, any> = { ...t.content };
    for (const [k, v] of Object.entries(cur.content ?? {})) if (!isEmptyValue(v)) content[k] = v;
    const props: Record<string, any> = { ...t.props };
    for (const k of ['photo_a', 'photo_b']) {
      const ref = cur.props?.[k]?.image_ref;
      if (ref) props[k] = { ...(t.props?.[k] ?? cur.props?.[k]), image_ref: ref };
    }
    const merged = { ...t, id: cur.id ?? t.id, content, props };
    placed.set(cur, merged);
    out.push(merged);
  }

  const unmatched: string[] = [];
  let anchor: BlockData | undefined;
  for (const b of current) {
    if (!placed.has(b)) {
      unmatched.push(b.id!);
      out.splice(anchor ? out.indexOf(placed.get(anchor)!) + 1 : 0, 0, b);
      placed.set(b, b);
    }
    anchor = b;
  }
  return { blocks: out, unmatched, added };
}
