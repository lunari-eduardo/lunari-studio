import { supabase } from '../src/integrations/supabase/client';

async function run() {
  const { data, error } = await supabase.from('proposal_templates').select('*');
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Found ${data.length} templates`);
  data.forEach((t: any) => {
    console.log(`\n=== Template: ${t.name} (${t.template_id}) ===`);
    const blocks = t.blocks_json || [];
    blocks.forEach((b: any) => {
      if (b.type === 'CoverBlock') {
        console.log('  [CoverBlock]');
        console.log('    photographer_name:', b.content?.photographer_name);
        console.log('    subtitle:', b.content?.subtitle);
      }
      if (b.type === 'ContactBlock') {
        console.log('  [ContactBlock]');
        console.log('    email:', b.content?.email);
        console.log('    phone:', b.content?.phone);
        console.log('    instagram:', b.content?.instagram);
      }
      if (b.type === 'EditorialBlock') {
        console.log('  [EditorialBlock] title:', b.content?.title);
      }
      if (b.type === 'PricingTable') {
        console.log('  [PricingTable] packages:');
        b.content?.packages?.forEach((p: any) => {
          console.log(`    - ${p.name}: ${p.price}`);
        });
      }
    });
  });
}

run();
