-- ============================================================
-- COMERCIAL: modelo "Sessões de Natal" (editorial natalino)
-- Tema Natal Editorial: marfim, caramelo e verde muito escuro (Bodoni Moda / Montserrat /
-- Pinyon Script). Reaplicável: cada fase da implementação atualiza o mesmo modelo.
-- Uma capa e um grupo de pacotes: as outras composições (capa Medalhão/Noturna; pacotes em
-- linhas/arco) são escolhidas em "Composição" no editor. Por isso a capa e os pacotes já
-- carregam o conteúdo de todas as composições (fotos dos 3 arcos, destaques da Noturna,
-- rótulo dos cartões em arco): trocar de composição não perde texto nem foto.
-- title_style fica sem valor: cada capa usa o próprio padrão (Arcos caligráfica, demais caixa-alta).
-- Fase 4: Adicionais (AddonsBlock, Cartões; Linhas em "Composição"), preços de exemplo editáveis.
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
   "photo_c": "",
   "highlights": [
    { "id": "sn_h1", "label": "Sessões limitadas", "icon": "" },
    { "id": "sn_h2", "label": "Uma experiência para sua família", "icon": "" },
    { "id": "sn_h3", "label": "Temporada 2026", "icon": "" }
   ]
  },
  "props": {
   "variant": "arches-trio",
   "background": "white",
   "text_color": "default"
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
   "item_label": "Pacote",
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
  "id": "sn_addons",
  "type": "AddonsBlock",
  "content": {
   "eyebrow": "Sessões de Natal",
   "title": "Adicionais e",
   "title_italic": "Extras",
   "subtitle": "Personalize a sua sessão",
   "items": [
    { "id": "sn_x1", "name": "Foto extra", "description": "Mais registros para você guardar cada detalhe deste momento.", "price": "R$ 35,00", "image_ref": "", "icon": "" },
    { "id": "sn_x2", "name": "Impressão", "description": "Impressões em papel fotográfico profissional.", "price": "R$ 10,00", "image_ref": "", "icon": "" },
    { "id": "sn_x3", "name": "Álbum fotográfico", "description": "Suas fotos em um álbum personalizado de alta qualidade.", "price": "R$ 490,00", "image_ref": "", "icon": "" },
    { "id": "sn_x4", "name": "Quadro de madeira", "description": "Suas fotos em um quadro com moldura de madeira, para decorar seu ambiente.", "price": "R$ 49,00", "image_ref": "", "icon": "" },
    { "id": "sn_x5", "name": "Porta-retrato", "description": "Suas fotos em um porta-retrato elegante, perfeito para qualquer ambiente.", "price": "R$ 20,00", "image_ref": "", "icon": "frame" }
   ],
   "highlights": [
    { "id": "sn_xh1", "label": "Produtos de alta qualidade", "icon": "heart" },
    { "id": "sn_xh2", "label": "Entrega em até 15 dias", "icon": "truck" },
    { "id": "sn_xh3", "label": "Pagamento seguro", "icon": "shield" },
    { "id": "sn_xh4", "label": "Opções para presentear", "icon": "gift" }
   ]
  },
  "props": { "variant": "grid", "background": "cream", "text_color": "default" }
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
