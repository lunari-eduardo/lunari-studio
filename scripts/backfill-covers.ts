import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Carrega as vars de ambiente do .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching materials...');
  // Pega materiais ativos
  const { data: materials, error } = await supabase
    .from('commercial_materials')
    .select('id, title, cover_image_url');

  if (error) {
    console.error('Error fetching materials:', error);
    return;
  }

  console.log(`Found ${materials.length} materials`);

  let updated = 0;

  for (const mat of materials) {
    // Busca a última versão
    const { data: versions } = await supabase
      .from('material_versions')
      .select('content')
      .eq('material_id', mat.id)
      .order('version_number', { ascending: false })
      .limit(1);

    if (!versions || versions.length === 0) continue;
    const content = versions[0].content;

    // Se for PDF, ignorar (PDFs precisam ser abertos no frontend para gerar thumbnail)
    if (content && typeof content === 'object' && !Array.isArray(content) && content.type === 'pdf') {
      continue;
    }

    // Se for nativo, procura imagem
    if (Array.isArray(content)) {
      let coverImageUrl = '';
      
      for (const b of content) {
        if (!b) continue;
        if (b.type === 'CoverBlock' && b.content?.image_url) {
          coverImageUrl = b.content.image_url;
          break;
        }
        if (b.content?.image_url) {
          coverImageUrl = b.content.image_url;
          break;
        }
        if (b.type === 'EditorialBlock' && b.data?.props) { // data.props in V1
          if (b.data.props.photo_a?.image_ref?.url) {
            coverImageUrl = b.data.props.photo_a.image_ref.url;
            break;
          }
        }
        if (b.type === 'EditorialBlock' && b.props) { // props in V2
          if (b.props.photo_a?.image_ref?.url) {
            coverImageUrl = b.props.photo_a.image_ref.url;
            break;
          }
        }
      }

      if (coverImageUrl && mat.cover_image_url !== coverImageUrl) {
        console.log(`Updating ${mat.title} with cover: ${coverImageUrl}`);
        const { error: updateError } = await supabase
          .from('commercial_materials')
          .update({ cover_image_url: coverImageUrl })
          .eq('id', mat.id);
          
        if (updateError) {
          console.error(`Error updating ${mat.title}:`, updateError);
        } else {
          updated++;
        }
      }
    }
  }

  console.log(`Done! Updated ${updated} materials.`);
}

run().catch(console.error);
