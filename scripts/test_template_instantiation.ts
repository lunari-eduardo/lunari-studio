// Rodar: npm run test:proposals
import fs from 'fs';
import path from 'path';
import { instantiateTemplateBlocks, pacoteToProposalPackage, normalizeBlock, normalizeBlocks, applyTemplate, isEmptyValue, BLOCK_UNKNOWN_FALLBACK_TITLE } from '../src/pages/comercial/blocks/normalization';
import { onColor, contrastRatio, tokensToCssVars, PROPOSAL_FONTS, backgroundSwatchColor } from '../src/pages/comercial/blocks/design';
import { applyBackgroundToAll } from '../src/pages/comercial/blocks/sectionBackground';
import { fillGallerySlots, packageGroupItem, editedOnCanvas, BLOCK_REGISTRY } from '../src/pages/comercial/blocks/registryDefinitions';
import { featureIcon, computePackageNumberOffsets, displayPrice, priceEditPath, splitPrice, splitLeadingNumber, buildPackagePages, packageGroupKey, slicePad, reorderWithin, movePackageToGroup, removeGroupKeepingPackages, duplicatePackageAfter } from '../src/pages/comercial/blocks/pricing';
import { resolveItem, displayOrder, neighbors, patchItem, sameRef } from '../src/pages/comercial/blocks/inspectorFocus';
import { PROPOSAL_ICONS, ICON_NONE, resolveIconKey, suggestIcon, addonIcon, infoIcon } from '../src/pages/comercial/blocks/icons';
import { createBlock, getSectionTitle } from '../src/pages/comercial/blocks/registry';
import { forCollection, optionsFor, templateCollection } from '../src/pages/comercial/blocks/collections';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('Running Template Sanitization Tests...');
  
  const mockTemplateBlocks = [
    {
      type: 'CoverBlock',
      id: 'CoverBlock-123',
      content: {
        photographer_name: 'John Doe',
        title: 'Casamento',
        subtitle: 'Para Maria e João',
        btnLink: 'https://wa.me/5511999999999'
      },
      props: { align: 'center' }
    },
    {
      type: 'EditorialBlock',
      id: 'EditorialBlock-123',
      content: {
        vertical_label: 'Jane Doe Photography',
        details: [
          { id: 'det-1', label: 'Local', value: 'São Paulo' }
        ]
      }
    },
    {
      type: 'EditorialComposition',
      id: 'EditorialComposition-123',
      content: {
        side_label: 'Studio Lunari'
      }
    },
    {
      type: 'PricingTable',
      id: 'PricingTable-123',
      content: {
        title: 'Investimento',
        packages: [
          { id: 'pkg-1', name: 'Básico', price: 'R$ 1000' }
        ]
      }
    },
    {
      type: 'global_settings',
      data: { design_tokens: { colors: { primary: '#000' } } }
    }
  ];

  // Instantiating twice from the same template
  const instance1 = instantiateTemplateBlocks(mockTemplateBlocks);
  const instance2 = instantiateTemplateBlocks(mockTemplateBlocks);

  // 1. NÃO compartilham referências de blocos (chaves)
  const cover1 = instance1.find((b: any) => b.type === 'CoverBlock');
  const cover2 = instance2.find((b: any) => b.type === 'CoverBlock');
  assert(cover1.id !== cover2.id, 'Block IDs must be different');
  assert(cover1.id !== 'CoverBlock-123', 'Block ID must be renewed from template');

  const pricing1 = instance1.find((b: any) => b.type === 'PricingTable');
  const pricing2 = instance2.find((b: any) => b.type === 'PricingTable');
  assert(pricing1.id !== pricing2.id, 'PricingTable block IDs must be different');
  
  // Test nested keys (PricingTable)
  const pkg1 = pricing1.content.packages[0];
  const pkg2 = pricing2.content.packages[0];
  assert(pkg1.id !== pkg2.id, 'Nested package IDs must be different');
  assert(pkg1.id !== 'pkg-1', 'Nested package ID must be renewed from template');

  // Test nested keys (EditorialBlock details)
  const editorial1 = instance1.find((b: any) => b.type === 'EditorialBlock');
  const editorial2 = instance2.find((b: any) => b.type === 'EditorialBlock');
  assert(editorial1.content.details[0].id !== editorial2.content.details[0].id, 'Nested details IDs must be different');
  assert(editorial1.content.details[0].id !== 'det-1', 'Nested detail ID must be renewed');

  // 2. NÃO compartilham dados pessoais
  assert(cover1.content.photographer_name === '', 'Photographer name must be cleaned');
  assert(cover1.content.btnLink === '', 'wa.me btnLink must be cleaned');
  assert(cover1.content.title === 'Casamento', 'Title must be preserved');
  assert(editorial1.content.vertical_label === '', 'Vertical label must be cleaned');
  
  const comp1 = instance1.find((b: any) => b.type === 'EditorialComposition');
  assert(comp1.content.side_label === '', 'Side label must be cleaned');
  
  // 3. NÃO dividem estado de edição (histórico independente) - deep clone check
  cover1.content.title = 'Casamento Editado';
  assert(cover2.content.title === 'Casamento', 'Modifying one instance should not affect the other (Deep Clone failed)');
  
  // 4. Global settings preserved without ID modification
  const gs1 = instance1.find((b: any) => b.type === 'global_settings');
  assert(gs1.data.design_tokens.colors.primary === '#000', 'Global settings must be preserved');

  // 5. Variáveis dinâmicas: assinatura do perfil + pacotes reais da categoria
  const pacote = {
    id: 'pac-1', nome: 'Ensaio Gestante', categoria_id: 'cat-1', valor_base: 1490, valor_foto_extra: 0,
    fotos_incluidas: 30, duracao_minutos: 120, produtosIncluidos: [{ produtoId: 'prod-1', quantidade: 2 }],
  };
  const realPkg = pacoteToProposalPackage(pacote, [{ id: 'prod-1', nome: 'Álbum 30x30', preco_custo: 0, preco_venda: 0 }]);
  assert(realPkg.name === 'Ensaio Gestante', 'Package name must come from pacote.nome');
  assert(realPkg.price.replace(/\s/g, ' ') === 'R$ 1.490,00', `Price must be BRL formatted (got ${realPkg.price})`);
  assert(realPkg.features.join('|') === '2h de sessão|30 fotos incluídas|2× Álbum 30x30', `Features mismatch: ${realPkg.features}`);

  const closingTemplate = [
    ...mockTemplateBlocks,
    { type: 'TestimonialBlock', id: 't', content: { title: 'Depoimentos', items: [{ id: 'x', quote: 'Fictício', author: 'Autor do modelo' }] } },
    { type: 'CTABlock', id: 'c', content: { cta_text: 'Vamos?', phone: '+55 51 98765-4321', links: [{ id: 'l', label: '@autor', href: 'https://x' }] } },
    { type: 'FooterTerms', id: 'f', content: { copyright: '© Autor do modelo' } },
  ];
  const hydrated = instantiateTemplateBlocks(closingTemplate, { photographerName: '  Estúdio Luz ', packages: [realPkg] });
  const byType = (t: string) => hydrated.find((b: any) => b.type === t);
  assert(byType('CoverBlock').content.photographer_name === 'Estúdio Luz', 'Signature must hydrate the cover');
  assert(byType('EditorialBlock').content.vertical_label === 'Estúdio Luz', 'Signature must hydrate the vertical label');
  const pkgs = byType('PricingTable').content.packages;
  assert(pkgs.length === 1 && pkgs[0].name === 'Ensaio Gestante', 'Real packages must replace template demo packages');
  assert(pkgs[0].id !== realPkg.id, 'Hydrated package ids must be fresh');
  assert(byType('TestimonialBlock').content.items.length === 0, 'Template testimonials must never reach the client');
  assert(byType('CTABlock').content.phone === '' && byType('CTABlock').content.links.length === 0, 'Template author contacts must be cleaned');
  assert(/^© \d{4} Estúdio Luz$/.test(byType('FooterTerms').content.copyright), 'Footer must be signed with the profile');

  const noPkgs = instantiateTemplateBlocks(mockTemplateBlocks, { packages: [] });
  assert(noPkgs.find((b: any) => b.type === 'PricingTable').content.packages[0].name === 'Básico', 'No real packages keeps the template ones');

  // 6. Seeds antigos: variante na raiz, ContactBlock e blocos de fechamento registrados
  assert(normalizeBlock({ type: 'CoverBlock', variant: 'gradient_parallax', content: {} })!.props!.variant === 'hero-full', 'Root cover variant must map');
  assert(normalizeBlock({ type: 'PricingTable', variant: 'row_list_with_photo', content: {} })!.props!.variant === 'numbered-editorial', 'Root pricing variant must map');
  assert(normalizeBlock({ type: 'ContactBlock', id: 'k', content: { title: 'Fale comigo' } })!.type === 'CTABlock', 'ContactBlock must alias to CTABlock');
  assert(normalizeBlock({ type: 'TestimonialBlock', content: { items: [] } })!.type === 'TestimonialBlock', 'TestimonialBlock must be a registered type');

  // 7. Contraste automático do tema (fundo "creme" escuro do Noir pede texto claro)
  assert(onColor('#232019', '#141210', '#F5F2EC') === '#F5F2EC', 'Dark surface must get light text');
  assert(onColor('#FDFBF7', '#2C2825', '#FFFFFF') === '#2C2825', 'Light surface must get ink text');

  // 8. Pacotes "Revista": ícone pelo texto (textos reais do PDF de referência), sem ícone de sentido errado
  const iconName = (t: string) => (featureIcon(t) as any)?.displayName ?? null;
  assert(iconName('5 fotos entregues em arquivo digital e impressas 15x20') === 'Folder', 'Delivery item -> Folder');
  assert(iconName('Foto extra R$25,00') === 'Asterisk', 'Extra photo -> Asterisk (before Folder)');
  assert(iconName('1 look, até 40m de sessão.') === 'Clock', 'Session length -> Clock');
  assert(iconName('Até 2 looks. 1h de sessão.') === 'Clock', '1h -> Clock');
  assert(iconName('1h30 de ensaio') === 'Clock', '1h30 -> Clock');
  assert(iconName('2× Álbum 30x30') === 'Folder', 'Album -> Folder');
  assert(iconName('Maquiagem inclusa') === null, 'Unknown item -> neutral diamond');

  // 9. Numeração contínua entre grupos "magazine" (01 02 | 03), restart e none
  const mag = (n: number, numbering?: string) => ({
    type: 'PricingTable',
    content: { packages: Array.from({ length: n }, () => ({})) },
    props: { variant: 'magazine', numbering },
  });
  const g1 = mag(2), cover = { type: 'CoverBlock' }, g2 = mag(1), classic = { type: 'PricingTable', content: { packages: [{}] }, props: {} };
  const offs = computePackageNumberOffsets([cover, g1, classic, g2] as any);
  assert(offs.get(g1) === 0 && offs.get(g2) === 2 && !offs.has(classic), 'Second magazine group must continue at 03');
  const hidden = mag(3, 'none'), after = mag(1), restart = mag(1, 'restart');
  const offs2 = computePackageNumberOffsets([g1, hidden, after, restart] as any);
  assert(offs2.get(after) === 2, "'none' must not consume numbers");
  assert(offs2.get(restart) === 0, "'restart' must start at 01");

  // 10. Preço único entre variantes
  assert(displayPrice({ price: 'R$ 1', price_cash: 'R$ 2' }) === 'R$ 2', 'price_cash wins when present');
  assert(priceEditPath({ price: 'R$ 1' }, 3) === 'packages.3.price', 'Edits the displayed field (price)');
  assert(priceEditPath({ price_cash: 'R$ 2' }, 0) === 'packages.0.price_cash', 'Edits the displayed field (price_cash)');

  // 11. Fotos do modelo ficam só na vitrine (proposta nasce com os espaços vazios)
  const photoTemplate = [
    { type: 'CoverBlock', id: 'c', content: { image_url: 'https://x/capa.jpg', photo_b: 'https://x/b.jpg', title: 'Entre nós' } },
    { type: 'EditorialBlock', id: 'e', content: { aside: 'Frase' }, props: { variant: 'arch-portrait', photo_a: { width_pct: 72, image_ref: 'https://x/a.jpg' } } },
    { type: 'EditorialComposition', id: 'ec', content: { image_url: 'https://x/ec.jpg' } },
    { type: 'Gallery', id: 'g', content: { images: [{ id: 'i1', image_ref: 'https://x/1.jpg', span: 'tall_2rows' }] } },
    { type: 'PricingTable', id: 'p', content: { packages: [{ id: 'k', name: 'Demo', image_ref: 'https://x/p.jpg' }] } },
    { type: 'InfoBlock', id: 'in', content: { image_url: 'https://x/banner.jpg', items: [{ id: 'it', title: 'O que vestir', body: 'Leve' }] } },
  ];
  const clean = instantiateTemplateBlocks(photoTemplate, { packages: [realPkg] });
  const t = (type: string) => clean.find((b: any) => b.type === type);
  const leaked = JSON.stringify(clean).match(/https:\/\/x\/[^"]+/g);
  assert(!leaked, `Template photos must never reach a proposal (leaked: ${leaked})`);
  assert(t('Gallery').content.images.length === 1 && t('Gallery').content.images[0].span === 'tall_2rows', 'Gallery keeps its photo slots');
  assert(t('EditorialBlock').props.photo_a.width_pct === 72, 'Photo slot geometry is preserved');
  assert(t('CoverBlock').content.title === 'Entre nós' && t('EditorialBlock').content.aside === 'Frase', 'Texts are preserved');
  const info = t('InfoBlock').content.items[0];
  assert(info.id !== 'it' && info.title === 'O que vestir', 'InfoBlock items get fresh ids and keep text');

  // 12. Modelo com 2 grupos de pacotes: reais entram uma vez só; sem reais, os dois grupos demo ficam
  const twoGroups = [
    { type: 'PricingTable', id: 'g1', content: { title: 'Estúdio', packages: [{ id: 'a', name: 'Demo A' }] } },
    { type: 'CTABlock', id: 'x', content: {} },
    { type: 'PricingTable', id: 'g2', content: { title: 'Externo', packages: [{ id: 'b', name: 'Demo B' }] } },
  ];
  const withReal = instantiateTemplateBlocks(twoGroups, { packages: [realPkg] });
  const pricing = withReal.filter((b: any) => b.type === 'PricingTable');
  assert(pricing.length === 1 && pricing[0].content.title === 'Estúdio', 'Extra template pricing groups are dropped when real packages exist');
  assert(withReal.length === 2 && withReal[1].type === 'CTABlock', 'Other blocks are kept in order');
  const demoOnly = instantiateTemplateBlocks(twoGroups);
  assert(demoOnly.filter((b: any) => b.type === 'PricingTable').length === 2, 'Without real packages both demo groups stay');

  // 13. Troca de modelo: estrutura e design do modelo, conteúdo da proposta preservado
  const cur: any[] = [
    { type: 'CoverBlock', id: 'c', content: { title: 'Ana & Leo', subtitle: '', image_url: 'https://me/capa.jpg' }, props: { variant: 'hero-full', background: 'dark', typography: { titleSize: 88 } } },
    { type: 'EditorialBlock', id: 'e', content: { body: 'Meu texto', details: [] }, props: { variant: 'overlap-blend', photo_a: { width_pct: 50, image_ref: 'https://me/a.jpg' } } },
    { type: 'Gallery', id: 'g', content: { images: [{ id: 'i', image_ref: '', span: 'normal', ratio: 'auto' }] }, props: { layout: 'masonry' } },
    { type: 'InfoBlock', id: 'tips', content: { items: [{ id: 'a', title: 'Vestir', body: 'Leve' }] }, props: { variant: 'stacked' } },
    { type: 'InfoBlock', id: 'terms', content: { items: [{ id: 'b', title: 'Pagamento', body: 'Pix' }] }, props: { variant: 'stacked' } },
    { type: 'PricingTable', id: 'p1', content: { packages: [{ id: 'k1', name: 'Meu pacote', price: 'R$ 900', features: [''] }] }, props: { variant: 'cards-classic' } },
    { type: 'PricingTable', id: 'p2', content: { packages: [{ id: 'k2', name: 'Externo' }] }, props: { variant: 'cards-classic' } },
    { type: 'CTABlock', id: 'cta', content: { cta_text: 'Bora?', links: [{ id: 'l', label: '@me', href: 'https://ig' }] }, props: { background: 'dark' } },
    { type: 'FooterTerms', id: 'f', content: { terms: 'Meus termos' }, props: {} },
  ];
  const tpl = instantiateTemplateBlocks([
    { type: 'CoverBlock', content: { title: 'Entre nós', subtitle: 'Do modelo', image_url: 'https://x/c.jpg' }, props: { variant: 'poster-sky', background: 'white' } },
    { type: 'EditorialBlock', content: { aside: 'Frase' }, props: { variant: 'arch-portrait', photo_a: { width_pct: 72, image_ref: 'https://x/a.jpg' } } },
    { type: 'Gallery', content: { images: [{ id: 's', image_ref: 'https://x/1.jpg', span: 'tall_2rows', ratio: '4/5' }] }, props: { layout: 'grid' } },
    { type: 'PricingTable', content: { title: 'Investimento', packages: [{ id: 'd', name: 'Demo', price: 'R$ 300' }] }, props: { variant: 'magazine' } },
    { type: 'InfoBlock', content: { title: 'Bom saber', items: [{ id: 't', title: 'Modelo', body: 'Modelo' }] }, props: { variant: 'accordion' } },
    { type: 'TestimonialBlock', content: { title: 'Depoimentos', items: [] } },
    { type: 'CTABlock', content: { cta_text: 'Vamos?' }, props: { background: 'cream' } },
    { type: 'global_settings', data: { design_tokens: {} } },
  ], { photographerName: 'Estúdio Luz' });
  const sw = applyTemplate(cur, tpl);
  const at = (id: string) => sw.blocks.find((b) => b.id === id)!;
  assert(sw.blocks.map((b) => b.id).join() === `c,e,g,p1,p2,tips,terms,${sw.added[0]},cta,f`, `Switch order: ${sw.blocks.map((b) => b.id)}`);
  assert(sw.unmatched.join() === 'terms,p2,f', 'Unmatched sections are kept, in document order');
  assert(sw.added.length === 1 && at(sw.added[0]).type === 'TestimonialBlock', 'Template-only section is added');
  assert(!sw.blocks.some((b) => b.type === 'global_settings'), 'global_settings never becomes a section');
  assert(at('c').content!.title === 'Ana & Leo' && at('c').content!.subtitle === 'Do modelo', 'Filled text wins, empty gets template copy');
  assert(at('c').content!.image_url === 'https://me/capa.jpg' && at('c').content!.photographer_name === 'Estúdio Luz', 'Photo kept, signature hydrated');
  assert(at('c').props!.variant === 'poster-sky' && at('c').props!.background === 'white' && !at('c').props!.typography, 'Design from template, size overrides dropped');
  assert(at('e').props!.photo_a.image_ref === 'https://me/a.jpg' && at('e').props!.photo_a.width_pct === 72, 'Slot photo kept with template geometry');
  assert(at('e').content!.aside === 'Frase' && at('e').content!.body === 'Meu texto', 'Editorial content merged');
  assert(at('g').content!.images[0].span === 'tall_2rows' && at('g').props!.layout === 'grid', 'Empty gallery takes the template slots');
  assert(at('p1').content!.packages[0].name === 'Meu pacote' && at('p1').props!.variant === 'magazine', 'Packages kept, template variant applied');
  assert(at('p2').props!.variant === 'cards-classic', 'Unmatched section is untouched');
  assert(at('tips').props!.variant === 'accordion' && at('tips').content!.items[0].title === 'Vestir', 'Repeated types pair in order');
  assert(at('cta').content!.links.length === 1 && at('cta').props!.background === 'cream', 'CTA links kept, template background');
  assert(!JSON.stringify(sw.blocks).includes('https://x/'), 'Template photos never leak on switch');
  assert(cur[0].props.typography.titleSize === 88 && cur[0].content.subtitle === '', 'Input blocks are not mutated');
  assert(isEmptyValue([{ id: 'x', image_ref: '', span: 'wide_2cols', ratio: '4/5' }]) && isEmptyValue(['']) && isEmptyValue({ id: 'k', price_unit: 'sessão', features: [] }), 'Empty kinds');
  assert(!isEmptyValue([{ id: 'k', name: 'A' }]) && !isEmptyValue(0) && !isEmptyValue(false), 'Item with text, numbers and booleans are content');
  const two = applyTemplate(
    [{ type: 'PricingTable', id: 'only', content: { packages: [{ id: 'k', name: 'Real' }] }, props: {} }],
    instantiateTemplateBlocks([
      { type: 'PricingTable', content: { packages: [{ id: 'a', name: 'Demo A' }] } },
      { type: 'PricingTable', content: { packages: [{ id: 'b', name: 'Demo B' }] } },
    ])
  );
  assert(two.blocks.length === 1 && two.blocks[0].id === 'only', 'Extra template pricing group never brings demo prices');
  const lead = applyTemplate([{ type: 'DividerBlock', id: 'd', content: {}, props: {} }, cur[0]], instantiateTemplateBlocks([{ type: 'CoverBlock', content: {} }]));
  assert(lead.blocks.map((b) => b.id).join() === 'd,c', 'Unmatched first section stays first');

  // 14. Galeria: fotos novas ocupam os espaços vazios do modelo antes de entrar no fim
  const slots = [
    { id: 's1', image_ref: 'https://me/1.jpg', span: 'normal' },
    { id: 's2', image_ref: '', span: 'feature_2x2' },
    { id: 's3', image_ref: '', span: 'wide_2cols' },
  ];
  const filledGallery = fillGallerySlots(slots, ['a', 'b', 'c']);
  assert(filledGallery.map((i) => i.image_ref).join() === 'https://me/1.jpg,a,b,c', 'Uploads fill empty slots in order, then append');
  assert(filledGallery[1].span === 'feature_2x2' && filledGallery[1].id === 's2', 'Filled slot keeps its template size and id');
  assert(filledGallery[3].id && filledGallery[3].span === 'normal', 'Extra photos become normal items with ids');
  assert(slots[1].image_ref === '', 'Gallery input not mutated');

  // 15. Grade antiga: proporção por foto vira a proporção do bloco (painel e arte mostram o mesmo valor)
  const legacyGrid = normalizeBlock({ type: 'Gallery', content: { images: [{ id: 'a', ratio: 'auto' }, { id: 'b', ratio: '1/1' }] }, props: { layout: 'grid' } })!;
  assert(legacyGrid.props!.ratio === '1/1', 'Legacy grid ratio migrates to the block');
  const masonry = normalizeBlock({ type: 'Gallery', content: { images: [{ id: 'a', ratio: '4/3' }] }, props: { layout: 'masonry' } })!;
  assert(!masonry.props!.ratio, 'Masonry keeps per-photo crops only');
  const chosen = normalizeBlock({ type: 'Gallery', content: { images: [{ id: 'a', ratio: '1/1' }] }, props: { layout: 'grid', ratio: '16/9' } })!;
  assert(chosen.props!.ratio === '16/9', 'Chosen block ratio is never overwritten');

  // 16. Tipografia por papéis: destaque e caligrafia só existem quando escolhidos (propostas antigas idênticas)
  const vars = (t: any) => tokensToCssVars(t) as Record<string, any>;
  const plain = vars({ typography: { display: 'Playfair Display', body: 'Inter' } });
  assert(
    ['--pa-font-highlight', '--pa-font-script', '--pa-hl-style', '--pa-script-style'].every((k) => !(k in plain)),
    'No new typography variables without the new tokens'
  );
  const serifHl = vars({ typography: { highlight: 'Bodoni Moda', script: 'Pinyon Script' } });
  assert(serifHl['--pa-font-highlight'] === 'Bodoni Moda' && !('--pa-hl-style' in serifHl), 'Serif highlight keeps its italic');
  assert(serifHl['--pa-font-script'] === 'Pinyon Script' && serifHl['--pa-script-style'] === 'normal', 'Script font never gets a synthetic italic');
  assert(vars({ typography: { highlight: 'Great Vibes' } })['--pa-hl-style'] === 'normal', 'Script chosen as highlight drops the italic');
  assert(Object.values(PROPOSAL_FONTS).every((f) => ['serif', 'sans', 'script'].includes(f.kind)), 'Every catalog font has a kind');
  assert(!Object.values(PROPOSAL_FONTS).some((f) => f.kind === 'script' && f.displayOnly), 'Script fonts are never display-only');

  // 17. Ícones: escolha explícita, padrão da seção, "Sem ícone" e chave desconhecida
  assert(resolveIconKey('camera') === 'camera' && resolveIconKey('', 'users') === 'users', 'Explicit key wins; empty uses the section default');
  assert(resolveIconKey(ICON_NONE, 'users') === null, '"Sem ícone" beats the section default');
  assert(resolveIconKey('removed-key', 'users') === null && resolveIconKey(undefined) === null, 'Unknown or absent icon renders nothing');
  assert(Object.values(PROPOSAL_ICONS).every((d) => !!d.icon && !!d.label), 'Every catalog icon resolves to a component');

  // 18. Seed "Sessões de Natal" (lido do próprio SQL): tudo registrado, paleta legível, instanciação limpa e assinada.
  // O arquivo traz a família (Clássico, Noturno, Essencial): os checks comuns rodam em todos; os do Clássico ficam no 1º.
  const seedSql = fs.readFileSync(path.resolve('supabase/migrations/20270102000000_seed_sessoes_natal_proposal_template.sql'), 'utf-8');
  const seedLiterals = [...seedSql.matchAll(/'((?:[^']|'')*)'::jsonb/g)].map((m) => JSON.parse(m[1].replace(/''/g, "'")));
  const seeds: { blocks: any[]; tokens: any }[] = [];
  for (let i = 0; i + 1 < seedLiterals.length; i += 2) seeds.push({ blocks: seedLiterals[i], tokens: seedLiterals[i + 1] });
  assert(seeds.length === 3 && seedLiterals.length === 6, `Seed has the three Natal models (got ${seeds.length})`);
  for (const { blocks, tokens } of seeds) {
    assert(Array.isArray(blocks) && blocks.length > 0 && !!tokens?.colors, 'Seed jsonb literals parse');
    for (const b of blocks) {
      if (b.type === 'global_settings') continue;
      const def = BLOCK_REGISTRY[b.type];
      assert(!!def, `Seed block type is registered: ${b.type}`);
      const variant = def.variants?.find((v) => v.value === b.props?.variant);
      assert(!b.props?.variant || !!variant, `Seed variant exists: ${b.type}/${b.props?.variant}`);
      assert(!variant?.collection || variant.collection === 'natal', `Seed variant is standard or Natal: ${b.props?.variant}`);
    }
    assert(!normalizeBlocks(blocks).some((b) => b.content?.title === BLOCK_UNKNOWN_FALLBACK_TITLE), 'No seed block falls back to legacy text');
    const icons = [...JSON.stringify(blocks).matchAll(/"icon":"([^"]*)"/g)].map((m) => m[1]);
    assert(icons.every((k) => k === '' || k === ICON_NONE || !!PROPOSAL_ICONS[k]), `Seed icons exist in the catalog: ${icons}`);
    const { colors: c, typography: ty } = tokens;
    assert(contrastRatio(c.ink, c.white) >= 7, 'Natal ink is AAA on ivory');
    assert(contrastRatio(c.taupe, c.white) >= 4.5, 'Natal secondary text is AA on ivory');
    assert(contrastRatio(c.accent, c.white) >= 3, 'Natal accent is legible for large text, prices and icons');
    assert([ty.display, ty.body, ty.script].every((f: string) => !!PROPOSAL_FONTS[f]), 'Seed fonts are in the catalog');
    assert(PROPOSAL_FONTS[ty.script].kind === 'script', 'Seed calligraphy role uses a script font');
  }
  const seedBlocks = seeds[0].blocks;
  const natal = instantiateTemplateBlocks(seedBlocks, { photographerName: 'Estúdio Luz' });
  const natalCovers = natal.filter((b: any) => b.type === 'CoverBlock');
  assert(natalCovers.every((b: any) => b.content.photographer_name === 'Estúdio Luz'), 'Demo studio name becomes the profile signature');
  assert(natalCovers.every((b: any) => !b.content.image_url && !b.content.photo_b && !b.content.photo_c), 'Seed cover photo slots start empty');
  // Uma capa só, com o conteúdo de todas as composições: trocar Arcos/Medalhão/Noturna não perde nada
  const seedCovers = seedBlocks.filter((b: any) => b.type === 'CoverBlock');
  assert(seedCovers.length === 1 && seedCovers[0].props.variant === 'arches-trio', 'Seed has a single cover (Arcos)');
  assert(['photo_b', 'photo_c', 'highlights'].every((k) => k in seedCovers[0].content), 'Seed cover carries the content of every Natal cover');
  assert(!seedCovers[0].props.title_style, 'Cover title style follows each composition default');
  const seedNight = seedCovers[0];
  const night = natalCovers[0];
  assert(
    night.content.highlights.length === seedNight.content.highlights.length &&
      night.content.highlights.every((h: any, i: number) => h.id !== seedNight.content.highlights[i].id && h.label === seedNight.content.highlights[i].label),
    'Cover highlights keep their text and get fresh ids'
  );
  assert(!JSON.stringify(natal).includes('/templates/sessoes-natal/'), 'Seed demo photos never reach a proposal');
  const natalIntro = natal.find((b: any) => b.props?.variant === 'light-intro');
  assert(
    !!natalIntro && natalIntro.props.photo_a.image_ref === null && natalIntro.content.title_italic === 'memórias.',
    'Seed intro keeps its copy and starts with an empty photo slot'
  );
  const introTpl = instantiateTemplateBlocks([
    { type: 'EditorialBlock', content: { title: 'Mais que fotografias,' }, props: { variant: 'light-intro', photo_a: { width_pct: 72, image_ref: 'https://x/luz.jpg' } } },
  ]);
  assert(introTpl[0].props.photo_a.image_ref === null && introTpl[0].props.variant === 'light-intro', 'Intro demo photo never reaches a proposal');

  // Conceito da sessão: 3 composições no mesmo bloco. O modelo carrega os destaques com ícone (ids renovados)
  // e o corpo em dois parágrafos (as duas colunas do "Destaque visual"); arte decorativa é do modelo, a foto não.
  const seedIntro = seedBlocks.find((b: any) => b.props?.variant === 'light-intro');
  assert(
    seedIntro.content.items.length === 3 && seedIntro.content.items.every((it: any) => !!it.title && !!it.body && !!PROPOSAL_ICONS[it.icon]),
    'Seed intro carries the three icon highlights'
  );
  assert(
    natalIntro.content.items.length === 3 &&
      natalIntro.content.items.every((it: any, i: number) => it.id !== seedIntro.content.items[i].id && it.title === seedIntro.content.items[i].title),
    'Intro highlights keep their text and get fresh ids'
  );
  assert(seedIntro.content.body.split(/\n\s*\n/).filter(Boolean).length === 2, 'Seed intro body is two paragraphs (the two columns)');
  const decor = instantiateTemplateBlocks([
    { type: 'EditorialBlock', content: { title: 'x' }, props: { variant: 'arch-hero', photo_a: { image_ref: 'https://x/a.jpg' }, ornament_a: 'https://x/galho.png' } },
  ]);
  assert(decor[0].props.photo_a.image_ref === null && decor[0].props.ornament_a === 'https://x/galho.png', 'Decorative art stays with the model; the demo photo does not');

  // 18b. Coleção Natal: o modelo declara a coleção (tag + global_settings) e a proposta criada herda
  assert(/ARRAY\[[^\]]*'natal'/.test(seedSql), 'Seed is tagged natal (gallery tab)');
  assert(natal.find((b: any) => b.type === 'global_settings')?.data?.collection === 'natal', 'Instantiated proposal keeps the Natal collection');
  assert(templateCollection(['natal', 'sazonal']) === 'natal' && templateCollection(['editorial']) === undefined && templateCollection(null) === undefined, 'Template collection comes from its tag');
  type Opt = { value: string; collection?: string };
  const opts: Opt[] = [{ value: 'std' }, { value: 'arcos', collection: 'natal' }, { value: 'medalhao', collection: 'natal' }];
  const plainOpts: Opt[] = [{ value: 'std' }, { value: 'b' }];
  const names = (list: Opt[]) => list.map((o) => o.value).join();
  assert(names(forCollection(opts, undefined)) === 'std', 'Standard proposal sees only standard variants');
  assert(names(forCollection(opts, 'natal')) === 'arcos,medalhao', 'Natal proposal sees the curated Natal variants');
  assert(names(forCollection(plainOpts, 'natal')) === 'std,b', 'Block without Natal variants keeps the standard ones');
  assert(names(forCollection(opts, undefined, (o) => o.value === 'arcos')) === 'std,arcos', 'A variant already in use never disappears');
  assert(names(forCollection(opts, 'natal', (o) => o.value === 'std')) === 'std,arcos,medalhao', 'Standard variant in use stays in a Natal proposal');
  const natalVariants = Object.values(BLOCK_REGISTRY).flatMap((d) => (d.variants ?? []).filter((v) => v.collection).map((v) => v.value));
  assert(
    ['arches-trio', 'ornament', 'night-hero', 'light-intro', 'icon-features', 'arch-hero'].every((v) => natalVariants.includes(v)),
    `Natal variants are collection-only: ${natalVariants}`
  );

  // 18c. Família Natal: ids/tags próprios, mesmo esqueleto, uma composição de cada por modelo, troca sem perda
  const seedIds = [...seedSql.matchAll(/VALUES \(\s*'([^']+)'/g)].map((m) => m[1]);
  assert(seedIds.join() === 'sessoes-natal,sessoes-natal-noturno,sessoes-natal-essencial', `Natal model ids: ${seedIds}`);
  const seedTags = [...seedSql.matchAll(/ARRAY\[([^\]]*)\]/g)].map((m) => m[1]);
  assert(seedTags.length === 3 && seedTags.every((t) => t.startsWith("'natal'")), 'Every Natal model carries the natal tag first (gallery tab)');
  assert(new Set(seedTags.map((t) => t.split(',')[1].trim())).size === 3, 'The second tag (shown on the card) tells the models apart');
  const skeleton = (s: { blocks: any[] }) => s.blocks.map((b) => `${b.id ?? b.type}:${b.type}`).join();
  assert(seeds.every((s) => skeleton(s) === skeleton(seeds[0])), 'Natal models share the same skeleton (ids and types in order): switching pairs 1:1');
  assert(seeds.every((s) => s.blocks.find((b) => b.type === 'global_settings')?.data?.collection === 'natal'), 'Every Natal model declares the Natal collection');
  const propOf = (s: { blocks: any[] }, id: string, key: string) => s.blocks.find((b) => b.id === id)?.props?.[key];
  for (const [id, key] of [['sn_cover_arcos', 'variant'], ['sn_intro', 'variant'], ['sn_pkg_cards', 'variant'], ['sn_looks', 'photo_style']]) {
    const used = seeds.map((s) => propOf(s, id, key) ?? 'soft'); // photo_style sem valor = soft
    assert(new Set(used).size === 3, `Each Natal model uses a different ${key} for ${id}: ${used}`);
  }
  const fresh = (s: { blocks: any[] }) => instantiateTemplateBlocks(s.blocks, { photographerName: 'Estúdio Luz' });
  assert(
    seeds.every((s) => !/"(?:https?:\/\/|\/templates\/|\.\/)/.test(JSON.stringify(fresh(s)))),
    'No Natal model instance carries a photo or path'
  );
  for (const [i, from] of seeds.entries()) {
    for (const [j, to] of seeds.entries()) {
      if (i === j) continue;
      const mine = normalizeBlocks(fresh(from));
      const cover = mine.find((b) => b.type === 'CoverBlock')!;
      cover.content = { ...cover.content, title: 'Natal da Ana', image_url: 'https://me/capa.jpg' };
      const sw = applyTemplate(mine, fresh(to));
      assert(sw.added.length === 0 && sw.unmatched.length === 0, `Switching Natal model ${i} -> ${j} pairs every section (added ${sw.added.length}, kept ${sw.unmatched.length})`);
      const swCover = sw.blocks.find((b) => b.type === 'CoverBlock')!;
      assert(swCover.content!.title === 'Natal da Ana' && swCover.content!.image_url === 'https://me/capa.jpg', `Switching Natal model ${i} -> ${j} keeps the photographer's edits`);
      assert(swCover.props!.variant === propOf(to, 'sn_cover_arcos', 'variant'), `Switching Natal model ${i} -> ${j} applies the target cover`);
    }
  }

  // 19. Capa Arcos: o 3º arco do modelo nunca vaza; a foto do fotógrafo sobrevive à troca de modelo
  const archesTpl = instantiateTemplateBlocks([
    { type: 'CoverBlock', content: { image_url: 'https://x/c.jpg', photo_b: 'https://x/b.jpg', photo_c: 'https://x/d.jpg' }, props: { variant: 'arches-trio' } },
  ]);
  assert(archesTpl[0].content.photo_c === '' && archesTpl[0].content.photo_b === '', 'Third arch photo is cleared on instantiation');
  const switched = applyTemplate(
    [{ type: 'CoverBlock', id: 'c', content: { title: 'Natal', photo_c: 'https://me/d.jpg' }, props: { variant: 'hero-full' } }],
    archesTpl
  );
  assert(switched.blocks[0].content!.photo_c === 'https://me/d.jpg', "Photographer's third arch photo survives a template switch");
  assert(switched.blocks[0].props!.variant === 'arches-trio', 'Template switch applies the Arcos variant');

  // 20. Pacotes da coleção: preço editorial, quantidade em destaque e ícone sugerido pelo texto
  const sp = splitPrice('R$ 1.190');
  assert(!!sp && sp.currency === 'R$' && sp.amount === '1.190' && !sp.cents, 'Price splits currency and amount');
  assert(splitPrice('R$ 35,00')?.cents === ',00' && splitPrice('R$ 1.490,00')?.amount === '1.490', 'Price keeps cents (also with nbsp from Intl)');
  assert(splitPrice('A partir de R$ 490') === null && splitPrice('') === null, 'Free-form price stays as typed');
  const ln = splitLeadingNumber('10 fotografias digitais');
  assert(!!ln && ln.num === '10' && ln.label === 'fotografias digitais', 'Leading quantity becomes the highlighted number');
  assert(splitLeadingNumber('Até 1 hora de sessão') === null && splitLeadingNumber('2h de sessão') === null, 'No leading quantity = label only');
  const sug = (t: string) => suggestIcon(t);
  assert(sug('Até 3 participantes') === 'users' && sug('5 fotos digitais em alta resolução') === 'camera', 'Participants -> users, photos -> camera');
  assert(sug('1 cenário') === 'tree' && sug('2 trocas de roupa (uma por cenário)') === 'shirt', 'Scenery -> tree; wardrobe wins over scenery');
  assert(sug('1 álbum fotográfico 20x20cm') === 'album' && sug('Galeria online para seleção') === 'images', 'Album and gallery before generic photo');
  assert(sug('2h de sessão') === 'clock' && sug('30 fotos incluídas') === 'camera' && sug('2× Álbum 30x30') === 'album', 'Imported packages get sensible icons');
  assert(sug('Maquiagem inclusa') === null, 'Unknown item -> no suggestion (neutral diamond)');

  const seedPricing = seedBlocks.filter((b: any) => b.type === 'PricingTable');
  assert(seedPricing.length === 1 && seedPricing[0].props.variant === 'photo-cards', 'Seed has a single package group (other layouts via Composição)');
  assert(['title_italic', 'item_label', 'highlights', 'footnote'].every((k) => k in seedPricing[0].content), 'Seed packages carry the content of every Natal layout');
  const natalPricing = natal.filter((b: any) => b.type === 'PricingTable');
  assert(natalPricing.length === 1, 'Demo package group stays without real packages');
  const cards = natalPricing[0];
  assert(cards.content.packages.every((pk: any) => pk.image_ref === '' && !!pk.description), 'Package photos start empty and descriptions are kept');
  assert(cards.content.packages[0].id !== 'sn_p1' && cards.content.highlights[0].id !== 'sn_ph1', 'Package and highlight ids are renewed');
  const withRealPkgs = instantiateTemplateBlocks(seedBlocks, { packages: [realPkg] }).filter((b: any) => b.type === 'PricingTable');
  assert(withRealPkgs.length === 1 && withRealPkgs[0].props.variant === 'photo-cards' && withRealPkgs[0].content.packages[0].name === 'Ensaio Gestante', 'Real packages fill the first (main) layout');
  const iconPkg = instantiateTemplateBlocks([{ type: 'PricingTable', content: { packages: [{ id: 'k', name: 'A', features: ['x'], feature_icons: ['gift'] }] }, props: { variant: 'photo-cards' } }]);
  assert(iconPkg[0].content.packages[0].feature_icons[0] === 'gift', 'Chosen feature icons survive instantiation');

  // 21. Seção nova numa proposta Natal já nasce com a variante da coleção; padrão segue como antes
  assert(createBlock('PricingTable', 'natal').props!.variant === 'photo-cards' && createBlock('CoverBlock', 'natal').props!.variant === 'arches-trio', 'New sections take the collection variant');
  assert(!createBlock('PricingTable').props!.variant && !createBlock('Gallery', 'natal').props!.variant, 'Standard proposals and blocks without collection variants are unchanged');

  // 22. Adicionais: bloco exclusivo do Natal; fotos nunca vazam, preços de exemplo ficam editáveis
  assert(BLOCK_REGISTRY.AddonsBlock.collection === 'natal', 'Addons block is Natal-only in the section library');
  assert(createBlock('AddonsBlock', 'natal').props!.variant === 'grid', 'New Addons section starts as cards');
  const seedAddons = seedBlocks.find((b: any) => b.type === 'AddonsBlock');
  const addons = natal.find((b: any) => b.type === 'AddonsBlock');
  assert(!!seedAddons && !!addons && addons.content.items.length === seedAddons.content.items.length, 'Seed brings the Addons section');
  assert(
    addons.content.items.every((it: any, i: number) => it.image_ref === '' && it.id !== seedAddons.content.items[i].id && it.price === seedAddons.content.items[i].price),
    'Addon photos start empty, ids renew, demo prices stay editable'
  );
  assert(addons.content.highlights.every((h: any, i: number) => h.id !== seedAddons.content.highlights[i].id), 'Addon highlight ids are renewed');
  const addonPhotos = instantiateTemplateBlocks([{ type: 'AddonsBlock', content: { items: [{ id: 'a', name: 'X', image_ref: 'https://x/a.jpg', icon: 'gift' }] }, props: { variant: 'rows' } }]);
  assert(addonPhotos[0].content.items[0].image_ref === '' && addonPhotos[0].content.items[0].icon === 'gift', 'Addon demo photo cleared, chosen icon kept');
  assert(
    addonIcon({ name: 'Impressão' }) === 'print' && addonIcon({ name: 'Álbum fotográfico' }) === 'album' && addonIcon({ name: 'Quadro de madeira' }) === 'frame',
    'Addon auto icon comes from the name'
  );
  assert(addonIcon({ name: 'Mimo', description: 'Embalagem para presente' }) === 'gift' && addonIcon({ name: 'Mimo' }) === 'image', 'Then from the description, else a neutral image');
  assert(!normalizeBlocks([seedAddons]).some((b) => b.type === 'text'), 'Addons block is registered (never falls back to text)');

  // 23. Dicas de looks: paleta, inspirações com legenda, orientações com ícone, foto em moldura
  assert(BLOCK_REGISTRY.PaletteBlock.collection === 'natal', 'Palette block is Natal-only in the section library');
  const seedPalette = seedBlocks.find((b: any) => b.type === 'PaletteBlock');
  const palette = natal.find((b: any) => b.type === 'PaletteBlock');
  assert(
    palette.content.colors.length === 6 && palette.content.colors.every((col: any, i: number) => col.id !== seedPalette.content.colors[i].id && col.hex === seedPalette.content.colors[i].hex),
    'Palette colors keep name/hex and get fresh ids'
  );
  const looks = natal.filter((b: any) => b.props?.variant === 'light-intro')[1];
  assert(!!looks && looks.props.photo_style === 'frame' && looks.props.photo_a.image_ref === null, 'Looks intro keeps the frame style and starts without photo');
  const inspiration = natal.find((b: any) => b.type === 'Gallery');
  assert(
    inspiration.props.layout === 'captioned' && inspiration.content.images.every((img: any) => img.image_ref === '' && !!img.caption),
    'Inspiration slots start empty and keep their captions'
  );
  const tips = natal.find((b: any) => b.type === 'InfoBlock');
  assert(tips.props.variant === 'icon-columns' && tips.content.items.every((it: any) => !!PROPOSAL_ICONS[it.icon]), 'Tips keep their chosen icons');
  assert(createBlock('InfoBlock', 'natal').props!.variant === 'icon-columns', 'New info section in a Natal proposal starts with icon columns');
  type SelOpt = { value: string; collection?: string };
  const layouts: SelOpt[] = [{ value: 'masonry' }, { value: 'grid' }, { value: 'captioned', collection: 'natal' }];
  const vals = (list: SelOpt[]) => list.map((o) => o.value).join();
  assert(vals(optionsFor(layouts, 'natal')) === 'masonry,grid,captioned', 'Natal select keeps standard options plus its own (no curation)');
  assert(vals(optionsFor(layouts, undefined)) === 'masonry,grid' && vals(optionsFor(layouts, undefined, 'captioned')) === 'masonry,grid,captioned', 'Collection option hidden elsewhere unless in use');
  assert(infoIcon({ title: 'Evite cores muito vibrantes' }) === 'palette' && infoIcon({ title: 'Chegue cedo' }) === 'sparkles', 'Info auto icon from the title, else sparkles');

  // 24. Informações e Reserva: lista com ícones, etapas e lista de continuação (sem cabeçalho)
  const infos = natal.filter((b: any) => b.type === 'InfoBlock');
  assert(infos.map((b: any) => b.props.variant).join() === 'icon-columns,icon-list,steps,icon-list', 'Seed brings tips, practical info, booking steps and terms');
  const seedInfos = seedBlocks.filter((b: any) => b.type === 'InfoBlock');
  assert(
    infos.every((b: any, k: number) => b.content.items.every((it: any, i: number) => it.id !== seedInfos[k].content.items[i].id && it.title === seedInfos[k].content.items[i].title)),
    'Info items keep their text and get fresh ids'
  );
  assert(infos.every((b: any) => !b.content.image_url), 'Info header photos start empty');
  assert(
    infos.filter((b: any) => b.content.note_icon).every((b: any) => !!PROPOSAL_ICONS[b.content.note_icon]) && infos[1].content.note_title === 'Informações importantes',
    'Final notes keep text and catalog icons'
  );
  assert(!infos[3].content.title && infos[3].content.items.length === 3, 'Terms list continues the booking page without a header');
  const natalInfoVariants = forCollection(BLOCK_REGISTRY.InfoBlock.variants!, 'natal').map((v) => v.value).join();
  assert(natalInfoVariants === 'icon-columns,icon-list,steps', `Natal proposal offers only the editorial info layouts: ${natalInfoVariants}`);

  // 25. Encerramento Assinatura: assinatura do perfil, foto vazia; CTAs antigos seguem idênticos
  const closing = natal.find((b: any) => b.type === 'CTABlock');
  assert(closing.props.variant === 'signature' && closing.content.signature === 'Estúdio Luz', 'Closing signature becomes the profile signature');
  assert(closing.content.image_url === '' && closing.content.cta_italic === 'memórias juntos?' && closing.content.btnText === '', 'Closing photo starts empty, copy kept, no button by default');
  const unsigned = instantiateTemplateBlocks(seedBlocks).find((b: any) => b.type === 'CTABlock');
  assert(unsigned.content.signature === '', 'No profile name = empty signature (never the demo name)');
  const oldCta = { type: 'CTABlock', id: 'x', content: { cta_text: 'Vamos?', btnText: 'Falar no WhatsApp', links: [] }, props: { align: 'center' } };
  const oldNorm = normalizeBlock(JSON.parse(JSON.stringify(oldCta)))!;
  assert(oldNorm.props!.variant === 'classic' && JSON.stringify(oldNorm.content) === JSON.stringify(oldCta.content), 'Old CTA loads as Clássica with the same content');
  assert(!('signature' in instantiateTemplateBlocks([oldCta])[0].content), 'Old CTA templates get no signature field');
  assert(createBlock('CTABlock', 'natal').props!.variant === 'signature', 'New closing in a Natal proposal starts as Assinatura');
  assert(forCollection(BLOCK_REGISTRY.CTABlock.variants!, undefined).length === 1, 'Standard proposals have a single CTA option (picker hidden)');

  // 26. Grupos de pacotes: ordem, índices reais de edição, página nova e fluxo
  const gp = (key: string, extra: object = {}) => ({ key, title: key, ...extra });
  const grouped = {
    groups: [gp('lote1'), gp('lote2', { new_page: true }), gp('vazio'), gp('lote3')],
    packages: [
      { id: 'a', group_id: 'lote2' },
      { id: 'b' },
      { id: 'c', group_id: 'lote1' },
      { id: 'd', group_id: 'removido' }, // grupo apagado = sem grupo
      { id: 'e', group_id: 'lote3' },
      { id: 'f', group_id: 'lote2' },
    ],
  };
  const pages = buildPackagePages(grouped);
  assert(pages.map((p) => p.group?.key ?? '-').join() === '-,lote1,lote2,lote3', `Pages: sem grupo primeiro, vazio omitido (${pages.map((p) => p.group?.key)})`);
  assert(pages[0].entries.map((e) => e.pkg.id).join() === 'b,d', 'Unknown group_id falls back to ungrouped, keeping order');
  assert(pages[2].entries.map((e) => e.idx).join() === '0,5', 'Entries keep the real packages index (inline edit path)');
  assert(pages[2].newPage && !pages[3].newPage, 'new_page breaks only the group that asks for it');
  assert(pages[1].joinsNext === false && pages[2].joinsPrev === false, 'A new page does not join the previous flow');
  assert(pages[2].joinsNext === true && pages[3].joinsPrev === true, 'Normal groups keep the flow');
  assert(pages[0].first && pages[3].last, 'First and last pages are flagged (header/footer placement)');
  assert(buildPackagePages(grouped, { includeEmpty: true }).some((p) => p.group?.key === 'vazio'), 'Editor keeps empty groups');
  const firstNew = buildPackagePages({ groups: [gp('x', { new_page: true })], packages: [{ group_id: 'x' }] });
  assert(firstNew.length === 1 && !firstNew[0].newPage, 'A first group never forces a page break');
  assert(buildPackagePages({ packages: [{}, {}] }).length === 1 && packageGroupKey({ group_id: 'x' }, []) === '', 'No groups = one plain page');
  assert(slicePad({ padBottom: false }).includes('pb-0') && slicePad({}) === '', 'Only a page followed by a joined one drops its bottom padding');
  const groupKey = packageGroupItem().key;
  const dup = instantiateTemplateBlocks([{ type: 'PricingTable', id: 'g', content: { groups: [{ key: groupKey }], packages: [{ id: 'p', group_id: groupKey }] } }])[0];
  assert(dup.content.groups[0].key === groupKey && dup.content.packages[0].group_id === groupKey && dup.content.packages[0].id !== 'p', 'Instantiation renews package ids but keeps group keys');
  const realOverGroups = instantiateTemplateBlocks([{ type: 'PricingTable', id: 'g', content: { groups: [{ key: groupKey }], packages: [] } }], { packages: [realPkg] })[0];
  assert(!('groups' in realOverGroups.content), 'Real packages replace the model groups');

  // 27. Fundo em todas as seções: só quem tem o campo, texto fixo ilegível volta ao automático, rótulo = código da cor
  const bgPalette = { white: '#FFDDAA', cream: '#F3ECE2', ink: '#1F2620', taupe: '#7E6346', accent: '#A67C52' };
  const bgBlocks: any[] = [
    { type: 'global_settings', id: 'gs', data: {} },
    { type: 'CoverBlock', id: 'photo', props: { variant: 'night-hero', background: 'dark' } },
    { type: 'CoverBlock', id: 'arches', props: { variant: 'arches-trio', background: 'white' } },
    { type: 'PricingTable', id: 'already', props: { background: 'cream' } },
    { type: 'PricingTable', id: 'darkSec', props: { background: 'dark', text_color: 'light' } },
    { type: 'AddonsBlock', id: 'warm', props: { background: 'white', text_color: 'warm' } },
  ];
  const applied = applyBackgroundToAll(bgBlocks, 'cream', bgPalette);
  const byId = (id: string) => applied.blocks.find((b: any) => b.id === id)!;
  assert(applied.changed === 3, `Fundo em todas: 3 seções mudaram (${applied.changed})`);
  assert(byId('photo').props.background === 'dark', 'Capa com foto de fundo (sem campo de fundo) fica como está');
  assert(!('props' in byId('gs')) || byId('gs').props === undefined, 'global_settings nunca é tocado');
  assert(byId('arches').props.background === 'cream' && byId('darkSec').props.background === 'cream', 'Seções com o campo recebem o fundo');
  assert(byId('already') === bgBlocks[3], 'Seção que já tem o fundo não é recriada');
  assert(byId('darkSec').props.text_color === 'default', 'Texto claro fixo sobre fundo claro volta para Automático');
  assert(byId('warm').props.text_color === 'warm', 'Texto fixo que continua legível é mantido (taupe sobre creme)');
  const hexApplied = applyBackgroundToAll(bgBlocks, '#7E6346', bgPalette);
  assert(hexApplied.blocks.find((b: any) => b.id === 'warm')!.props.text_color === 'default', 'Cor livre igual ao taupe: texto taupe ilegível volta para Automático');
  assert(backgroundSwatchColor('white', bgPalette) === '#FFDDAA' && backgroundSwatchColor('dark', bgPalette) === '#1F2620', 'Fundo "white"/"dark" resolve para a cor atual do tema, não para um nome');
  assert(backgroundSwatchColor('#A1B2C3', bgPalette) === '#A1B2C3' && backgroundSwatchColor(undefined, bgPalette) === undefined, 'Cor livre passa direto; sem fundo = indefinido');

  // 28. Acento por fundo (cartões leves pintam o acento direto sobre a seção): ≥ 3:1 ou cai no texto do fundo
  const natalVars = tokensToCssVars({
    colors: { cream: '#F3ECE2', linen: '#E9DFD0', stone: '#D9C8AE', taupe: '#7E6346', accent: '#A67C52', ink: '#1F2620', white: '#FAF6F0' },
  }) as Record<string, string>;
  assert(natalVars['--pa-accent-on-white'] === '#A67C52' && natalVars['--pa-accent-on-cream'] === '#A67C52', 'Acento com contraste suficiente sobre fundo claro é mantido');
  assert(natalVars['--pa-accent-on-ink'] === '#A67C52', 'Caramelo sobre a tinta escura do Natal passa de 3:1');
  assert(natalVars['--pa-accent-on-taupe'] === '#FAF6F0', 'Acento sobre taupe (< 3:1) cai no texto claro do fundo');
  assert(contrastRatio(natalVars['--pa-accent-on-taupe'], '#7E6346') >= 3, 'O fallback do acento é legível sobre o fundo');
  assert(natalVars['--pa-veil-on-cream'] === 'color-mix(in srgb, #FAF6F0 60%, transparent)', 'Cartão translúcido em fundo claro: branco suave do tema (a tinta deixaria o cartão cinza)');
  assert(natalVars['--pa-veil-on-ink'] === 'color-mix(in srgb, #FAF6F0 10%, transparent)' && natalVars['--pa-veil-on-taupe'].includes(' 10%'), 'Cartão translúcido em fundo escuro: 10% do texto claro');
  assert((seedSql.match(/"card_style": "tint"/g) ?? []).length === 6, 'Seed do Natal: 3 modelos × (pacotes + adicionais) nascem com cartões translúcidos');

  // 29. Painel: campo que a variante não desenha some (nunca um campo "morto") e o título da seção junta o destaque
  const visible = (type: string, variant: string | undefined, list: 'fields' | 'layoutFields' | 'itemFields', itemOf = 'packages', props: Record<string, any> = {}) => {
    const def = BLOCK_REGISTRY[type];
    const fields = list === 'itemFields' ? def.fields.find((f) => f.key === itemOf)!.itemFields! : def[list] ?? [];
    // Como o painel: a variante resolvida com a padrão do bloco é o que os `showIf` leem
    const resolved = variant ?? def.defaultVariant;
    const ctx = { content: {}, props: { ...(resolved && { variant: resolved }), ...props } };
    return new Set(fields.filter((f) => !f.showIf || f.showIf(ctx)).map((f) => f.key));
  };
  assert(!visible('CoverBlock', 'ornament', 'fields').has('eyebrow') && visible('CoverBlock', 'minimal-center', 'fields').has('eyebrow'), 'Capa Medalhão não mostra o rótulo superior que não desenha');
  assert(!visible('EditorialBlock', 'split-portrait', 'fields').has('eyebrow') && !visible('EditorialBlock', 'split-portrait', 'fields').has('title_italic'), 'Split Retrato: sem rótulo nem itálico');
  assert(visible('EditorialBlock', 'arch-portrait', 'fields').has('eyebrow') && !visible('EditorialBlock', 'arch-portrait', 'fields').has('title_italic'), 'Retrato em Arco: rótulo sim, itálico não');
  assert(visible('EditorialBlock', 'overlap-blend', 'fields').has('title_italic'), 'Fotos Sobrepostas mantém o itálico');
  const unit = (v?: string) => visible('PricingTable', v, 'itemFields').has('price_unit');
  const installments = (v?: string) => visible('PricingTable', v, 'itemFields').has('price_installments');
  assert(unit() && unit('cards-minimal') && !unit('numbered-editorial') && !unit('magazine') && !unit('photo-cards'), 'Unidade do preço: só Cards e Cards Minimalistas (a padrão conta como Cards)');
  assert(!installments() && !installments('cards-minimal') && installments('numbered-editorial') && installments('magazine') && installments('photo-cards'), 'Parcelamento: some em Cards e Cards Minimalistas');
  assert(!visible('PricingTable', 'numbered-editorial', 'itemFields').has('badge') && visible('PricingTable', 'magazine', 'itemFields').has('badge'), 'Selo: o Editorial Numerado não o desenha');
  assert(!visible('Gallery', undefined, 'fields', 'images', { layout: 'captioned' }).has('eyebrow') && visible('Gallery', undefined, 'fields', 'images', { layout: 'masonry' }).has('eyebrow'), 'Galeria com legenda: sem rótulo superior');
  assert(!visible('Gallery', undefined, 'layoutFields', 'images', { layout: 'captioned' }).has('align') && visible('Gallery', undefined, 'layoutFields', 'images', {}).has('align'), 'Galeria com legenda: sem alinhamento');
  assert(!visible('InfoBlock', 'icon-columns', 'fields').has('eyebrow') && visible('InfoBlock', 'steps', 'fields').has('eyebrow'), 'Info: colunas com ícone não desenham o rótulo');
  assert(['icon-columns', 'icon-list', 'steps'].every((v) => !visible('InfoBlock', v, 'layoutFields').has('align')) && visible('InfoBlock', 'columns', 'layoutFields').has('align'), 'Info: alinhamento só nas composições que o leem');
  const titled = (content: Record<string, any>, type = 'CoverBlock') => getSectionTitle({ type, content });
  assert(titled({ title: 'Sessões de', title_italic: 'Natal' }) === 'Sessões de Natal', 'Título da seção junta o destaque em itálico');
  assert(titled({ title: '  Uma\ntarde ', title_italic: ' só sua. ' }) === 'Uma tarde só sua.', 'Título da seção em uma linha, sem espaços sobrando');
  assert(titled({ title_italic: 'Natal' }) === 'Natal' && titled({ title: 'Pacotes' }) === 'Pacotes', 'Título da seção: só um dos trechos também serve');
  assert(titled({ cta_text: 'Vamos criar', cta_italic: 'memórias juntos?' }, 'CTABlock') === 'Vamos criar memórias juntos?', 'Chamada final junta o itálico');
  assert(titled({}) === 'Capa' && titled({ eyebrow: 'Investimento' }, 'PricingTable') === 'Investimento', 'Sem título: rótulo superior, senão o nome do tipo');

  // 30. Grupo Textos: só o texto curto com gêmeo garantido na arte vai para "Editar como formulário"
  // (botões ficam no grupo Botões e links; o painel é o único caminho do que some da arte quando vazio)
  const collapsed = (type: string, variant?: string, props: Record<string, any> = {}) => {
    const def = BLOCK_REGISTRY[type];
    const resolved = variant ?? def.defaultVariant;
    const ctx = { content: {}, props: { ...(resolved && { variant: resolved }), ...props } };
    return def.fields
      .filter((f) => f.key !== 'btnText' && (!f.showIf || f.showIf(ctx)) && editedOnCanvas(f, ctx))
      .map((f) => f.key)
      .join();
  };
  assert(collapsed('CoverBlock', 'minimal-center') === 'eyebrow,title,title_italic,subtitle', `Capa Minimal recolhe os 4 textos (${collapsed('CoverBlock', 'minimal-center')})`);
  assert(collapsed('CoverBlock', 'poster-split') === 'eyebrow,title,subtitle,photographer_name', 'Capa Pôster: o itálico só aparece preenchido, então fica visível');
  assert(collapsed('CoverBlock', 'ornament') === 'title,title_italic,subtitle,photographer_name', 'Capa Medalhão: sem rótulo superior (some do painel), o resto recolhe');
  assert(collapsed('EditorialBlock', 'overlap-blend') === 'eyebrow,title,title_italic', 'Editorial: corpo e assinatura vertical (estática) ficam visíveis');
  assert(collapsed('EditorialBlock', 'arch-portrait') === 'eyebrow,title', 'Retrato em Arco: frases de destaque são longas e ficam visíveis');
  assert(collapsed('PricingTable', 'cards-classic') === 'eyebrow,title', 'Tabela de preços: a frase de apoio fica visível');
  assert(collapsed('PricingTable', 'photo-cards') === 'eyebrow,title,title_italic,footnote', 'Pacotes da coleção: itálico e rodapé recolhem');
  assert(collapsed('DividerBlock', undefined, { style: 'hairline' }) === 'label' && collapsed('DividerBlock', undefined, { style: 'ornament' }) === '', 'Divisor: o rótulo só é editável na arte na linha fina');
  assert(collapsed('EditorialComposition') === 'eyebrow,title', 'Composição editorial: itálico (só preenchido) e rótulo lateral (estático) ficam visíveis');
  assert(collapsed('FooterTerms') === 'copyright', 'Rodapé: as condições (longas) ficam visíveis');
  assert(collapsed('CTABlock', 'classic') === 'eyebrow,cta_text', 'Chamada final: texto de apoio longo fica visível');
  // Nada que não seja texto entra no formulário recolhido
  const nonText = Object.values(BLOCK_REGISTRY).flatMap((d) => d.fields).filter((f) => f.kind !== 'text' && f.kind !== 'textarea');
  assert(nonText.every((f) => !editedOnCanvas(f, { content: {}, props: {} })), 'Listas, imagens, ícones e afins nunca são recolhidos');

  // 31. Painel: árvore + detalhe — tudo por `id`/`key`, na ordem da arte, sem reordenar `packages` a cada edição
  const tree = {
    groups: [{ key: 'g1', title: 'Lote 1' }, { key: 'g2', title: 'Lote 2' }],
    packages: [
      { id: 'a', name: 'A', group_id: 'g2' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C', group_id: 'g1' },
      { id: 'd', name: 'D', group_id: 'g2' },
      { id: 'e', name: 'E', group_id: 'g1' },
    ],
  };
  assert(displayOrder(tree, 'packages').map((r) => r.key).join() === 'b,c,e,a,d', 'Ordem do detalhe = ordem da arte: sem grupo, depois cada grupo');
  assert(displayOrder(tree, 'groups').map((r) => r.key).join() === 'g1,g2', 'Grupos: ordem do array, pela `key`');
  const nb = neighbors(tree, { list: 'packages', key: 'e' });
  assert(nb.index === 2 && nb.total === 5 && nb.prev!.key === 'c' && nb.next!.key === 'a', 'Vizinhos atravessam os grupos na ordem de exibição');
  assert(neighbors(tree, { list: 'packages', key: 'b' }).prev === null && neighbors(tree, { list: 'packages', key: 'd' }).next === null, 'Primeiro e último não têm anterior/próximo');
  assert(resolveItem(tree, { list: 'packages', key: 'zzz' }) === null && resolveItem(tree, { list: 'groups', key: 'g2' })!.index === 1, 'Item removido não resolve (o painel volta à lista); grupo resolve pela key');
  assert(sameRef({ list: 'packages', key: 'a' }, { list: 'packages', key: 'a' }) && !sameRef({ list: 'packages', key: 'a' }, { list: 'groups', key: 'a' }), 'Referência compara lista e chave');
  const patched = patchItem(tree, { list: 'packages', key: 'd' }, { name: 'D2' }).packages as any[];
  assert(patched.map((p) => p.id).join() === 'a,b,c,d,e' && patched[3].name === 'D2' && patched[3].group_id === 'g2', 'Editar um pacote por id não reordena o array nem perde campos');
  const reordered = reorderWithin(tree.packages, ['c', 'e'], 'e', 'c');
  assert(reordered.map((p) => p.id).join() === 'a,b,e,d,c', 'Reordenar dentro do grupo: só as posições do grupo trocam, os outros pacotes não se mexem');
  assert(reorderWithin(tree.packages, ['c', 'e'], 'c', 'c') === tree.packages && reorderWithin(tree.packages, ['c', 'e'], 'c', 'a') === tree.packages, 'Arrastar para si mesmo ou para outro grupo não muda a ordem');
  const moved = movePackageToGroup(tree.packages, 'c', 'g2');
  assert(moved.map((p) => p.id).join() === 'a,b,c,d,e' && moved[2].group_id === 'g2', 'Mover de grupo troca o group_id sem mudar a posição');
  assert(!('group_id' in movePackageToGroup(tree.packages, 'a', '')[0]), 'Mover para "sem grupo" remove o group_id');
  const noG1 = removeGroupKeepingPackages(tree, 'g1');
  assert(noG1.groups.map((g) => g.key).join() === 'g2' && noG1.packages.length === 5 && noG1.packages.filter((p) => p.group_id).map((p) => p.id).join() === 'a,d', 'Remover grupo mantém os pacotes, que ficam sem grupo');
  const dupPkgs = duplicatePackageAfter(tree.packages, 'c', 'c2');
  assert(dupPkgs.map((p) => p.id).join() === 'a,b,c,c2,d,e' && dupPkgs[3].group_id === 'g1' && dupPkgs[3].name === 'C' && dupPkgs[3] !== dupPkgs[2], 'Duplicar: cópia logo abaixo, mesmo grupo, id novo');

  console.log('✅ All tests passed successfully!');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
