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
-- Fase 7: Encerramento (CTABlock Assinatura: caligrafia com a assinatura do perfil, foto abaixo, sem botão por padrão).
-- Fase 6: Informações práticas (lista com ícones) e Reserva (etapas + lista de condições, sem cabeçalho).
-- Fase 5: Dicas de looks (Texto e Luz com foto em moldura, Paleta, Galeria com legendas, Orientações com ícone).
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
  "id": "sn_looks",
  "type": "EditorialBlock",
  "content": {
   "eyebrow": "Guia de estilo",
   "title": "Dicas de",
   "title_italic": "looks",
   "body": "Nossas sugestões de looks e cores foram pensadas para harmonizar com o cenário e valorizar ainda mais esse momento especial da sua família.",
   "vertical_label": "",
   "details": []
  },
  "props": {
   "variant": "light-intro",
   "align": "left",
   "background": "white",
   "text_color": "default",
   "photo_style": "frame",
   "photo_a": { "width_pct": 72, "height_pct": 80, "image_ref": null },
   "photo_b": { "width_pct": 62, "height_pct": 66, "image_ref": null }
  }
 },
 {
  "id": "sn_palette",
  "type": "PaletteBlock",
  "content": {
   "title": "Paleta de cores",
   "note": "Essas são as cores que mais combinam com o cenário desta sessão. Use como base na escolha dos looks da família.",
   "colors": [
    { "id": "sn_c1", "name": "Off white", "hex": "#F7F3EB" },
    { "id": "sn_c2", "name": "Bege", "hex": "#D9C6B0" },
    { "id": "sn_c3", "name": "Caramelo", "hex": "#A67C52" },
    { "id": "sn_c4", "name": "Verde oliva", "hex": "#55624F" },
    { "id": "sn_c5", "name": "Verde escuro", "hex": "#2F3E2F" },
    { "id": "sn_c6", "name": "Vinho", "hex": "#6B1F28" }
   ]
  },
  "props": { "background": "white", "text_color": "default" }
 },
 {
  "id": "sn_inspiration",
  "type": "Gallery",
  "content": {
   "eyebrow": "",
   "title": "Inspirações de looks",
   "caption": "Algumas combinações que funcionam muito bem para este tipo de ensaio. Sinta-se à vontade para adaptar ao seu estilo.",
   "images": [
    { "id": "sn_g1", "image_ref": "", "span": "normal", "ratio": "auto", "caption": "Tons neutros com toque de vinho" },
    { "id": "sn_g2", "image_ref": "", "span": "normal", "ratio": "auto", "caption": "Combinações em tons naturais" },
    { "id": "sn_g3", "image_ref": "", "span": "normal", "ratio": "auto", "caption": "Peças confortáveis e atemporais" },
    { "id": "sn_g4", "image_ref": "", "span": "normal", "ratio": "auto", "caption": "Harmonia entre as peças" }
   ]
  },
  "props": { "align": "left", "background": "white", "text_color": "default", "layout": "captioned", "ratio": "4/5" }
 },
 {
  "id": "sn_tips",
  "type": "InfoBlock",
  "content": {
   "eyebrow": "",
   "title": "Algumas orientações",
   "image_url": "",
   "items": [
    { "id": "sn_t1", "title": "Priorize tons neutros e terrosos", "body": "Eles harmonizam com o cenário e deixam as fotos mais atemporais.", "icon": "shirt" },
    { "id": "sn_t2", "title": "Evite cores muito vibrantes", "body": "Cores muito fortes podem disputar a atenção e tirar o foco da sua família.", "icon": "palette" },
    { "id": "sn_t3", "title": "Combine entre a família", "body": "Escolha de 2 a 4 cores da paleta e distribua entre os looks de forma equilibrada.", "icon": "users" },
    { "id": "sn_t4", "title": "Opte por peças confortáveis", "body": "Roupas que permitam movimento ajudam a manter a naturalidade nas fotos.", "icon": "shirt" }
   ]
  },
  "props": { "variant": "icon-columns", "align": "left", "background": "white", "text_color": "default" }
 },
 {
  "id": "sn_info",
  "type": "InfoBlock",
  "content": {
   "eyebrow": "",
   "title": "Informações",
   "title_italic": "Práticas",
   "subtitle": "Tudo o que você precisa saber para viver essa experiência",
   "image_url": "",
   "items": [
    { "id": "sn_i1", "title": "Local", "body": "Nosso estúdio é um espaço privativo, aconchegante e preparado para receber você e sua família com todo o cuidado.", "icon": "location" },
    { "id": "sn_i2", "title": "Duração", "body": "As sessões têm duração de até 1 hora, com tempo suficiente para fotos tranquilas, sem pressa e no ritmo da sua família.", "icon": "clock" },
    { "id": "sn_i3", "title": "Quem pode participar", "body": "A sessão pode incluir pais, irmãos e outros familiares. O número de participantes varia conforme o pacote escolhido.", "icon": "users" },
    { "id": "sn_i4", "title": "Cenários", "body": "O estúdio conta com cenários exclusivos de Natal, cuidadosamente preparados para criar memórias inesquecíveis.", "icon": "tree" },
    { "id": "sn_i5", "title": "Vestuário", "body": "Disponibilizamos peças selecionadas para a sessão. Também sugerimos que traga opções que combinem com o estilo do ensaio.", "icon": "shirt" },
    { "id": "sn_i6", "title": "Entrega das fotos", "body": "Você receberá suas fotos em uma galeria online, com todas as imagens do ensaio para seleção, conforme o prazo informado na proposta.", "icon": "images" }
   ],
   "note_title": "Informações importantes",
   "note_body": "Horários, cenários e disponibilidade podem variar conforme a data escolhida. Qualquer dúvida, estamos à disposição para te ajudar!",
   "note_icon": "sparkles"
  },
  "props": { "variant": "icon-list", "align": "left", "background": "white", "text_color": "default" }
 },
 {
  "id": "sn_booking",
  "type": "InfoBlock",
  "content": {
   "eyebrow": "",
   "title": "Reserva e",
   "title_italic": "Condições",
   "subtitle": "Para garantir a sua sessão com tranquilidade",
   "image_url": "",
   "list_title": "Como funciona a reserva",
   "items": [
    { "id": "sn_b1", "title": "Escolha a data", "body": "Verifique a disponibilidade e defina a melhor data para a sua sessão." },
    { "id": "sn_b2", "title": "Reserva", "body": "A reserva é confirmada mediante o pagamento de 30% do valor do pacote escolhido." },
    { "id": "sn_b3", "title": "Realização", "body": "No dia da sessão, tudo já estará preparado para te receber com muito conforto e cuidado." },
    { "id": "sn_b4", "title": "Entrega", "body": "Após o ensaio, você receberá o acesso à galeria online no prazo combinado na sua proposta." }
   ],
   "note_title": "",
   "note_body": "",
   "note_icon": ""
  },
  "props": { "variant": "steps", "align": "left", "background": "white", "text_color": "default" }
 },
 {
  "id": "sn_terms",
  "type": "InfoBlock",
  "content": {
   "eyebrow": "",
   "title": "",
   "title_italic": "",
   "subtitle": "",
   "image_url": "",
   "items": [
    { "id": "sn_k1", "title": "Formas de pagamento", "body": "Aceitamos Pix, cartão de crédito e transferência bancária. O pagamento pode ser parcelado conforme as condições da proposta.", "icon": "card" },
    { "id": "sn_k2", "title": "Alterações e cancelamentos", "body": "Em caso de necessidade de remarcação, entre em contato com antecedência. Os detalhes sobre prazos e condições estão descritos no contrato.", "icon": "calendar" },
    { "id": "sn_k3", "title": "Contrato", "body": "A reserva da sessão é validada com a assinatura do contrato, que garante todos os detalhes combinados, incluindo data, pacote, formas de pagamento e condições gerais.", "icon": "contract" }
   ],
   "note_title": "Estamos à disposição",
   "note_body": "Qualquer dúvida, entre em contato. Será um prazer te atender!",
   "note_icon": "heart"
  },
  "props": { "variant": "icon-list", "align": "left", "background": "white", "text_color": "default" }
 },
 {
  "id": "sn_closing",
  "type": "CTABlock",
  "content": {
   "eyebrow": "",
   "cta_text": "Vamos criar",
   "cta_italic": "memórias juntos?",
   "body": "Será um prazer registrar essa fase tão especial da sua família. Cada detalhe desta proposta foi pensado para que vocês vivam uma experiência leve, divertida e cheia de significado.\n\nEstou à disposição para confirmar sua reserva ou esclarecer qualquer dúvida.",
   "signature": "Nome do Estúdio",
   "signature_caption": "Fotografia",
   "image_url": "",
   "btnText": "",
   "links": []
  },
  "props": { "variant": "signature", "background": "white", "text_color": "default" }
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
