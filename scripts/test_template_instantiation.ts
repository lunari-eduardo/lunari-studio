import { instantiateTemplateBlocks } from '../src/pages/comercial/blocks/normalization';

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

  console.log('✅ All tests passed successfully!');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
