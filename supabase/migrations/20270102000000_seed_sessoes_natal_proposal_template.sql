-- ============================================================
-- COMERCIAL: modelo "Sessões de Natal" (editorial natalino)
-- Tema Natal Editorial: marfim, caramelo e verde muito escuro (Bodoni Moda / Montserrat /
-- Pinyon Script). Reaplicável: cada fase da implementação atualiza o mesmo modelo.
-- Revisão: as 3 capas empilhadas (Arcos, Medalhão, Noturna); a versão final mantém só a
-- capa Arcos, com as outras como variantes selecionáveis. Fase 2: introdução "Texto e Luz".
-- Fase 3: os 3 layouts de pacotes empilhados (Cartões com Foto, Linhas com Foto, Cartões em
-- Arco); a versão final mantém um. Atenção: com pacotes reais na categoria, a criação usa só o
-- 1º grupo de preços (regra atual), então na revisão os outros dois somem da proposta criada.
-- Coleção Natal: tag "natal" (aba da vitrine) + global_settings.collection (a proposta criada
-- herda e libera as variantes/temas exclusivos da coleção; modelos padrão não os veem).
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
 },
 {
  "id": "sn_intro",
  "type": "EditorialBlock",
  "content": {
   "eyebrow": "Conceito da sessão",
   "title": "Mais que fotografias,",
   "title_italic": "memórias.",
   "body": "As sessões de Natal foram pensadas para celebrar o que realmente importa: o tempo em família, os vínculos e a beleza dos pequenos momentos que tornam esta época tão especial.\n\nEm um ambiente acolhedor e cheio de significado, criamos uma experiência leve e descontraída, para que vocês possam viver esse momento com tranquilidade, enquanto registramos a essência da sua família com naturalidade e sensibilidade.",
   "vertical_label": "",
   "details": []
  },
  "props": {
   "variant": "light-intro",
   "align": "left",
   "background": "white",
   "text_color": "default",
   "photo_a": { "width_pct": 72, "height_pct": 80, "image_ref": null },
   "photo_b": { "width_pct": 62, "height_pct": 66, "image_ref": null }
  }
 },
 {
  "id": "sn_pkg_cards",
  "type": "PricingTable",
  "content": {
   "eyebrow": "Sessões de Natal",
   "title": "Pacotes",
   "title_italic": "",
   "subtitle": "Memórias que aquecem sempre",
   "packages": [
    {
     "id": "sn_p1", "name": "Essencial", "description": "Para guardar o que importa", "price": "R$ 490", "price_unit": "", "price_cash": "", "price_installments": "", "badge": "", "image_ref": "",
     "features": ["Até 3 participantes", "5 fotos digitais em alta resolução", "1 cenário", "1 troca de roupa"],
     "feature_icons": []
    },
    {
     "id": "sn_p2", "name": "Completo", "description": "Uma experiência ainda mais especial", "price": "R$ 790", "price_unit": "", "price_cash": "", "price_installments": "", "badge": "Mais escolhido", "image_ref": "",
     "features": ["Até 5 participantes", "10 fotos digitais em alta resolução", "2 cenários", "2 trocas de roupa (uma por cenário)"],
     "feature_icons": []
    },
    {
     "id": "sn_p3", "name": "Premium", "description": "Para quem deseja viver mais momentos", "price": "R$ 1.190", "price_unit": "", "price_cash": "", "price_installments": "", "badge": "", "image_ref": "",
     "features": ["Até 6 participantes", "15 fotos digitais em alta resolução", "2 cenários", "2 trocas de roupa (uma por cenário)", "1 álbum fotográfico 20x20cm"],
     "feature_icons": []
    }
   ],
   "highlights": [
    { "id": "sn_ph1", "label": "Vestuário disponível", "icon": "" },
    { "id": "sn_ph2", "label": "Reserva e pagamento online", "icon": "" },
    { "id": "sn_ph3", "label": "Seleção das fotos pela galeria", "icon": "" },
    { "id": "sn_ph4", "label": "Entrega em até 15 dias", "icon": "" }
   ],
   "footnote": "Viva a magia do agora"
  },
  "props": { "variant": "photo-cards", "background": "cream", "text_color": "default" }
 },
 {
  "id": "sn_pkg_rows",
  "type": "PricingTable",
  "content": {
   "eyebrow": "Sessões de Natal",
   "title": "Pacotes",
   "title_italic": "",
   "subtitle": "Memórias que aquecem sempre",
   "packages": [
    {
     "id": "sn_r1", "name": "Essencial", "description": "Para guardar o que importa.", "price": "R$ 490", "price_unit": "", "price_cash": "", "price_installments": "", "badge": "", "image_ref": "",
     "features": ["Até 3 participantes", "5 fotos digitais", "1 cenário", "1 troca de roupa"],
     "feature_icons": []
    },
    {
     "id": "sn_r2", "name": "Completo", "description": "Uma experiência ainda mais especial.", "price": "R$ 790", "price_unit": "", "price_cash": "", "price_installments": "", "badge": "Mais escolhido", "image_ref": "",
     "features": ["Até 5 participantes", "10 fotos digitais", "2 cenários", "2 trocas de roupa"],
     "feature_icons": []
    },
    {
     "id": "sn_r3", "name": "Premium", "description": "Para viver mais momentos.", "price": "R$ 1.190", "price_unit": "", "price_cash": "", "price_installments": "", "badge": "", "image_ref": "",
     "features": ["Até 6 participantes", "15 fotos digitais", "2 cenários", "2 trocas de roupa", "Álbum fotográfico 20x20 cm"],
     "feature_icons": []
    }
   ],
   "highlights": [
    { "id": "sn_rh1", "label": "Vestuário disponível", "icon": "" },
    { "id": "sn_rh2", "label": "Reserva online", "icon": "" },
    { "id": "sn_rh3", "label": "Seleção pela galeria", "icon": "" },
    { "id": "sn_rh4", "label": "Entrega em até 15 dias", "icon": "" }
   ],
   "footnote": ""
  },
  "props": { "variant": "photo-rows", "background": "cream", "text_color": "default" }
 },
 {
  "id": "sn_pkg_arch",
  "type": "PricingTable",
  "content": {
   "eyebrow": "Nossos pacotes",
   "title": "Escolha a sua",
   "title_italic": "experiência",
   "subtitle": "Cada sessão de Natal foi pensada para criar memórias reais, com todo o cuidado em cada detalhe.",
   "item_label": "Pacote",
   "packages": [
    {
     "id": "sn_a1", "name": "Essencial", "description": "O essencial para guardar os momentos mais especiais.", "price": "R$ 490", "price_unit": "", "price_cash": "", "price_installments": "", "badge": "", "image_ref": "",
     "features": ["10 fotografias digitais", "1 cenário", "Até 1 hora de sessão", "Galeria online para seleção"]
    },
    {
     "id": "sn_a2", "name": "Completo", "description": "A experiência completa para viver e guardar cada detalhe.", "price": "R$ 790", "price_unit": "", "price_cash": "", "price_installments": "", "badge": "Mais escolhido", "image_ref": "",
     "features": ["20 fotografias digitais", "2 cenários", "Até 2 horas de sessão", "Galeria online para seleção", "1 álbum fotográfico 20x20cm"]
    },
    {
     "id": "sn_a3", "name": "Premium", "description": "Uma experiência completa para quem deseja ainda mais.", "price": "R$ 1.190", "price_unit": "", "price_cash": "", "price_installments": "", "badge": "", "image_ref": "",
     "features": ["30 fotografias digitais", "2 cenários", "Até 2 horas de sessão", "Galeria online para seleção", "1 álbum fotográfico 25x25cm", "Fotografias extras com valor especial"]
    }
   ],
   "highlights": [],
   "footnote": "Memórias que aquecem sempre"
  },
  "props": { "variant": "arch-cards", "background": "cream", "text_color": "default" }
 },
 {
  "type": "global_settings",
  "data": { "collection": "natal" }
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
