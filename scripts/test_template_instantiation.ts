// Rodar: npm run test:proposals
import { instantiateTemplateBlocks, pacoteToProposalPackage, normalizeBlock } from '../src/pages/comercial/blocks/normalization';
import { onColor } from '../src/pages/comercial/blocks/design';
import { featureIcon, computePackageNumberOffsets, displayPrice, priceEditPath } from '../src/pages/comercial/blocks/pricing';

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

  console.log('✅ All tests passed successfully!');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
