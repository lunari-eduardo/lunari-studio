-- ============================================================
-- COMERCIAL: modelo "Sessões de Natal" (editorial natalino)
-- Tema Natal Editorial: marfim, caramelo e verde muito escuro (Bodoni Moda / Montserrat /
-- Pinyon Script). Reaplicável: cada fase da implementação atualiza o mesmo modelo.
-- Fase 1 (revisão): as 3 capas empilhadas (Arcos, Medalhão, Noturna); a versão final
-- mantém só a capa Arcos, com as outras como variantes selecionáveis.
-- Fotos de demonstração ficam só na vitrine: o hidratador esvazia os espaços ao criar a
-- proposta, e "Nome do Estúdio" vira a assinatura do perfil do fotógrafo.
-- ============================================================

INSERT INTO public.proposal_templates (template_id, name, description, tags, blocks_json, design_tokens, thumbnail_url, is_active)
VALUES (
  'sessoes-natal',
  'Sessões de Natal',
  'Editorial natalino em marfim, caramelo e verde muito escuro: capa em arcos, medalhão ou noturna, com tipografia de alto contraste e caligrafia.',
  ARRAY['natal', 'sazonal', 'editorial', 'família'],
  '[
 {
  "id": "sn_cover_arcos",
  "type": "CoverBlock",
  "content": {
   "eyebrow": "Fotografia",
   "title": "Sessões de",
   "title_italic": "Natal",
   "subtitle": "Memórias que iluminam todas as estações",
   "photographer_name": "Nome do Estúdio",
   "btnText": "",
   "btnLink": "",
   "image_url": "",
   "photo_b": "",
   "photo_c": ""
  },
  "props": {
   "variant": "arches-trio",
   "background": "white",
   "text_color": "default",
   "title_style": "script"
  }
 },
 {
  "id": "sn_cover_medalhao",
  "type": "CoverBlock",
  "content": {
   "eyebrow": "",
   "title": "Sessões de",
   "title_italic": "Natal",
   "subtitle": "Memórias que aquecem sempre",
   "photographer_name": "Nome do Estúdio",
   "btnText": "",
   "btnLink": "",
   "image_url": ""
  },
  "props": {
   "variant": "ornament",
   "background": "white",
   "text_color": "default",
   "title_style": "caps"
  }
 },
 {
  "id": "sn_cover_noturna",
  "type": "CoverBlock",
  "content": {
   "eyebrow": "Apresenta",
   "title": "Sessões de",
   "title_italic": "Natal",
   "subtitle": "Memórias que aquecem sempre",
   "photographer_name": "Seu Estúdio",
   "btnText": "",
   "btnLink": "",
   "image_url": "",
   "highlights": [
    { "id": "sn_h1", "label": "Sessões limitadas", "icon": "" },
    { "id": "sn_h2", "label": "Uma experiência para sua família", "icon": "" },
    { "id": "sn_h3", "label": "Temporada 2026", "icon": "" }
   ]
  },
  "props": {
   "variant": "night-hero",
   "title_style": "caps"
  }
 }
]'::jsonb,
  '{"colors":{"cream":"#F3ECE2","linen":"#E9DFD0","stone":"#D9C8AE","taupe":"#7E6346","accent":"#A67C52","ink":"#1F2620","white":"#FAF6F0"},"typography":{"display":"Bodoni Moda","body":"Montserrat","script":"Pinyon Script"}}'::jsonb,
  NULL,
  true
)
ON CONFLICT (template_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  blocks_json = EXCLUDED.blocks_json,
  design_tokens = EXCLUDED.design_tokens,
  thumbnail_url = EXCLUDED.thumbnail_url,
  is_active = EXCLUDED.is_active;
