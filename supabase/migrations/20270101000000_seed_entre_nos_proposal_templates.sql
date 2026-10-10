-- ============================================================
-- COMERCIAL: modelos "Entre Nós" (editorial de referência "Sessão casal")
-- Tema Areia Editorial (Italiana / Jost / Cormorant Garamond, títulos em caixa-alta).
-- Narrativo = textos longos; Essencial = frases de impacto. Mesmo bloco de pacotes "Revista".
-- Fotos ficam só na miniatura (public/templates): o hidratador esvazia as imagens ao criar a proposta.
-- Valores dos pacotes são exemplos; pacotes reais da categoria substituem os do 1º bloco de preços.
-- ============================================================

INSERT INTO public.proposal_templates (template_id, name, description, tags, blocks_json, design_tokens, thumbnail_url)
VALUES (
  'entre-nos-narrativo',
  'Entre Nós — Narrativo',
  'Editorial em tons de areia para quem gosta de contar a história: sobre você, guia do ensaio, condições e pacotes estilo revista.',
  ARRAY['editorial', 'narrativo', 'revista'],
  '[
 {
  "id": "en_cover",
  "type": "CoverBlock",
  "content": {
   "eyebrow": "Sessão casal",
   "title": "Entre nós",
   "title_italic": "",
   "subtitle": "Fotografias que atravessam o tempo.",
   "photographer_name": "",
   "btnText": "",
   "btnLink": "",
   "image_url": ""
  },
  "props": {
   "variant": "poster-sky",
   "align": "center",
   "background": "white",
   "text_color": "default"
  }
 },
 {
  "id": "en_about",
  "type": "EditorialBlock",
  "content": {
   "eyebrow": "",
   "title": "Conheça sua fotógrafa",
   "title_italic": "",
   "body": "Há anos registro histórias reais com um olhar leve, limpo e atemporal. Cada sessão é pensada nos detalhes, para que as fotografias guardem não só como vocês estavam, mas como se sentiam.\n\nConduzo tudo com calma, deixo vocês à vontade e entrego imagens que continuam fazendo sentido muitos anos depois.",
   "vertical_label": "",
   "aside": "Para mim,\ntoda história\ncomeça com uma\nmemória.\n\nE a fotografia\né o que faz\nessa memória\nficar.\n\nVamos guardar\na de vocês?",
   "details": []
  },
  "props": {
   "variant": "arch-portrait",
   "align": "justify",
   "background": "white",
   "text_color": "default",
   "photo_a": {
    "width_pct": 72,
    "height_pct": 80,
    "image_ref": null
   },
   "photo_b": {
    "width_pct": 62,
    "height_pct": 66,
    "image_ref": null
   }
  }
 },
 {
  "id": "en_gallery",
  "type": "Gallery",
  "content": {
   "eyebrow": "",
   "title": "",
   "caption": "",
   "images": [
    {
     "id": "en_g1",
     "image_ref": "",
     "span": "normal",
     "ratio": "4/5"
    },
    {
     "id": "en_g2",
     "image_ref": "",
     "span": "normal",
     "ratio": "4/5"
    },
    {
     "id": "en_g3",
     "image_ref": "",
     "span": "normal",
     "ratio": "4/5"
    },
    {
     "id": "en_g4",
     "image_ref": "",
     "span": "normal",
     "ratio": "4/5"
    }
   ]
  },
  "props": {
   "align": "center",
   "background": "white",
   "layout": "grid"
  }
 },
 {
  "id": "en_tips",
  "type": "InfoBlock",
  "content": {
   "eyebrow": "",
   "title": "",
   "image_url": "",
   "items": [
    {
     "id": "en_tips_0",
     "title": "Maquiagem e cabelo",
     "body": "A maquiagem e o cabelo ficam por sua conta: escolha a profissional de sua preferência.\nPrefira uma maquiagem leve, com pouco iluminador, e evite delinear a linha d’água muito escura, para que o olhar apareça nas fotos."
    },
    {
     "id": "en_tips_1",
     "title": "O que vestir",
     "body": "Peças leves e em tons neutros funcionam muito bem: vestidos fluidos, cardigã, jeans e camisa social. Harmonize as cores entre vocês para que o resultado fique mais agradável."
    },
    {
     "id": "en_tips_2",
     "title": "O que editamos",
     "body": "Ajustamos luz, cores e contraste, e suavizamos pequenos detalhes de pele conforme a sua preferência."
    }
   ]
  },
  "props": {
   "variant": "stacked",
   "align": "justify",
   "background": "white",
   "text_color": "default"
  }
 },
 {
  "id": "en_terms",
  "type": "InfoBlock",
  "content": {
   "eyebrow": "",
   "title": "",
   "image_url": "",
   "items": [
    {
     "id": "en_terms_0",
     "title": "Ensaios externos",
     "body": "Para locações fora da cidade, consulte a taxa de deslocamento.\n\nLocais particulares que cobram entrada têm o valor por conta do cliente, incluindo a entrada da fotógrafa."
    },
    {
     "id": "en_terms_1",
     "title": "Pagamento",
     "body": "À vista, a data é reservada com um sinal no agendamento e o restante é pago no dia da sessão.\n\nParcelado, o pagamento é feito no agendamento, por link de pagamento ou cartão de crédito no estúdio."
    },
    {
     "id": "en_terms_2",
     "title": "Prazo de entrega",
     "body": "As fotos são impressas e entregues após a quitação do valor total, incluindo fotos extras.\n\nAgende com antecedência!"
    }
   ]
  },
  "props": {
   "variant": "stacked",
   "align": "justify",
   "background": "white",
   "text_color": "default"
  }
 },
 {
  "id": "en_pkg1",
  "type": "PricingTable",
  "content": {
   "eyebrow": "Pacotes",
   "title": "Estúdio",
   "subtitle": "Escolha a melhor experiência para\nregistrar o que é de vocês.",
   "packages": [
    {
     "id": "pa",
     "name": "5 fotos",
     "price": "R$ 300,00",
     "price_unit": "sessão",
     "price_cash": "",
     "price_installments": "3x de R$ 100,00",
     "badge": "",
     "image_ref": "",
     "features": [
      "5 fotos em arquivo digital e impressas 15x20",
      "Foto extra R$ 30,00",
      "1 look, até 40 min de sessão"
     ]
    },
    {
     "id": "pb",
     "name": "10 fotos",
     "price": "R$ 480,00",
     "price_unit": "sessão",
     "price_cash": "",
     "price_installments": "4x de R$ 120,00",
     "badge": "",
     "image_ref": "",
     "features": [
      "10 fotos em arquivo digital e impressas 15x20",
      "Foto extra R$ 30,00",
      "Até 2 looks, 1h de sessão"
     ]
    }
   ]
  },
  "props": {
   "variant": "magazine",
   "align": "center",
   "background": "white"
  }
 },
 {
  "id": "en_pkg2",
  "type": "PricingTable",
  "content": {
   "eyebrow": "Pacote",
   "title": "Estúdio ou externo",
   "subtitle": "",
   "packages": [
    {
     "id": "pc",
     "name": "20 fotos",
     "price": "R$ 750,00",
     "price_unit": "sessão",
     "price_cash": "",
     "price_installments": "5x de R$ 150,00",
     "badge": "",
     "image_ref": "",
     "features": [
      "20 fotos em arquivo digital e impressas 15x20",
      "Foto extra R$ 30,00",
      "Até 3 looks, 1h30 de sessão"
     ]
    }
   ]
  },
  "props": {
   "variant": "magazine",
   "align": "center",
   "background": "white",
   "eyebrow_rules": true
  }
 },
 {
  "id": "en_testimonials",
  "type": "TestimonialBlock",
  "content": {
   "eyebrow": "O que dizem",
   "title": "Depoimentos",
   "items": []
  },
  "props": {
   "align": "center",
   "background": "cream"
  }
 },
 {
  "id": "en_cta",
  "type": "CTABlock",
  "content": {
   "eyebrow": "Próximo passo",
   "cta_text": "Vamos guardar essa história?",
   "body": "As datas da temporada são limitadas. Me chame para reservar a de vocês.",
   "btnText": "Falar no WhatsApp",
   "links": []
  },
  "props": {
   "align": "center",
   "background": "cream"
  }
 },
 {
  "id": "en_footer",
  "type": "FooterTerms",
  "content": {
   "terms": "Proposta válida por 7 dias. A data é reservada mediante sinal.",
   "copyright": ""
  },
  "props": {
   "background": "white"
  }
 }
]'::jsonb,
  '{"colors":{"cream":"#F6EFE7","linen":"#EDE3D8","stone":"#D0C8BC","taupe":"#9B6338","accent":"#6D3C1B","ink":"#251910","white":"#FFFDFB"},"typography":{"display":"Italiana","body":"Jost","accent":"Cormorant Garamond","title_case":"upper"},"shape":"sharp"}'::jsonb,
  '/templates/entre-nos-narrativo.jpg'
)
ON CONFLICT (template_id) DO NOTHING;

INSERT INTO public.proposal_templates (template_id, name, description, tags, blocks_json, design_tokens, thumbnail_url)
VALUES (
  'entre-nos-essencial',
  'Entre Nós — Essencial',
  'O mesmo editorial com menos texto e mais impacto: frases curtas, pacotes estilo revista e informações em sanfona.',
  ARRAY['editorial', 'essencial', 'revista'],
  '[
 {
  "id": "ee_cover",
  "type": "CoverBlock",
  "content": {
   "eyebrow": "Sessão casal",
   "title": "Entre nós",
   "title_italic": "",
   "subtitle": "Fotografias que atravessam o tempo.",
   "photographer_name": "",
   "btnText": "",
   "btnLink": "",
   "image_url": ""
  },
  "props": {
   "variant": "poster-sky",
   "align": "center",
   "background": "white",
   "text_color": "default"
  }
 },
 {
  "id": "ee_about",
  "type": "EditorialBlock",
  "content": {
   "eyebrow": "",
   "title": "Conheça sua fotógrafa",
   "title_italic": "",
   "body": "",
   "vertical_label": "",
   "aside": "Para mim,\ntoda história\ncomeça com uma\nmemória.\n\nE a fotografia\né o que faz\nessa memória\nficar.\n\nVamos guardar\na de vocês?",
   "details": []
  },
  "props": {
   "variant": "arch-portrait",
   "align": "justify",
   "background": "white",
   "text_color": "default",
   "photo_a": {
    "width_pct": 72,
    "height_pct": 80,
    "image_ref": null
   },
   "photo_b": {
    "width_pct": 62,
    "height_pct": 66,
    "image_ref": null
   }
  }
 },
 {
  "id": "ee_gallery",
  "type": "Gallery",
  "content": {
   "eyebrow": "",
   "title": "",
   "caption": "",
   "images": [
    {
     "id": "ee_g1",
     "image_ref": "",
     "span": "normal",
     "ratio": "4/5"
    },
    {
     "id": "ee_g2",
     "image_ref": "",
     "span": "normal",
     "ratio": "4/5"
    },
    {
     "id": "ee_g3",
     "image_ref": "",
     "span": "normal",
     "ratio": "4/5"
    },
    {
     "id": "ee_g4",
     "image_ref": "",
     "span": "normal",
     "ratio": "4/5"
    }
   ]
  },
  "props": {
   "align": "center",
   "background": "white",
   "layout": "grid"
  }
 },
 {
  "id": "ee_pkg",
  "type": "PricingTable",
  "content": {
   "eyebrow": "Pacotes",
   "title": "Investimento",
   "subtitle": "Escolha a melhor experiência para\nregistrar o que é de vocês.",
   "packages": [
    {
     "id": "pa",
     "name": "5 fotos",
     "price": "R$ 300,00",
     "price_unit": "sessão",
     "price_cash": "",
     "price_installments": "3x de R$ 100,00",
     "badge": "",
     "image_ref": "",
     "features": [
      "5 fotos em arquivo digital e impressas 15x20",
      "Foto extra R$ 30,00",
      "1 look, até 40 min de sessão"
     ]
    },
    {
     "id": "pb",
     "name": "10 fotos",
     "price": "R$ 480,00",
     "price_unit": "sessão",
     "price_cash": "",
     "price_installments": "4x de R$ 120,00",
     "badge": "",
     "image_ref": "",
     "features": [
      "10 fotos em arquivo digital e impressas 15x20",
      "Foto extra R$ 30,00",
      "Até 2 looks, 1h de sessão"
     ]
    },
    {
     "id": "pc",
     "name": "20 fotos",
     "price": "R$ 750,00",
     "price_unit": "sessão",
     "price_cash": "",
     "price_installments": "5x de R$ 150,00",
     "badge": "",
     "image_ref": "",
     "features": [
      "20 fotos em arquivo digital e impressas 15x20",
      "Foto extra R$ 30,00",
      "Até 3 looks, 1h30 de sessão"
     ]
    }
   ]
  },
  "props": {
   "variant": "magazine",
   "align": "center",
   "background": "white"
  }
 },
 {
  "id": "ee_faq",
  "type": "InfoBlock",
  "content": {
   "eyebrow": "Antes da sessão",
   "title": "Bom saber",
   "image_url": "",
   "items": [
    {
     "id": "ee_faq_0",
     "title": "O que vestir",
     "body": "Peças leves e em tons neutros funcionam muito bem: vestidos fluidos, cardigã, jeans e camisa social. Harmonize as cores entre vocês para que o resultado fique mais agradável."
    },
    {
     "id": "ee_faq_1",
     "title": "Pagamento",
     "body": "À vista, a data é reservada com um sinal no agendamento e o restante é pago no dia da sessão.\n\nParcelado, o pagamento é feito no agendamento, por link de pagamento ou cartão de crédito no estúdio."
    },
    {
     "id": "ee_faq_2",
     "title": "Prazo de entrega",
     "body": "As fotos são impressas e entregues após a quitação do valor total, incluindo fotos extras.\n\nAgende com antecedência!"
    }
   ]
  },
  "props": {
   "variant": "accordion",
   "align": "justify",
   "background": "white",
   "text_color": "default"
  }
 },
 {
  "id": "ee_cta",
  "type": "CTABlock",
  "content": {
   "eyebrow": "Próximo passo",
   "cta_text": "Vamos guardar essa história?",
   "body": "As datas da temporada são limitadas. Me chame para reservar a de vocês.",
   "btnText": "Falar no WhatsApp",
   "links": []
  },
  "props": {
   "align": "center",
   "background": "cream"
  }
 }
]'::jsonb,
  '{"colors":{"cream":"#F6EFE7","linen":"#EDE3D8","stone":"#D0C8BC","taupe":"#9B6338","accent":"#6D3C1B","ink":"#251910","white":"#FFFDFB"},"typography":{"display":"Italiana","body":"Jost","accent":"Cormorant Garamond","title_case":"upper"},"shape":"sharp"}'::jsonb,
  '/templates/entre-nos-essencial.jpg'
)
ON CONFLICT (template_id) DO NOTHING;
