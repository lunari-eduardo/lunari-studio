# Construtor de Propostas — Site Modular (guia mestre)

> Substitui a "Fase 2 — Orientação explícita" de `proposal_refactor_plan.md`: orientação
> (retrato/paisagem) foi expurgada da UI, do renderer e do banco
> (`20261009000001_remove_orientation_from_proposals.sql`). O restante daquele plano
> (sanitização, PDF tracking, IA verificável, CRM protegido) continua válido.

## 1. Dois produtos, um pipeline de distribuição

| Caminho | Origem | Renderização | Edição |
|---|---|---|---|
| **Modelo** (landing page) | `proposal_templates.blocks_json` → `instantiateTemplateBlocks(blocks, vars)` | `VisualRenderer` | conteúdo inline + painel; layout já resolvido pelo modelo |
| **PDF estático** | upload R2 (`proposals-pdf`) | `NativePdfViewer` | só troca de arquivo |

Os dois compartilham link público, mensagem de abertura, CTA de WhatsApp e tracking
(`material_shares`). Wizard: **Método → (Modelo + Categoria) | (PDF + Categoria)**.

## 2. Modelos alimentados por variáveis (`blocks/normalization.ts`)

`instantiateTemplateBlocks(rawBlocks, vars: TemplateVars)` roda em **toda** criação de
proposta por blocos (modelo do banco ou `DEFAULT_TEMPLATE`):

- IDs novos (bloco e itens de lista) e deep clone → instâncias nunca compartilham estado.
- Dados do autor do modelo são limpos: `btnLink` wa.me, `CTABlock.phone/links`,
  **`TestimonialBlock.items` (depoimentos do modelo nunca chegam ao cliente como reais)**.
- Variáveis do fotógrafo:
  - `photographerName` (perfil `empresa || nome`) → capa, assinatura vertical, rótulo lateral, `© ano` do rodapé.
  - `packages` (pacotes da categoria escolhida, via `pacoteToProposalPackage`) → substituem os pacotes demo. Sem pacotes → mantém os do modelo.
- `pacoteToProposalPackage` é a única ponte Configurações → proposta (também usada em "Importar Pacotes Cadastrados"). Preço é **texto de vitrine** (`formatCurrency`), nunca valor financeiro persistido.

Seeds antigos: `variant` na raiz é mapeada (`gradient_parallax` → `hero-full`,
`row_list_with_photo` → `numbered-editorial`); `ContactBlock` vira `CTABlock`.

Para uma nova variável (ex.: nome do cliente, validade): adicionar o campo em
`TemplateVars`, preencher no `useCreateMaterialWizard` e consumir no `switch` do hidratador.
Cobrir em `scripts/test_template_instantiation.ts` (`npm run test:proposals`).

## 3. Fundação do documento (`VisualRenderer`)

- Raiz `.pa-doc @container`: `w-full h-auto`, `md:max-w-5xl md:rounded-2xl` com sombra suave.
  **Não usar `max-w-4xl`**: com a borda de 1px a content-box ficava < 56rem e os layouts
  `@4xl:` nunca disparavam. O zoom do editor usa a mesma largura (64rem).
- Wrappers de seção: `relative w-full h-auto`, sem `overflow-hidden`, sem altura.
- `--pa-hero-h`: `100svh` (público/editor desktop) ou `788px` (moldura do celular).
  A capa é a **única** altura ancorada: `HERO_MIN_H` em cada `<section>` de capa.
- Respiro de rolagem (`8rem + safe-area`) fica **fora** da arte (no wrapper externo).
- `index.css`:
  - `.pa-doc` → fonte de corpo do tema, `overflow-wrap: anywhere` (nada estoura no celular),
    `text-wrap: balance` em títulos e `pretty` em parágrafos.
  - `@layer components` → títulos herdam a cor da seção (o base do app pinta h1–h6).
  - `.pa-pkg-grid` → pacotes 1→2→3 colunas por container, última linha centralizada,
    1 pacote = 28rem, 2 pacotes = meia largura.
  - `.pa-justified` → galeria em linhas justificadas sem JS.

## 4. Regras para blocos (novos ou refatorados)

1. Responsividade por **container query** (`@md`, `@2xl`, `@4xl`), nunca por viewport nem por flag de orientação. Estreito = coluna; `@2xl+` = composição lateral.
2. Altura sempre orgânica (`h-auto`); só capas usam `HERO_MIN_H`.
3. Cores via tokens: fundo com `sectionBg`, texto com `textColorClass` (automático = maior contraste calculado por `onColor` → `--pa-on-*`). Cartões são superfície "white" com `text-[var(--pa-on-white)]`.
4. Cantos via `rounded-[var(--pa-r-btn|card|media,<valor original>)]`: sem `shape` no tema, cada bloco mantém o desenho original.
5. Títulos display muito grandes/caixa alta: `text-[length:clamp(min,Ncqi,max)]`. Tamanhos do popover passam por `fluidPx` (teto fluido).
6. Público: listas vazias somem (galeria sem fotos, depoimentos vazios, rodapé vazio); no editor mostram o placeholder.
7. Links digitados pelo fotógrafo: só `https:`, `mailto:`, `tel:` viram `href`.
8. Novo tipo de bloco = entrada no `BLOCK_REGISTRY` + renderer + `case` no `VisualRenderer` (+ sanitização no hidratador se carregar dados do autor).

## 5. Temas de layout (Fase 4)

`DESIGN_PRESETS` (`useProposalAI.ts`) = paleta + par tipográfico + `shape`
(`sharp | soft | round` → `--pa-r-btn/card/media`). Um tema nunca dita proporção.

## 6. Status

| Fase | Status |
|---|---|
| 0. Expurgo da orientação (UI, renderer, hooks, wizard, banco) | ✅ |
| 1. Pacotes em grade fluida (`.pa-pkg-grid`), cartões legíveis em qualquer tema | ✅ |
| 2. Galeria: masonry, grade com spans (`grid-flow-dense`) e linhas justificadas | ✅ |
| 3. Tipografia fluida (`cqi`/`clamp`, `fluidPx`, `overflow-wrap`) e capas por container | ✅ |
| 4. Temas de layout (fontes + cantos) e contraste automático | ✅ |
| Blocos de fechamento: Depoimentos, Chamada Final, Rodapé e Condições | ✅ |
| Editorial "Entre Nós" (ver seção 7) | ✅ |

## 7. Editorial "Entre Nós" (referência: PDF "Sessão casal")

- **Fontes**: `PROPOSAL_FONTS` (`blocks/design.ts`) é a fonte única do loader e dos selects;
  cada família pede só os eixos que existe (`googleFontUrl`). Playfair não é carregada pelo
  `index.html` (só Inter/Manrope).
- **Tema**: `typography.accent` (`--pa-font-accent`, helper `fa()`; ausente = fonte de títulos)
  e `typography.title_case: 'upper'` (`data-title-case` na raiz → `h2` em caixa-alta).
  `--pa-accent-on-white` = acento com contraste ≥ 3:1 sobre o cartão, senão a tinta.
  Preset "Areia Editorial".
- **Campo vazio não deixa buraco**: `EditableText` público e vazio → `null`.
- **Paridade**: o público roda `normalizePublicBlocks` (mesma normalização do editor; tipos
  desconhecidos são descartados em vez de virar JSON em texto).
- **Pacotes "Revista"** (`PricingTable` `magazine`): regras puras em `blocks/pricing.ts`
  (`displayPrice`/`priceEditPath` em todas as variantes, `featureIcon` por palavra-chave,
  `computePackageNumberOffsets` para numerar continuamente entre grupos).
- **Composições**: capa `poster-sky`, `EditorialBlock` `arch-portrait` (+ campo `aside`),
  bloco `InfoBlock` (`stacked` | `accordion` | `columns`).
- **Hidratador**: fotos do modelo ficam só na vitrine (`thumbnail_url`); pacotes reais entram
  apenas no 1º bloco de preços (grupos extras do modelo saem para não duplicar).
- **Densidade**: cada composição nova funciona nos estados Narrativo (texto longo) e Essencial
  (frases curtas); seeds `entre-nos-narrativo` e `entre-nos-essencial`.

Próximos passos sugeridos: `InfoBlock` na geração por IA, tracking de páginas do PDF
(`NativePdfViewer`), variáveis do cliente (`{{cliente.nome}}`, validade), aceite do pacote
gravado no CRM e exportação da proposta web em PDF (A4).
