-- =========================================================================
-- EVOLUÇÃO DOS MODELOS PADRÃO DE PROPOSTAS (LUXO SILENCIOSO & JORNADA COMPLETA)
-- - Não altera nenhum modelo da coleção Natal (sessoes-natal*).
-- - Renomeia e atualiza o antigo "Sessão Casal (modelo)" (sessao-casal-modelo-ef15b1)
--   para "Revista Editorial" (revista-editorial), eliminando o legado FAQBlock.
-- - Garante 4 capas 100% distintas nos 4 modelos padrão:
--     1. Clássico Convidativo -> floating-frame (Quadro Suspenso Fine Art)
--     2. Editorial Sofisticado -> seam-side (Friso Lateral 50/50 Noir)
--     3. Clean Minimal        -> editorial-diptych (Díptico Editorial 2 fotos)
--     4. Revista Editorial    -> poster-sky (Pôster Horizonte)
-- - Compartilham esqueleto de 10 seções compatível com troca 1:1 sem perda.
-- =========================================================================

UPDATE public.proposal_templates
SET template_id = 'revista-editorial'
WHERE template_id = 'sessao-casal-modelo-ef15b1'
  AND NOT EXISTS (
    SELECT 1 FROM public.proposal_templates WHERE template_id = 'revista-editorial'
  );

UPDATE public.proposal_templates
SET is_active = false
WHERE template_id IN ('sessao-casal-modelo-ef15b1', 'entre-nos-narrativo', 'entre-nos-essencial');

INSERT INTO public.proposal_templates (
  template_id,
  name,
  description,
  tags,
  preview_html_path,
  thumbnail_url,
  blocks_json,
  design_tokens,
  is_active
) VALUES
(
  'proposta-modelo-classico',
  'Clássico Convidativo',
  'Capa em moldura suspensa Fine Art, paleta creme e terracota suave, pacotes em cartões elevados, guia de looks, etapas de reserva e depoimentos.',
  ARRAY['classico', 'acolhedor', 'família', 'gestante'],
  '',
  NULL,
  '[
    {
      "id": "std_cover",
      "type": "CoverBlock",
      "props": {
        "variant": "floating-frame",
        "background": "cream",
        "align": "center"
      },
      "content": {
        "eyebrow": "Proposta Fotográfica",
        "title": "Memórias que atravessam",
        "title_italic": "gerações",
        "subtitle": "Uma experiência leve, acolhedora e pensada em cada detalhe para transformar o seu momento em legado afetivo.",
        "photographer_name": "Nome do Estúdio",
        "btnText": "Explorar proposta",
        "btnLink": "",
        "image_url": "",
        "photo_b": ""
      }
    },
    {
      "id": "std_intro",
      "type": "EditorialBlock",
      "props": {
        "variant": "overlap-blend",
        "background": "white",
        "align": "left",
        "photo_a": { "width_pct": 72, "height_pct": 80, "image_ref": null },
        "photo_b": { "width_pct": 62, "height_pct": 66, "image_ref": null }
      },
      "content": {
        "eyebrow": "Nossa Filosofia",
        "title": "O tempo passa,",
        "title_italic": "o afeto permanece.",
        "vertical_label": "Nome do Estúdio",
        "details": [
          { "id": "cl_d1", "label": "Direção", "value": "Leve, natural e espontânea" },
          { "id": "cl_d2", "label": "Ambiente", "value": "Estúdio ou luz natural externa" },
          { "id": "cl_d3", "label": "Curadoria", "value": "Tratamento autoral e atemporal" }
        ],
        "body": "Mais do que poses ensaiadas, acreditamos em fotografias que guardam o som da risada, o abraço apertado e a verdade de quem vocês são hoje. Conduzimos toda a sessão com calma e sensibilidade para que vocês apenas vivam o momento."
      }
    },
    {
      "id": "std_gallery",
      "type": "Gallery",
      "props": {
        "layout": "masonry",
        "background": "cream",
        "align": "center"
      },
      "content": {
        "eyebrow": "Portfólio Selecionado",
        "title": "Histórias que já contamos",
        "caption": "Instantes reais registrados com luz suave e olhar afetuoso.",
        "images": [
          { "id": "cl_g1", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "cl_g2", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "cl_g3", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "cl_g4", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "cl_g5", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "cl_g6", "image_ref": "", "span": "normal", "ratio": "auto" }
        ]
      }
    },
    {
      "id": "std_pricing",
      "type": "PricingTable",
      "props": {
        "variant": "cards-classic",
        "background": "white",
        "align": "center"
      },
      "content": {
        "eyebrow": "Investimento",
        "title": "Coleções Disponíveis",
        "subtitle": "Escolha a experiência ideal para eternizar esta fase com tranquilidade.",
        "packages": [
          {
            "id": "cl_p1",
            "name": "Coleção Afeto",
            "badge": "",
            "price": "R$ 890",
            "price_unit": "sessão",
            "price_installments": "ou 3x de R$ 310",
            "image_ref": "",
            "features": [
              "Até 1 hora de sessão fotográfica",
              "15 fotografias digitais em alta resolução",
              "1 produção de look orientada",
              "Galeria online privativa para seleção",
              "Entrega digital em até 15 dias úteis"
            ]
          },
          {
            "id": "cl_p2",
            "name": "Coleção Essência",
            "badge": "Mais escolhido",
            "price": "R$ 1.390",
            "price_unit": "sessão",
            "price_installments": "ou 6x de R$ 248",
            "image_ref": "",
            "features": [
              "Até 2 horas de sessão sem pressa",
              "30 fotografias digitais em alta resolução",
              "Até 2 trocas de looks com consultoria",
              "10 impressões Fine Art 15x21cm em linho",
              "Galeria online privativa para família",
              "Entrega prioritária em até 10 dias úteis"
            ]
          },
          {
            "id": "cl_p3",
            "name": "Coleção Legado",
            "badge": "",
            "price": "R$ 2.190",
            "price_unit": "sessão",
            "price_installments": "ou 6x de R$ 390",
            "image_ref": "",
            "features": [
              "Sessão livre (até 3 horas de duração)",
              "Todas as melhores fotos tratadas (mín. 50)",
              "Até 3 trocas de looks e locação dupla",
              "Álbum artesanal 20x20cm em linho (20 págs)",
              "Caixa protetora personalizada",
              "Entrega VIP da galeria em 7 dias úteis"
            ]
          }
        ]
      }
    },
    {
      "id": "std_looks",
      "type": "InfoBlock",
      "props": {
        "variant": "columns",
        "background": "cream",
        "align": "left"
      },
      "content": {
        "eyebrow": "Guia de Estilo",
        "title": "Dicas de looks para o ensaio",
        "image_url": "",
        "items": [
          {
            "id": "cl_l1",
            "title": "Tons neutros e terrosos",
            "body": "Cores como off-white, bege, areia, caramelo, verde-oliva e terracota iluminam a pele, harmonizam com qualquer ambiente e mantêm as fotografias atemporais."
          },
          {
            "id": "cl_l2",
            "title": "Tecidos com textura e fluidez",
            "body": "Linho, algodão, tricô leve, cambraia e seda trazem movimento natural e riqueza visual aos retratos sem pesar na composição."
          },
          {
            "id": "cl_l3",
            "title": "Evite estampas e logos",
            "body": "Roupas com logotipos grandes, listras muito finas ou cores neon desviam a atenção do que realmente importa: a expressão e o vínculo entre vocês."
          },
          {
            "id": "cl_l4",
            "title": "Harmonia sem precisar combinar igual",
            "body": "Em vez de todos vestirem a mesma cor, escolha uma paleta de 2 a 3 tons que conversem entre si para criar profundidade e elegância."
          }
        ]
      }
    },
    {
      "id": "std_info",
      "type": "InfoBlock",
      "props": {
        "variant": "stacked",
        "background": "white",
        "align": "left"
      },
      "content": {
        "eyebrow": "Passo a Passo",
        "title": "Como funciona a sua experiência",
        "image_url": "",
        "items": [
          {
            "id": "cl_i1",
            "title": "Escolha da data e reserva",
            "body": "Definimos juntos a melhor data e horário conforme a luz ideal. A agenda é confirmada mediante assinatura digital do contrato e sinal de 30%."
          },
          {
            "id": "cl_i2",
            "title": "Alinhamento e preparação",
            "body": "Antes do ensaio, alinhamos suas referências, escolhemos os looks por fotos no WhatsApp e preparamos cada detalhe do roteiro."
          },
          {
            "id": "cl_i3",
            "title": "O dia da sessão fotográfica",
            "body": "Um encontro leve, no seu ritmo. Conduzimos todas as direções de forma natural para que mesmo quem é tímido se sinta completamente à vontade."
          },
          {
            "id": "cl_i4",
            "title": "Seleção pela galeria e entrega",
            "body": "Em até 5 dias úteis você recebe o link da sua galeria privativa para escolher suas fotos favoritas. Após a seleção, entregamos tudo finalizado no prazo combinado."
          }
        ]
      }
    },
    {
      "id": "std_faq",
      "type": "InfoBlock",
      "props": {
        "variant": "accordion",
        "background": "cream",
        "align": "left"
      },
      "content": {
        "eyebrow": "Informações Importantes",
        "title": "Dúvidas frequentes e condições",
        "image_url": "",
        "items": [
          {
            "id": "cl_q1",
            "title": "Quais são as formas de pagamento?",
            "body": "A reserva da data é feita com 30% de entrada via Pix, e o restante até o dia da sessão. Também parcelamos o valor total em até 6x no cartão de crédito."
          },
          {
            "id": "cl_q2",
            "title": "E se chover ou alguém ficar indisposto no dia?",
            "body": "Para ensaios externos em caso de chuva ou imprevistos de saúde, fazemos a remarcação sem nenhum custo adicional para a próxima data disponível."
          },
          {
            "id": "cl_q3",
            "title": "Posso adquirir fotos extras ou álbum depois?",
            "body": "Sim! Ao acessar sua galeria de seleção, você poderá incluir fotos avulsas adicionais (R$ 35 por foto) ou solicitar a diagramação do seu álbum Fine Art."
          },
          {
            "id": "cl_q4",
            "title": "Não sabemos posar. Vocês ajudam na direção?",
            "body": "Com certeza. Você não precisa saber posar: nós conduzimos movimentos leves e interações reais durante toda a sessão para capturar expressões espontâneas."
          },
          {
            "id": "cl_q5",
            "title": "Pets e familiares podem participar?",
            "body": "Sim, pets são muito bem-vindos! Basta nos avisar no alinhamento prévio para planejarmos o ritmo da sessão com todo o carinho."
          }
        ]
      }
    },
    {
      "id": "std_testimonials",
      "type": "TestimonialBlock",
      "props": {
        "variant": "columns",
        "background": "white",
        "align": "center"
      },
      "content": {
        "eyebrow": "Prova Social",
        "title": "O que dizem sobre a experiência",
        "items": [
          {
            "id": "cl_t1",
            "quote": "A direção foi tão leve que esquecemos da câmera nos primeiros cinco minutos. Quando abrimos a galeria, choramos de emoção com cada detalhe.",
            "author": "Mariana & Lucas",
            "service": "Ensaio em Família"
          },
          {
            "id": "cl_t2",
            "quote": "Desde as dicas de looks até a entrega do álbum em linho, tudo superou nossas expectativas. É um cuidado que a gente sente em cada etapa.",
            "author": "Carolina Mendes",
            "service": "Ensaio Gestante"
          },
          {
            "id": "cl_t3",
            "quote": "Eu sempre fui super tímido para fotos e saí do ensaio encantado. As fotografias ficaram naturais, elegantes e com a nossa essência.",
            "author": "Rafael & Beatriz",
            "service": "Sessão Autoral"
          }
        ]
      }
    },
    {
      "id": "std_closing",
      "type": "CTABlock",
      "props": {
        "variant": "classic",
        "background": "cream",
        "align": "center"
      },
      "content": {
        "eyebrow": "Próximo Passo",
        "cta_text": "Vamos eternizar essa fase juntos?",
        "body": "As vagas da agenda mensal são limitadas para garantirmos atenção exclusiva a cada história. Clique abaixo para verificarmos a disponibilidade da sua data.",
        "btnText": "Confirmar minha data no WhatsApp",
        "phone": "",
        "links": []
      }
    },
    {
      "id": "std_footer",
      "type": "FooterTerms",
      "props": {
        "background": "white"
      },
      "content": {
        "terms": "Proposta válida por 7 dias corridos. A reserva da data é confirmada mediante contrato e pagamento do sinal de 30%.",
        "copyright": "© 2026 Nome do Estúdio"
      }
    }
  ]'::jsonb,
  '{
    "colors": {
      "cream": "#FDFBF7",
      "linen": "#F0E9E1",
      "stone": "#D8C7B8",
      "taupe": "#8A7364",
      "accent": "#C86A46",
      "ink": "#2C2825",
      "white": "#FFFFFF"
    },
    "typography": {
      "display": "Playfair Display",
      "body": "Inter",
      "script": "Pinyon Script"
    },
    "shape": "soft"
  }'::jsonb,
  true
),
(
  'proposta-modelo-01',
  'Editorial Sofisticado',
  'Estética Noir de alto contraste: capa dividida 50/50, coleções numeradas, guia de direção de arte, carrossel de depoimentos e acabamento cinematográfico.',
  ARRAY['sofisticado', 'editorial', 'casamento', 'retratos'],
  '',
  NULL,
  '[
    {
      "id": "std_cover",
      "type": "CoverBlock",
      "props": {
        "variant": "seam-side",
        "background": "dark",
        "align": "left"
      },
      "content": {
        "eyebrow": "Apresentação Exclusiva",
        "title": "A arte de contar",
        "title_italic": "a sua história",
        "subtitle": "Fotografia autoral com direção cinematográfica, luz dramática e curadoria atemporal para momentos irrepetíveis.",
        "photographer_name": "Nome do Estúdio",
        "btnText": "Conhecer coleções",
        "btnLink": "",
        "image_url": "",
        "photo_b": ""
      }
    },
    {
      "id": "std_intro",
      "type": "EditorialBlock",
      "props": {
        "variant": "split-portrait",
        "background": "cream",
        "align": "left",
        "photo_a": { "width_pct": 72, "height_pct": 80, "image_ref": null },
        "photo_b": { "width_pct": 62, "height_pct": 66, "image_ref": null }
      },
      "content": {
        "eyebrow": "Visão Autoral",
        "title": "Estética, luz e presença",
        "title_italic": "",
        "vertical_label": "Nome do Estúdio",
        "body": "Cada projeto é concebido como um editorial único. Unimos a espontaneidade do fotojornalismo à precisão estética dos retratos clássicos, criando imagens densas, elegantes e imunes aos modismos passageiros.\n\nNosso compromisso é entregar uma narrativa visual que preserve a atmosfera real do seu dia com sofisticação absoluta.",
        "details": [
          { "id": "ed_d1", "label": "Direção de Arte", "value": "Editorial & Cinematográfica" },
          { "id": "ed_d2", "label": "Colorimetria", "value": "Fine Art Autoral" },
          { "id": "ed_d3", "label": "Equipamento", "value": "Full-Frame & Lentes Prime" },
          { "id": "ed_d4", "label": "Atendimento", "value": "Exclusivo com hora marcada" }
        ]
      }
    },
    {
      "id": "std_gallery",
      "type": "Gallery",
      "props": {
        "layout": "masonry",
        "background": "dark",
        "align": "center"
      },
      "content": {
        "eyebrow": "Curadoria Visual",
        "title": "Seleção Autoral",
        "caption": "Luz, sombra e emoção em composições atemporais.",
        "images": [
          { "id": "ed_g1", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "ed_g2", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "ed_g3", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "ed_g4", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "ed_g5", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "ed_g6", "image_ref": "", "span": "normal", "ratio": "auto" }
        ]
      }
    },
    {
      "id": "std_pricing",
      "type": "PricingTable",
      "props": {
        "variant": "numbered-editorial",
        "background": "cream",
        "align": "center"
      },
      "content": {
        "eyebrow": "Investimento",
        "title": "Coleções",
        "subtitle": "Propostas desenhadas para diferentes formatos de cobertura e entrega",
        "packages": [
          {
            "id": "ed_p1",
            "name": "Série I — Intimista",
            "badge": "",
            "price": "R$ 1.800",
            "price_cash": "R$ 1.800,00",
            "price_installments": "6x de R$ 320,00",
            "image_ref": "",
            "features": [
              "Até 2 horas de cobertura ou sessão dirigida",
              "40 fotografias em alta resolução com tratamento Fine Art",
              "Reunião de briefing e direção de estilo prévia",
              "Galeria digital privada com download em máxima qualidade"
            ]
          },
          {
            "id": "ed_p2",
            "name": "Série II — Autoral",
            "badge": "Mais escolhido",
            "price": "R$ 3.200",
            "price_cash": "R$ 3.200,00",
            "price_installments": "10x de R$ 345,00",
            "image_ref": "",
            "features": [
              "Até 4 horas de cobertura fotográfica exclusiva",
              "90 fotografias tratadas individualmente em alta resolução",
              "Consultoria completa de locação, luz e cronograma",
              "Álbum Editorial 25x25cm em revestimento nobre (24 páginas)",
              "Galeria online exclusiva para compartilhamento"
            ]
          },
          {
            "id": "ed_p3",
            "name": "Série III — Signature",
            "badge": "",
            "price": "R$ 5.400",
            "price_cash": "R$ 5.400,00",
            "price_installments": "10x de R$ 580,00",
            "image_ref": "",
            "features": [
              "Cobertura completa sem limite de horas no dia reservado",
              "Segundo fotógrafo dedicado para ângulos complementares",
              "Acervo completo editado (mínimo de 200 fotografias)",
              "Álbum Fine Art 30x30cm em couro ou linho importado (40 páginas)",
              "Caixa de preservação artesanal + entrega expressa"
            ]
          }
        ]
      }
    },
    {
      "id": "std_looks",
      "type": "InfoBlock",
      "props": {
        "variant": "columns",
        "background": "dark",
        "align": "left"
      },
      "content": {
        "eyebrow": "Direção & Estética",
        "title": "Preparação para resultados de revista",
        "image_url": "",
        "items": [
          {
            "id": "ed_l1",
            "title": "Alfaiataria e linhas limpas",
            "body": "Peças estruturadas, cortes monocromáticos, preto, marfim, chumbo e tons terrosos profundos valorizam o contraste de luz e sombra do estilo editorial."
          },
          {
            "id": "ed_l2",
            "title": "Iluminação e horário ideal",
            "body": "Planejamos o cronograma em torno da melhor luz natural (golden hour) ou utilizamos iluminação de cinema controlada em estúdio e eventos noturnos."
          },
          {
            "id": "ed_l3",
            "title": "Beleza e acabamento de pele",
            "body": "Recomendamos maquiagem com pele acetinada e natural, evitando excesso de brilho ou contorno marcado para um resultado clássico em alta resolução."
          },
          {
            "id": "ed_l4",
            "title": "Direção discreta e segura",
            "body": "Orientamos postura, ângulos e movimento com precisão tranquila, deixando espaço para que a emoção genuína aconteça diante da lente."
          }
        ]
      }
    },
    {
      "id": "std_info",
      "type": "InfoBlock",
      "props": {
        "variant": "stacked",
        "background": "cream",
        "align": "left"
      },
      "content": {
        "eyebrow": "Metodologia",
        "title": "Etapas do nosso trabalho",
        "image_url": "",
        "items": [
          {
            "id": "ed_i1",
            "title": "Reserva e contrato digital",
            "body": "A exclusividade da sua data é garantida com a assinatura eletrônica do contrato e o pagamento do sinal de 30% da coleção escolhida."
          },
          {
            "id": "ed_i2",
            "title": "Briefing e moodboard",
            "body": "Realizamos uma conversa de alinhamento para definir estética, referências visuais, figurino e roteiro de horários."
          },
          {
            "id": "ed_i3",
            "title": "Curadoria e pós-produção",
            "body": "Cada imagem selecionada passa por tratamento autoral de cor, textura e luz, além de backup triplo imediato em nuvem."
          },
          {
            "id": "ed_i4",
            "title": "Entrega digital e impressa",
            "body": "As fotografias finais são entregues em galeria privada de alta performance, seguida pela aprovação de layout e produção do seu álbum."
          }
        ]
      }
    },
    {
      "id": "std_faq",
      "type": "InfoBlock",
      "props": {
        "variant": "accordion",
        "background": "dark",
        "align": "left"
      },
      "content": {
        "eyebrow": "Transparência",
        "title": "Perguntas frequentes",
        "image_url": "",
        "items": [
          {
            "id": "ed_q1",
            "title": "Como funciona o pagamento e o parcelamento?",
            "body": "Trabalhamos com 30% de sinal na assinatura do contrato e o saldo quitado até 5 dias antes da data, ou parcelamento integral no cartão de crédito em até 10x."
          },
          {
            "id": "ed_q2",
            "title": "Vocês atendem fora da cidade ou em viagens?",
            "body": "Sim. Atendemos em todo o Brasil e no exterior. Custos de deslocamento e hospedagem são calculados de forma transparente conforme a localidade."
          },
          {
            "id": "ed_q3",
            "title": "Podemos personalizar uma coleção sob medida?",
            "body": "Perfeitamente. Caso o seu projeto exija horas adicionais, segundo fotógrafo ou álbuns extras para os pais, ajustamos a proposta à sua necessidade."
          },
          {
            "id": "ed_q4",
            "title": "Qual é o prazo de entrega das fotografias?",
            "body": "A prévia com destaques é enviada em até 72 horas. A galeria completa tratada é entregue em até 15 dias úteis para ensaios e 30 dias úteis para eventos."
          },
          {
            "id": "ed_q5",
            "title": "As fotos são entregues em alta resolução sem marca d''água?",
            "body": "Sim. Todos os arquivos finais são entregues em máxima resolução, prontos para impressão Fine Art, além de versões otimizadas para redes sociais."
          }
        ]
      }
    },
    {
      "id": "std_testimonials",
      "type": "TestimonialBlock",
      "props": {
        "variant": "carousel",
        "background": "cream",
        "align": "center"
      },
      "content": {
        "eyebrow": "Reconhecimento",
        "title": "A experiência por quem viveu",
        "items": [
          {
            "id": "ed_t1",
            "quote": "Cada fotografia parece um quadro de cinema. A sensibilidade para captar olhares e a elegância da edição transformaram o nosso dia em arte pura.",
            "author": "Helena & Gabriel",
            "service": "Coleção Signature"
          },
          {
            "id": "ed_t2",
            "quote": "Postura impecável, direção segura e um olhar fora do comum. Recebemos elogios de todos que veem o nosso álbum.",
            "author": "Dra. Cláudia Vasconcelos",
            "service": "Retrato Editorial"
          },
          {
            "id": "ed_t3",
            "quote": "Do primeiro atendimento à entrega da caixa em linho, tudo transmite segurança e sofisticação. Valeu cada centavo investido.",
            "author": "Victória & Arthur",
            "service": "Série Autoral"
          }
        ]
      }
    },
    {
      "id": "std_closing",
      "type": "CTABlock",
      "props": {
        "variant": "classic",
        "background": "dark",
        "align": "center"
      },
      "content": {
        "eyebrow": "Reserva de Data",
        "cta_text": "Vamos reservar a sua data?",
        "body": "Realizamos um número restrito de coberturas por mês para manter nosso padrão artesanal de direção e edição. Entre em contato para confirmar sua reserva.",
        "btnText": "Solicitar reserva pelo WhatsApp",
        "phone": "",
        "links": []
      }
    },
    {
      "id": "std_footer",
      "type": "FooterTerms",
      "props": {
        "background": "dark"
      },
      "content": {
        "terms": "Orçamento válido por 10 dias. A data somente é bloqueada na agenda após assinatura do contrato e confirmação do sinal.",
        "copyright": "© 2026 Nome do Estúdio"
      }
    }
  ]'::jsonb,
  '{
    "colors": {
      "cream": "#232019",
      "linen": "#3A342A",
      "stone": "#8C7B6E",
      "taupe": "#A89B8C",
      "accent": "#C9A227",
      "ink": "#141210",
      "white": "#F5F2EC"
    },
    "typography": {
      "display": "Cormorant Garamond",
      "body": "Jost",
      "script": "Mrs Saint Delafield"
    },
    "shape": "sharp"
  }'::jsonb,
  true
),
(
  'proposta-modelo-clean',
  'Clean Minimal',
  'Estética de galeria Fine Art: capa em díptico com duas fotos, respiro generoso, pacotes minimalistas, guia objetivo de preparação e FAQ interativo.',
  ARRAY['clean', 'minimal', 'retratos', 'corporativo'],
  '',
  NULL,
  '[
    {
      "id": "std_cover",
      "type": "CoverBlock",
      "props": {
        "variant": "editorial-diptych",
        "background": "cream",
        "align": "left"
      },
      "content": {
        "eyebrow": "Fotografia Autoral",
        "title": "A beleza",
        "title_italic": "do essencial",
        "subtitle": "Composição limpa, luz precisa e direção contemporânea para retratos e ensaios que comunicam autenticidade.",
        "photographer_name": "Nome do Estúdio",
        "btnText": "Ver investimento",
        "btnLink": "",
        "image_url": "",
        "photo_b": ""
      }
    },
    {
      "id": "std_intro",
      "type": "EditorialBlock",
      "props": {
        "variant": "text-only",
        "background": "white",
        "align": "center",
        "photo_a": { "width_pct": 72, "height_pct": 80, "image_ref": null },
        "photo_b": { "width_pct": 62, "height_pct": 66, "image_ref": null }
      },
      "content": {
        "eyebrow": "Conceito Visual",
        "title": "Menos excesso,",
        "title_italic": "mais verdade.",
        "vertical_label": "Nome do Estúdio",
        "body": "Acreditamos na força da simplicidade. Quando retiramos as distrações do cenário, o que emerge é a presença, o gesto sutil e a identidade real de cada pessoa fotografada.",
        "details": [
          { "id": "cm_d1", "label": "Estética", "value": "Minimalista & Atemporal" },
          { "id": "cm_d2", "label": "Formato", "value": "Estúdio ou Locação Arquitetônica" },
          { "id": "cm_d3", "label": "Entrega", "value": "Galeria Online em Alta Definição" }
        ]
      }
    },
    {
      "id": "std_gallery",
      "type": "Gallery",
      "props": {
        "layout": "editorial-rows",
        "background": "white",
        "align": "center"
      },
      "content": {
        "eyebrow": "Portfólio",
        "title": "Recortes Recentes",
        "caption": "Equilíbrio, forma e naturalidade em cada enquadramento.",
        "images": [
          { "id": "cm_g1", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "cm_g2", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "cm_g3", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "cm_g4", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "cm_g5", "image_ref": "", "span": "normal", "ratio": "auto" },
          { "id": "cm_g6", "image_ref": "", "span": "normal", "ratio": "auto" }
        ]
      }
    },
    {
      "id": "std_pricing",
      "type": "PricingTable",
      "props": {
        "variant": "cards-minimal",
        "background": "cream",
        "align": "center"
      },
      "content": {
        "eyebrow": "Investimento",
        "title": "Planos de Sessão",
        "subtitle": "Formatos transparentes e objetivos para a sua necessidade.",
        "packages": [
          {
            "id": "cm_p1",
            "name": "Essencial",
            "badge": "",
            "price": "R$ 690",
            "price_unit": "sessão",
            "image_ref": "",
            "features": [
              "1 hora de sessão dirigida",
              "12 retratos finalizados em alta resolução",
              "Até 2 produções de figurino",
              "Galeria online para seleção",
              "Entrega final em até 7 dias úteis"
            ]
          },
          {
            "id": "cm_p2",
            "name": "Atelier",
            "badge": "Recomendado",
            "price": "R$ 1.190",
            "price_unit": "sessão",
            "image_ref": "",
            "features": [
              "2 horas de sessão com direção completa",
              "25 retratos finalizados em alta resolução",
              "Até 4 produções de figurino",
              "Alinhamento de imagem e paleta pré-sessão",
              "Galeria online privativa",
              "Entrega prioritária em até 5 dias úteis"
            ]
          },
          {
            "id": "cm_p3",
            "name": "Assinatura",
            "badge": "",
            "price": "R$ 1.890",
            "price_unit": "sessão",
            "image_ref": "",
            "features": [
              "Meia diária (até 4 horas de produção)",
              "45 fotografias tratadas em alta resolução",
              "Trocas de looks livres dentro do período",
              "Estúdio + externa ou dois ambientes",
              "Entrega expressa em até 72 horas úteis"
            ]
          }
        ]
      }
    },
    {
      "id": "std_looks",
      "type": "InfoBlock",
      "props": {
        "variant": "columns",
        "background": "white",
        "align": "left"
      },
      "content": {
        "eyebrow": "Guia de Preparação",
        "title": "Orientações para um visual limpo",
        "image_url": "",
        "items": [
          {
            "id": "cm_l1",
            "title": "Paleta neutra e atemporal",
            "body": "Preto, branco, cinza, areia, marinho e tons terrosos garantem sofisticação imediata e valorizam a expressão do rosto."
          },
          {
            "id": "cm_l2",
            "title": "Caimento e passadoria",
            "body": "Traga as peças em cabides para evitar marcas de dobra. Roupas com bom corte de ombro e cintura fazem toda a diferença na câmera."
          },
          {
            "id": "cm_l3",
            "title": "Acessórios minimalistas",
            "body": "Joias discretas, relógios clássicos e óculos sem reflexo excessivo complementam os retratos com elegância sem datar a foto."
          },
          {
            "id": "cm_l4",
            "title": "Descanso e hidratação",
            "body": "Nos dias anteriores à sessão, priorize boas horas de sono e hidratação para que a pele e o olhar estejam descansados."
          }
        ]
      }
    },
    {
      "id": "std_info",
      "type": "InfoBlock",
      "props": {
        "variant": "stacked",
        "background": "cream",
        "align": "left"
      },
      "content": {
        "eyebrow": "Fluxo de Trabalho",
        "title": "Do agendamento à entrega final",
        "image_url": "",
        "items": [
          {
            "id": "cm_i1",
            "title": "Agendamento e sinal",
            "body": "Escolha do horário ideal na agenda mediante confirmação de 30% do valor do plano selecionado."
          },
          {
            "id": "cm_i2",
            "title": "Briefing objetivo",
            "body": "Alinhamos o objetivo das imagens (posicionamento profissional, retrato autoral ou ensaio pessoal) e definimos as combinações de roupas."
          },
          {
            "id": "cm_i3",
            "title": "Sessão dirigida",
            "body": "Durante o ensaio, acompanhamos os resultados em tempo real para ajustar postura, ângulos e iluminação com precisão."
          },
          {
            "id": "cm_i4",
            "title": "Seleção e tratamento",
            "body": "Você escolhe suas imagens preferidas através da galeria online exclusiva e recebe os arquivos finais prontos para impressão e digital."
          }
        ]
      }
    },
    {
      "id": "std_faq",
      "type": "InfoBlock",
      "props": {
        "variant": "accordion",
        "background": "white",
        "align": "left"
      },
      "content": {
        "eyebrow": "Dúvidas Frequentes",
        "title": "Informações práticas",
        "image_url": "",
        "items": [
          {
            "id": "cm_q1",
            "title": "Como posso realizar o pagamento?",
            "body": "Aceitamos Pix, transferência bancária e cartão de crédito em até 6x. O sinal de 30% reserva a data e o restante é acertado no dia da sessão."
          },
          {
            "id": "cm_q2",
            "title": "Posso escolher quais fotos serão editadas?",
            "body": "Sim. Você receberá uma galeria online de provas com todas as boas imagens da sessão para selecionar tranquilamente as suas favoritas."
          },
          {
            "id": "cm_q3",
            "title": "Qual o valor da foto extra caso eu queira mais imagens?",
            "body": "Você pode adquirir fotos adicionais diretamente na galeria de seleção pelo valor unitário de R$ 40,00 já com tratamento completo."
          },
          {
            "id": "cm_q4",
            "title": "Maquiagem e cabelo estão inclusos?",
            "body": "Indicamos profissionais parceiros de extrema confiança que podem atender no próprio estúdio antes do início das fotos."
          },
          {
            "id": "cm_q5",
            "title": "Qual a antecedência necessária para remarcar?",
            "body": "Solicitamos aviso com no mínimo 72 horas de antecedência para reagendamento sem custos."
          }
        ]
      }
    },
    {
      "id": "std_testimonials",
      "type": "TestimonialBlock",
      "props": {
        "variant": "columns",
        "background": "cream",
        "align": "center"
      },
      "content": {
        "eyebrow": "Depoimentos",
        "title": "Quem já fotografou conosco",
        "items": [
          {
            "id": "cm_t1",
            "quote": "Precisava de retratos que transmitissem autoridade sem perder a leveza. A direção foi cirúrgica e o resultado elevou toda a minha comunicação.",
            "author": "Henrique Bastos",
            "service": "Plano Atelier"
          },
          {
            "id": "cm_t2",
            "quote": "Estética limpa, organização impecável e entrega antes do prazo. A galeria de seleção é super prática de usar.",
            "author": "Juliana Nogueira",
            "service": "Plano Assinatura"
          },
          {
            "id": "cm_t3",
            "quote": "O cuidado com os detalhes de luz e postura fez toda a diferença. São as melhores fotos que já fiz.",
            "author": "Camila Ferraz",
            "service": "Plano Essencial"
          }
        ]
      }
    },
    {
      "id": "std_closing",
      "type": "CTABlock",
      "props": {
        "variant": "classic",
        "background": "white",
        "align": "center"
      },
      "content": {
        "eyebrow": "Agendamento",
        "cta_text": "Pronto para agendar sua sessão?",
        "body": "Clique no botão abaixo para escolhermos o melhor dia e horário para o seu ensaio.",
        "btnText": "Agendar pelo WhatsApp",
        "phone": "",
        "links": []
      }
    },
    {
      "id": "std_footer",
      "type": "FooterTerms",
      "props": {
        "background": "white"
      },
      "content": {
        "terms": "Proposta válida por 7 dias. Reserva confirmada mediante pagamento de 30% de sinal.",
        "copyright": "© 2026 Nome do Estúdio"
      }
    }
  ]'::jsonb,
  '{
    "colors": {
      "cream": "#F6F6F4",
      "linen": "#ECECE9",
      "stone": "#BDBDB8",
      "taupe": "#6B6B66",
      "accent": "#1F1F1D",
      "ink": "#111111",
      "white": "#FFFFFF"
    },
    "typography": {
      "display": "DM Serif Display",
      "body": "Inter",
      "script": "Pinyon Script"
    },
    "shape": "sharp"
  }'::jsonb,
  true
),
(
  'revista-editorial',
  'Revista Editorial',
  'Diagramação de revista em tons de areia e chocolate: capa pôster horizonte, retrato em arco, pacotes numerados 01 02 03, guia do ensaio e FAQ.',
  ARRAY['editorial', 'revista', 'casal', 'ensaio'],
  '',
  NULL,
  '[
    {
      "id": "std_cover",
      "type": "CoverBlock",
      "props": {
        "variant": "poster-sky",
        "background": "white",
        "align": "center"
      },
      "content": {
        "eyebrow": "Ensaio & Narrativa Visual",
        "title": "Entre nós",
        "title_italic": "",
        "subtitle": "Fotografias naturais e atemporais para guardar o que vocês vivem agora",
        "photographer_name": "Nome do Estúdio",
        "btnText": "Ver proposta",
        "btnLink": "",
        "image_url": "",
        "photo_b": ""
      }
    },
    {
      "id": "std_intro",
      "type": "EditorialBlock",
      "props": {
        "variant": "arch-portrait",
        "background": "white",
        "align": "justify",
        "photo_a": { "width_pct": 72, "height_pct": 80, "image_ref": null },
        "photo_b": { "width_pct": 62, "height_pct": 66, "image_ref": null }
      },
      "content": {
        "eyebrow": "Sobre a Experiência",
        "title": "Mais que poses, presença",
        "title_italic": "",
        "vertical_label": "Nome do Estúdio",
        "body": "Acredito que toda história merece ser contada com verdade, leveza e estética. Minha fotografia nasce dos encontros reais: do olhar que diz tudo em silêncio, do toque espontâneo e da beleza que existe quando vocês estão simplesmente juntos.\n\nCada sessão é conduzida como um passeio tranquilo, sem rigidez, para que as imagens reflitam fielmente a essência de vocês.",
        "aside": "Toda história começa\ncom uma memória.\n\nNão fotografo apenas\no que vejo, mas o que\nvocês sentem.",
        "details": []
      }
    },
    {
      "id": "std_gallery",
      "type": "Gallery",
      "props": {
        "layout": "grid",
        "ratio": "4/5",
        "background": "cream",
        "align": "center"
      },
      "content": {
        "eyebrow": "Editorial",
        "title": "Memórias em Movimento",
        "caption": "Luz natural, movimento e conexão genuína.",
        "images": [
          { "id": "rv_g1", "image_ref": "", "span": "tall_2rows", "ratio": "4/5" },
          { "id": "rv_g2", "image_ref": "", "span": "normal", "ratio": "4/5" },
          { "id": "rv_g3", "image_ref": "", "span": "normal", "ratio": "4/5" },
          { "id": "rv_g4", "image_ref": "", "span": "wide_2cols", "ratio": "4/5" },
          { "id": "rv_g5", "image_ref": "", "span": "normal", "ratio": "4/5" },
          { "id": "rv_g6", "image_ref": "", "span": "normal", "ratio": "4/5" }
        ]
      }
    },
    {
      "id": "std_pricing",
      "type": "PricingTable",
      "props": {
        "variant": "magazine",
        "background": "white",
        "align": "center",
        "eyebrow_rules": true
      },
      "content": {
        "eyebrow": "Pacotes",
        "title": "Investimento",
        "subtitle": "Escolha o formato ideal para a sessão de vocês",
        "groups": [
          {
            "key": "grp_estudio",
            "eyebrow": "Pacotes",
            "title": "Estúdio",
            "subtitle": "Luz intimista, privacidade e estética minimalista"
          },
          {
            "key": "grp_externo",
            "eyebrow": "Pacotes",
            "title": "Estúdio ou Externo",
            "subtitle": "Ao ar livre na luz dourada do fim de tarde ou em locação especial",
            "new_page": false
          }
        ],
        "packages": [
          {
            "id": "rv_p1",
            "group_id": "grp_estudio",
            "name": "Sessão Breve",
            "badge": "",
            "price": "R$ 590,00",
            "price_cash": "R$ 590,00",
            "price_installments": "3x de R$ 208,00",
            "image_ref": "",
            "features": [
              "1 look, até 50m de sessão.",
              "10 fotos entregues em alta resolução.",
              "Galeria online para seleção.",
              "Foto extra R$ 35,00"
            ]
          },
          {
            "id": "rv_p2",
            "group_id": "grp_estudio",
            "name": "Sessão Intimista",
            "badge": "Mais escolhido",
            "price": "R$ 890,00",
            "price_cash": "R$ 890,00",
            "price_installments": "6x de R$ 162,00",
            "image_ref": "",
            "features": [
              "Até 2 looks. 1h30 de sessão.",
              "20 fotos entregues em arquivo digital e impressas 15x21.",
              "Consultoria de estilo e paleta de cores.",
              "Foto extra R$ 30,00"
            ]
          },
          {
            "id": "rv_p3",
            "group_id": "grp_externo",
            "name": "Experiência Completa",
            "badge": "",
            "price": "R$ 1.390,00",
            "price_cash": "R$ 1.390,00",
            "price_installments": "6x de R$ 249,00",
            "image_ref": "",
            "features": [
              "Até 3 looks. 2h de ensaio sem pressa.",
              "35 fotos entregues em arquivo digital em alta resolução.",
              "1× Álbum 20x20cm artesanal em linho.",
              "Direção leve em locação externa ou estúdio.",
              " Entrega em galeria online exclusiva.",
              "Foto extra R$ 25,00"
            ]
          }
        ]
      }
    },
    {
      "id": "std_looks",
      "type": "InfoBlock",
      "props": {
        "variant": "stacked",
        "background": "cream",
        "align": "left"
      },
      "content": {
        "eyebrow": "Guia do Ensaio",
        "title": "Dicas de looks e preparação",
        "image_url": "",
        "items": [
          {
            "id": "rv_l1",
            "title": "O que vestir",
            "body": "Prefira roupas confortáveis, em tons neutros e terrosos (areia, linho, off-white, caramelo, marrom, verde-musgo ou preto). Tecidos naturais trazem textura e movimento incrível às fotos."
          },
          {
            "id": "rv_l2",
            "title": "Sintonia entre os looks",
            "body": "Busque harmonia entre as peças sem precisar usar roupas idênticas. Evite estampas chamativas, listras finas ou logotipos grandes que desviem o olhar da conexão de vocês."
          },
          {
            "id": "rv_l3",
            "title": "Maquiagem e cabelo",
            "body": "Uma beleza leve, que valorize seus traços reais, funciona muito melhor na luz natural do que produções pesadas. O objetivo é que você se reconheça em cada retrato."
          },
          {
            "id": "rv_l4",
            "title": "Trilha sonora e clima",
            "body": "Durante a sessão, colocamos a playlist que vocês mais gostam para deixar o clima descontraído. Vocês não precisam saber posar: eu conduzo tudo com leveza."
          }
        ]
      }
    },
    {
      "id": "std_info",
      "type": "InfoBlock",
      "props": {
        "variant": "columns",
        "background": "white",
        "align": "left"
      },
      "content": {
        "eyebrow": "Informações Práticas",
        "title": "Como funciona a reserva e entrega",
        "image_url": "",
        "items": [
          {
            "id": "rv_i1",
            "title": "Reserva de data",
            "body": "Para reservar sua data na agenda, solicitamos o sinal de 30% do pacote escolhido, e o valor restante pode ser acertado até o dia da sessão."
          },
          {
            "id": "rv_i2",
            "title": "Locação e horário",
            "body": "Para ensaios externos, fotografamos sempre no início da manhã ou nas últimas duas horas da tarde para aproveitar a luz dourada mais bonita."
          },
          {
            "id": "rv_i3",
            "title": "Galeria de seleção",
            "body": "Em até 5 dias úteis após o ensaio, vocês recebem o acesso à galeria privada para escolher com calma as suas fotografias favoritas."
          },
          {
            "id": "rv_i4",
            "title": "Prazo de entrega final",
            "body": "Após a escolha na galeria, as fotos tratadas em alta resolução são entregues em até 12 dias úteis prontas para download e impressão."
          }
        ]
      }
    },
    {
      "id": "std_faq",
      "type": "InfoBlock",
      "props": {
        "variant": "accordion",
        "background": "cream",
        "align": "left"
      },
      "content": {
        "eyebrow": "Dúvidas Frequentes",
        "title": "Tudo o que você precisa saber",
        "image_url": "",
        "items": [
          {
            "id": "rv_q1",
            "title": "Como é feito o pagamento?",
            "body": "O pagamento pode ser realizado via Pix (30% na reserva + 70% no dia do ensaio) ou parcelado no cartão de crédito conforme as condições descritas em cada pacote."
          },
          {
            "id": "rv_q2",
            "title": "E se o tempo fechar ou chover no dia?",
            "body": "Acompanhamos a previsão do tempo nos dias anteriores. Caso chova em um ensaio externo, transferimos para uma nova data sem nenhum custo de remarcação."
          },
          {
            "id": "rv_q3",
            "title": "Somos tímidos diante da câmera. Vai dar certo?",
            "body": "Sim! 90% dos casais e clientes que fotografo dizem exatamente isso antes de começar. Minha direção é baseada em movimento e conversa, sem poses engessadas."
          },
          {
            "id": "rv_q4",
            "title": "Podemos escolher fotos adicionais depois?",
            "body": "Claro. Na própria galeria online de seleção vocês podem adicionar quantas fotos extras desejarem com apenas um clique."
          },
          {
            "id": "rv_q5",
            "title": "Qual é a validade desta proposta?",
            "body": "Os valores e condições apresentados nesta proposta são válidos por 10 dias corridos. A data só fica bloqueada após confirmação da reserva."
          }
        ]
      }
    },
    {
      "id": "std_testimonials",
      "type": "TestimonialBlock",
      "props": {
        "variant": "carousel",
        "background": "white",
        "align": "center"
      },
      "content": {
        "eyebrow": "Histórias Reais",
        "title": "O que dizem sobre o ensaio",
        "items": [
          {
            "id": "rv_t1",
            "quote": "Foi uma tarde deliciosa! Esquecemos completamente que estávamos sendo fotografados e as imagens ficaram dignas de capa de revista.",
            "author": "Amanda & Pedro",
            "service": "Experiência Completa"
          },
          {
            "id": "rv_t2",
            "quote": "O guia de looks salvou a nossa preparação e a luz das fotos ficou surreal. É uma lembrança que vamos guardar para o resto da vida.",
            "author": "Larissa & Rodrigo",
            "service": "Sessão Intimista"
          },
          {
            "id": "rv_t3",
            "quote": "Sensibilidade única do início ao fim. Quando abrimos a galeria online não conseguimos escolher só as do pacote de tão perfeitas!",
            "author": "Bianca & Matheus",
            "service": "Ensaio Externo"
          }
        ]
      }
    },
    {
      "id": "std_closing",
      "type": "CTABlock",
      "props": {
        "variant": "classic",
        "background": "cream",
        "align": "center"
      },
      "content": {
        "eyebrow": "Vamos conversar?",
        "cta_text": "Será um prazer contar a história de vocês.",
        "body": "Toque no botão abaixo para me chamar no WhatsApp, tirar qualquer dúvida e escolhermos juntos a melhor data para a sessão.",
        "btnText": "Reservar minha data no WhatsApp",
        "phone": "",
        "links": []
      }
    },
    {
      "id": "std_footer",
      "type": "FooterTerms",
      "props": {
        "background": "cream"
      },
      "content": {
        "terms": "Proposta válida por 10 dias. A reserva da data é confirmada mediante pagamento de 30% de entrada e assinatura do contrato.",
        "copyright": "© 2026 Nome do Estúdio"
      }
    }
  ]'::jsonb,
  '{
    "colors": {
      "cream": "#F6EFE7",
      "linen": "#EDE3D8",
      "stone": "#D0C8BC",
      "taupe": "#9B6338",
      "accent": "#6D3C1B",
      "ink": "#251910",
      "white": "#FFFDFB"
    },
    "typography": {
      "display": "Italiana",
      "body": "Jost",
      "accent": "Cormorant Garamond",
      "highlight": "Cormorant Garamond",
      "script": "Great Vibes",
      "title_case": "upper"
    },
    "shape": "sharp"
  }'::jsonb,
  true
)
ON CONFLICT (template_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  preview_html_path = EXCLUDED.preview_html_path,
  thumbnail_url = EXCLUDED.thumbnail_url,
  blocks_json = EXCLUDED.blocks_json,
  design_tokens = EXCLUDED.design_tokens,
  is_active = EXCLUDED.is_active;
