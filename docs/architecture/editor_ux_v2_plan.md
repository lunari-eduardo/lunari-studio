# Editor de Propostas — Plano de evolução UX/UI (v2)

## Contexto

O editor de propostas por blocos (`EditorPropostaPage` → `EditorSidebar` | `VisualRenderer` | `PropertiesSidebar`)
funciona, mas tem cara de sistema antigo: o fotógrafo precisa **procurar** cada ajuste. Pedidos do usuário:

1. Trocar o modelo dentro do editor sem perder o que já foi preenchido.
2. Reorganizar ajustes visuais e textos (listas colapsáveis em modo solitário); cor de fundo hoje "escondida".
3. "Adicionar Seção" abre lista para fora da tela sem rolagem.
4. Carrossel para depoimentos.
5. Ao trocar celular → desktop, textos das seções somem.
6. Portfólio: enviar várias fotos de uma vez, sem um card de edição por foto na lateral; opções de
   proporção/tamanho ao clicar na foto no preview (hoje não funcionam).

Decisões já confirmadas com o usuário:
- **Trocar modelo** = estrutura + layouts + tema; conteúdo migra por tipo; seções sem par são preservadas.
- **Fundo** = amostras da paleta do tema + cor livre (hex), texto segue automático por contraste.
- **Inspector** = sem abas; acordeão solitário por grupos; tipografia/tema migram para o painel esquerdo.
- **Carrossel** = manual (setas + pontos + swipe), sem autoplay, scroll-snap nativo (sem dependência nova).

---

## Diagnóstico (visão de arquitetura UX)

O problema central não é estético, é **arquitetura de informação**:

| Sintoma | Causa |
|---|---|
| "Preciso procurar tudo" | Campos são distribuídos em abas por *tipo de dado* (`isVisualField`/`isActionField`, `PropertiesSidebar.tsx:64-82`), não por *intenção*. Fundo fica na aba Visual, abaixo de 7 cards de composição e campos de imagem. |
| Global misturado com local | "Tipografia da Proposta" (global) mora no inspector da seção; "Temas de layout" (global) mora no meio da lista de seções. |
| Listas longas | `ListField` (`FieldEditor.tsx:335-419`) renderiza todos os itens sempre abertos; cada item com seus botões "IA". |
| Ruído | Botão "✨ IA" em todo campo e em todo subcampo de lista. |
| Canvas passivo | Clicar numa seção só a seleciona; estilo (layout/fundo) só pelo painel. |
| Campos invisíveis | `layoutFields` que não são "visuais" nem "ações" nunca aparecem: `numbering`, `eyebrow_rules`, `hide_feature_icons` da Tabela de Preços (`registryDefinitions.ts:238-249`). |

### Bugs de causa raiz confirmados no código

| # | Bug | Causa | Correção |
|---|---|---|---|
| B1 | Textos somem ao ir de celular → desktop | `EditableText.tsx:54-58`: o efeito que escreve o texto imperativamente depende de `[text, editing]`, não de `editable`. No celular `inlineEditing=false` (`EditorPropostaPage.tsx:62`) e o texto é *children* React; ao virar desktop o mesmo nó é reaproveitado, React limpa o filho e o efeito não roda. | Deps `[text, editing, editable]`. |
| B2 | **Tema perdido ao recarregar o editor** (e apagado no próximo autosave → público também perde) | `useMaterialEditor.ts:207-212` procura `global_settings` **depois** de `normalizeBlocks`, que o descarta (`normalization.ts:201`). | Extrair `global_settings` do `version.content` cru antes de normalizar. |
| B3 | "Adicionar Seção" fora da tela | `DropdownMenuContent` (`ui/dropdown-menu.tsx:66`) com `overflow-hidden` e sem `max-height`; 10 itens de 2 linhas viram para cima. | Substituído pela Biblioteca de Seções (Fase 3). Hotfix imediato: `max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto`. |
| B4 | Tamanho/proporção do portfólio não funcionam | Só são lidos em `layout==='grid'` (`GalleryAndMiscBlocks.tsx:109-137`); padrão é `masonry`. No grid, span descarta `aspectRatio` e vira faixa `min-h-[10rem]`; `'auto'` vira `4/5` silenciosamente. Controles ficam na aba Conteúdo, layout na aba Visual. | Fase 4. |
| B5 | Sincronização de capa lê `image_ref?.url` | `EditorPropostaPage.tsx:141,145` — `image_ref` é string. | Ler a string. |
| B6 | Popover flutuante desalinha com zoom | `TextSizeFloatingPopover` usa `position:fixed` dentro do wrapper com `zoom: autoScale` (`EditorPropostaPage.tsx:473`). | `createPortal(…, document.body)`; mesmo padrão para os novos popovers do canvas. |
| B7 | "Rascunho salvo" mesmo quando o salvamento falha | `persist` ignora o `error` do `update` do rascunho (`useMaterialEditor.ts:419-422`). | Checar `error` e cair no status `error` (já existe). |

---

## Princípios do novo editor

1. **Canvas primeiro** — o que se vê, se ajusta ali com 1 clique (seção, foto, texto).
2. **Esquerda = documento (global) · Direita = seção (local)**. Nada global no inspector de seção.
3. **Uma coisa aberta por vez** — acordeão solitário no inspector e nos itens de lista.
4. **Descoberta progressiva** — o essencial à vista; o que a variante atual não usa nem aparece.
5. **Silêncio** — feedback inline, zero toasts (regra do CLAUDE.md), IA aparece só no hover/foco.

### Mapa da nova interface

```
┌ Header ─ ← Título · Rascunho salvo ─────── [🖥 📱] ─── ↶ ↷  Pré-visualizar  Publicar  ⋯ ┐
├ Esquerda (Documento) ─┬─ Canvas ───────────────────────────────┬─ Direita (Seção) ──────┤
│ [Seções] [Estilo]     │  ┌ seção selecionada ───────────────┐  │ SEÇÃO 03 · Uma tarde ⋯ │
│                       │  │      [Layout ▾][Fundo ●][↑][↓][⧉][🗑]│ ▾ Textos               │
│ Modelo: Entre Nós  ⇄  │  │                                  │  │    Rótulo / Título …   │
│ 01 Capa               │  └──────────────────────────────────┘  │ ▸ Itens · 3 detalhes   │
│ 02 Portfólio          │              ( + )  ← inserir aqui     │ ▸ Fotos · com foto     │
│ …                     │  ┌ foto clicada ─────────────┐         │ ▸ Composição · Arco    │
│ [+ Adicionar seção]   │  │ [Trocar][Tamanho▾][Ajuste▾][←][→][🗑]│ ▸ Estilo · Creme      │
│                       │  └───────────────────────────┘         │ ▸ Botões e links       │
│ Estilo: Tema, Paleta, │                                        │                        │
│ Tipografia, Cantos    │                                        │                        │
└───────────────────────┴────────────────────────────────────────┴────────────────────────┘
```

---

## Status

| Fase | Status |
|---|---|
| 0. Correções de base (B1, B2, B3, B5, B6, B7) | ✅ |
| 1. Trocar modelo (`applyTemplate`, `replaceDocument`, `SwitchTemplateDialog`) | ✅ |
| 2. Inspector em acordeão (`group`/`showIf`, amostras + cor livre, `DocumentStylePanel`, `duplicateBlock`) | ✅ |
| 3. Canvas ativo (`SectionToolbar`, `InsertSectionButton`) + `SectionLibraryDialog` | ✅ |
| 4–6 | pendente |

## Ordem de execução

Fase 0 é pré-requisito de tudo (sem B2 o tema aplicado pela troca de modelo some no reload).
Fases 1, 4 e 5 são independentes entre si; a 3 depende da 2 (reaproveita os controles de Composição/Estilo na barra do canvas).
Cada fase é entregável sozinha, com `typecheck:changed` + verificação no navegador.

## Fase 0 — Correções de base (pequenas, isoladas, primeiro deploy)

- B1 `src/pages/comercial/blocks/EditableText.tsx:58` — deps com `editable`.
- B2 `src/hooks/useMaterialEditor.ts:205-213` — `const raw = Array.isArray(version.content) ? version.content : []; globalSettings = raw.find(b => b?.type==='global_settings')?.data ?? {}; blocks = normalizeBlocks(raw);`
- B3 hotfix de `max-h` + `overflow-y-auto` no `DropdownMenuContent` do `EditorSidebar.tsx:205`.
- B5 `EditorPropostaPage.tsx:141,145`.
- B6 portal no `TextSizeFloatingPopover`.
- B7 `useMaterialEditor.ts:419-422` — tratar `error` do rascunho.

Aceite: alternar celular↔desktop mantém todos os textos; recarregar o editor mantém tema/tipografia;
menu de seção rola em tela de 768px de altura.

## Fase 1 — Trocar modelo (preservando conteúdo)

**UX**
- Ponto de entrada: card "Modelo: <nome> ⇄ Trocar" no topo do painel esquerdo + item "Trocar modelo" no menu ⋯ (`EditorHeader.tsx:297-343`).
- `Dialog` com a galeria de modelos (reusa `StepTemplateGallery` + query `['proposal-templates']` de `useCreateMaterialWizard.ts:56-70`), modelo atual marcado.
- Ao escolher: painel de prévia "O que acontece" — *Mantido*: textos, fotos, pacotes, depoimentos ·
  *Novo do modelo*: seções X, Y · *Mantidas na posição*: seções sem par no modelo. Checkbox "Aplicar também o tema do modelo" (marcado).
- Confirmar aplica numa única mutação → **Ctrl+Z desfaz tudo**. Feedback inline no header: "Modelo aplicado · Desfazer" (sem toast).

**Técnico**
- Função pura `applyTemplate(current, templateBlocks) → { blocks, unmatched, added }` + helper `isEmptyValue`
  em `src/pages/comercial/blocks/normalization.ts` (~45 linhas). Entrada do modelo:
  `instantiateTemplateBlocks(blocks_json, { photographerName })` **sem `packages`** (a regra DROP do
  instanciador apagaria o 2º grupo de preços e quebraria o pareamento) e depois `normalizeBlocks`
  (seeds antigos têm `variant` na raiz).
  - Pareamento por **tipo e ordem**: cada bloco do modelo pega o próximo bloco atual ainda não usado do mesmo tipo — resolve 2 PricingTable/2 InfoBlock do "Entre Nós Narrativo".
  - `content`: começa pelo do modelo; todo valor atual **não vazio** vence (cobre chaves fora do registry, ex.: `CoverBlock.content.photo_b`).
    "Vazio" é recursivo: `null`, string em branco, array só de vazios (`['']` do stringlist), objeto cujas chaves não estruturais (`id, span, ratio, price_unit`) são vazias (slot de galeria sem foto).
  - `props`: inteiramente do modelo (variante, layout, fundo, numeração…; `typography` antigo cai naturalmente), exceto `photo_a/photo_b.image_ref` atuais, que mantêm a geometria do modelo.
  - IDs atuais preservados nos pareados (keys, dnd, seleção — `activeIndex` recalculado pelo id).
  - PricingTable do modelo sem par **é descartada** se a proposta já tem pacotes reais (preço demo nunca chega ao cliente).
  - Blocos atuais sem par: reinseridos **logo após a seção que os precedia** na proposta (ancoragem) — mantém Rodapé depois do CTA e a numeração "Revista" contínua.
  - `added` (seções novas vindas do modelo) alimenta um selo "Nova · revise" na lista de seções.
- `useMaterialEditor`: nova ação `replaceDocument(blocks, settings)` = **um** `mutate(undefined, …)` sobre `blocks` + `globalSettings` (`mutate` não é exportado; duas chamadas gerariam 2 passos de undo).
- `source_template_id` em `global_settings.data` (sem migração: `PublicProposalViewer.tsx:84-90`, `get-public-material` e `VisualRenderer.tsx:53` ignoram chaves extras):
  gravar também na criação (`useMaterials.ts:119-124`) e removê-lo no "Salvar como modelo" (`EditorPropostaPage.tsx:180`).
- Limite conhecido: um título apagado de propósito é indistinguível de vazio → recebe o texto do modelo. Aceitável (visível na prévia e desfazível).
- Testes: ~17 asserts novos em `scripts/test_template_instantiation.ts` (ordem final, pareamento repetido, texto/foto preservados, design do modelo, fotos do modelo não vazam, entrada não mutada, preço demo descartado, tipos de vazio).

## Fase 2 — Inspector em acordeão solitário (painel direito)

**UX**
- Remove abas. Cabeçalho fixo (Seção NN · nome · ⋯ com Duplicar/Remover).
- Grupos (shadcn `Accordion type="single" collapsible`), cada cabeçalho com **resumo** do estado à direita:
  1. **Textos** — aberto por padrão.
  2. **Itens** — "Detalhes · 3", "Pacotes · 4", "Depoimentos · 2"; itens colapsados com resumo (1ª linha/miniatura), um aberto por vez, arrastar para reordenar (`@dnd-kit`, já usado no `EditorSidebar`), lixeira no hover. "Importar pacotes cadastrados" mora aqui.
  3. **Fotos** — imagem principal e slots da composição.
  4. **Composição** — miniaturas de variante (compactas) + alinhamento/disposição · resumo "Arco".
  5. **Estilo** — Fundo em amostras redondas (Branco, Creme, Linho, Pedra, Taupe, Escuro) + "Personalizada" (hex); Cor do texto "Automático" + opções; toggles finos (ex.: numeração/réguas/ícones da Revista).
  6. **Botões e links**.
- Grupos vazios não aparecem. Grupo aberto é lembrado ao trocar de seção.
- Campos que a variante atual não usa **somem** (`showIf`): ex. assinatura no `minimal-center`, `details` no `arch-portrait`, toggles da Revista fora de `magazine`, rótulo do divisor `spaced`, tamanho/proporção da foto conforme o layout da galeria. O dado continua salvo.
- Botão "IA" só no grupo Textos e só em hover/foco do campo.

**Técnico** (mapeamento campo→grupo de todos os blocos validado contra o registry)
- `BlockField`/`PropImageSlot` ganham `group?: 'text'|'items'|'media'|'layout'|'style'|'actions'` e `showIf?: ({content, props}) => boolean` (`registryDefinitions.ts:29-44`).
- Sem `group`, inferência única em `PropertiesSidebar` (substitui `:64-82`): `btnText`/`url` → actions · `image` → media · `list` → items · `align`/`layout`/`style` → layout · demais `layoutFields` → style · demais `fields` → text.
  Só 2 anotações explícitas: `CTABlock.links` → actions; `cta_text` sai do set de ações (é a manchete). `btnLink` não é lido por nenhum renderer → remover do registry.
- `PropertiesSidebar.tsx`: corpo vira `GROUPS.map(...)` sobre `fields` (→ content) e `layoutFields` (→ props), reaproveitando o JSX atual de variantes (`:274-297`), slots (`:311-362`) e importação de pacotes (`:237-246`). Resolve os 3 campos hoje invisíveis da Tabela de Preços.
- `FieldEditor` recebe `ctx` para aplicar `showIf` aos subcampos de lista; `ListField` (`:335-419`) com itens em `Accordion` + `SortableContext`.
- Override do trigger do accordion (`ui/accordion.tsx:29` traz `hover:underline py-4`) via `className` local.
- Fundo: `kind:'swatch'` novo no `FieldEditor` (reaproveita o `case 'color'` existente para o hex).
  `sectionBg`/`textColorClass` (`helpers.tsx:56-86`) aceitam `#hex` → `bg-[var(--pa-sec-bg)]`/`text-[var(--pa-on-sec)]`;
  o wrapper de bloco no `VisualRenderer` define as duas variáveis com `onColor` (`design.ts:45-67`).
  `stone`/`taupe` entram nas opções + `--pa-on-stone|taupe` em `tokensToCssVars`.
- Painel esquerdo ganha aba **Estilo**: Tema (presets, hoje em `EditorSidebar.tsx:226-261`), Paleta (cores do tema editáveis), Tipografia (movida de `PropertiesSidebar.tsx:384-420`), Cantos (`shape`).
- `key={block.id}` no `PropertiesSidebar` para não vazar estado entre seções.

## Fase 3 — Canvas ativo + Biblioteca de Seções

- **Barra flutuante da seção selecionada** (topo direito da seção, portal): `Layout ▾` (popover com miniaturas), `Fundo ●` (amostras), ↑ ↓, Duplicar, Remover. É o caminho de 1 clique para fundo/layout.
- **Inserir entre seções**: "+" aparece no hover da junção entre seções → abre a biblioteca já com a posição (`addBlock(type, afterIndex)` já existe, `useMaterialEditor.ts:314`).
- **Biblioteca de Seções** (substitui o dropdown): `Dialog` com busca (`cmdk`, `ui/command.tsx`) e categorias — Abertura · Conteúdo · Portfólio · Preços · Prova social · Informações · Fechamento — cada item com mini‑wireframe e descrição. Sempre cabe na tela (rolagem interna), funciona também no Sheet mobile.
- Nova ação `duplicateBlock(index)` no `useMaterialEditor` (deep clone + ids novos).

## Fase 4 — Portfólio (Galeria)

**UX**
- Painel: grupo **Fotos** com dropzone "Arraste várias fotos ou clique" (multi) + **grade de miniaturas** reordenável (arrastar), com ✕ no hover. Fim do card por foto.
- Canvas: **clicar numa foto** abre a barra da foto: Trocar · Tamanho (Normal / Larga / Alta / Destaque 2×2) · Ajuste (Preencher / Original) · ← → · Remover. Opções aparecem só quando o layout as suporta.
- Layout da galeria (Mosaico / Grade / Linhas editoriais) fica no grupo **Composição** com descrição do que cada um permite.

**Técnico**
- Semântica clara por layout:
  - **Grade** = proporção única no bloco (novo `layoutField` `ratio`, sem "original") + tamanho por foto (Normal / Larga / Alta / **Destaque 2×2** novo `feature_2x2`).
  - **Mosaico** = proporção real por padrão; recorte opcional por foto (`aspect-ratio` + `object-cover`); sem tamanho (impossível com CSS columns).
  - **Linhas editoriais** = proporção real, sem opções por foto.
- Grade coerente: wrapper `.pa-gal { container-type: inline-size }` (o `cqi` precisa medir a galeria, não o `.pa-doc` com padding) e
  `.pa-gal-grid { grid-auto-rows: calc((100cqi - (cols-1)·gap) / cols · --pa-gal-r) }` com `--cols` 2→3→4 por `@container` (35rem/49rem = breakpoints atuais menos o padding da seção) e `data-span="wide|tall|feature"`. Fallback `12rem`. CSS em `index.css` ao lado de `.pa-justified` (`:1043`).
  Legado: proposta antiga sem `props.ratio` herda a 1ª `ratio` por foto ≠ `auto`, senão `4/5`.
- Upload múltiplo: reusar `uploadMultipleProposalImages` (`uploadImage.ts:13-17`) trocando `Promise.all` por `Promise.allSettled` (uma falha não derruba o lote) + progresso "3 de 8".
- Clique na foto: `onSelectImage(path, anchorEl)` no `InlineEditHandle` (`inlineContext.ts:4-11`), chamado por clique simples no `EditableImage`; popover irmão do `TextSizeFloatingPopover` no `VisualRenderer`.
- Galeria com 1 só foto no mosaico ocupa a largura (hoje fica meia coluna no celular).
- Pílula "Trocar foto" do `EditableImage` (`:139-146`) passa a aparecer só no hover/foto selecionada — numa galeria de 20 fotos, 20 pílulas fixas são ruído.

## Fase 5 — Depoimentos

- `TestimonialBlock` ganha `variants` (`columns` padrão = layout atual; `carousel`). `normalizeBlock` (`normalization.ts:63-65`) já preenche a variante padrão nos blocos antigos.
- Carrossel (`TestimonialCarousel`, ~40 linhas em `ClosingBlocks.tsx`): **um depoimento por vez**, citação grande e centralizada (`max-w-[40rem]`) — mais editorial e mantém os pontos corretos.
  Trilha `flex overflow-x-auto snap-x snap-mandatory scrollbar-none motion-safe:scroll-smooth`; setas circulares discretas + pontos (ativo alongado); swipe/trackpad nativos;
  `role="region" aria-roledescription="carrossel"`, slides `aria-label="1 de N"`, botões com `aria-label`. Sem autoplay. Funciona igual no público e na moldura do celular.
  Nenhuma dependência nova (o `ui/carousel.tsx` importa embla, que **não está instalado** — não usar).
- Itens no inspector já se beneficiam da Fase 2 (colapsados, reordenáveis).
- Variante "Destaque" (1 depoimento hero) fica para depois — o carrossel com 1 item já cumpre esse papel.

## Fase 6 — Polimento (opcional)

- Popover de tamanho de texto para todos os blocos (hoje só capas passam `fieldKey`).
- Edição inline também no modo celular.
- Atalhos: `Del` remove seção, `Ctrl+D` duplica, `↑/↓` navega seções.

---

## Arquivos críticos

- `src/hooks/useMaterialEditor.ts` — B2, `replaceDocument`, `duplicateBlock`.
- `src/pages/comercial/blocks/EditableText.tsx` — B1.
- `src/pages/comercial/blocks/normalization.ts` — `applyTemplate`.
- `src/pages/comercial/blocks/registryDefinitions.ts` — `group`/`showIf`, variants de depoimentos, campos da galeria.
- `src/pages/comercial/blocks/FieldEditor.tsx` — `ListField` em acordeão + dnd, `swatch`.
- `src/pages/comercial/components/editor/PropertiesSidebar.tsx` — reescrita do corpo em grupos.
- `src/pages/comercial/components/editor/EditorSidebar.tsx` — abas Seções/Estilo, card de modelo, biblioteca.
- `src/pages/comercial/components/editor/VisualRenderer.tsx` — barra da seção, "+" entre seções, popover de foto, vars de fundo custom.
- `src/pages/comercial/components/editor/blocks/helpers.tsx` — `sectionBg`/`textColorClass` com hex.
- `src/pages/comercial/components/editor/blocks/GalleryAndMiscBlocks.tsx`, `ClosingBlocks.tsx`.
- `src/pages/comercial/blocks/EditableImage.tsx`, `uploadImage.ts`, `inlineContext.ts`.
- Novos (mínimo): `components/editor/SectionLibraryDialog.tsx`, `components/editor/SwitchTemplateDialog.tsx`, `components/editor/CanvasToolbars.tsx`.

## Fora do escopo (anotado)

- Analytics de seções provavelmente vazio: o viewer envia `{blockId, blockType}` (`PublicProposalViewer.tsx:164`) e a análise lê `block_id/block_type` (`useShareAnalysis.ts:65`). Tratar em tarefa separada.
- Âncoras DOM `section-block-${index}` mudam com reordenação (`VisualRenderer.tsx:188,200`) — só relevante se links profundos forem criados.

## Compatibilidade

- Só `material_versions.content` (jsonb) muda de forma, de modo aditivo (`props.ratio` na galeria, `variant` em depoimentos, `#hex` em `background`, `source_template_id` em `global_settings`). Nenhuma migração SQL. Lunari Gallery não lê estes blocos.
- Valores antigos continuam válidos: `background` em slot nomeado, depoimentos sem `variant` = Colunas, galeria `ratio` por item ignorado em Grade.
- `PublicProposalViewer` usa o mesmo `VisualRenderer` → paridade automática.

## Verificação

1. `npm run typecheck:changed` a cada fase (obrigatório pelo CLAUDE.md; `npm run build` não checa tipos).
2. `npm run test:proposals` — novos asserts de `applyTemplate` (pareamento por tipo/ordem, tipos repetidos, conteúdo preservado, fotos preservadas, blocos sem par preservados, props do modelo aplicadas, typography descartada).
3. Navegador (preview do dev server):
   - B1: editar → alternar 📱/🖥 várias vezes → todos os textos visíveis.
   - B2: aplicar tema → recarregar → tema mantido; abrir link público → tema mantido.
   - Trocar modelo "Entre Nós Narrativo" ↔ "Essencial" → textos/fotos/pacotes preservados; Ctrl+Z restaura.
   - Fundo: 1 clique na barra do canvas e no grupo "Estilo"; hex escuro → texto vira claro automaticamente.
   - Biblioteca de seções em janela de 700px de altura → rola e insere na posição do "+".
   - Portfólio: enviar 8 fotos de uma vez; clicar numa foto → Larga/Alta/Destaque refletem em 2/3/4 colunas (celular e desktop).
   - Depoimentos: carrossel com setas, pontos e swipe no modo celular; público idem.
4. Screenshots antes/depois do editor em desktop e celular.
