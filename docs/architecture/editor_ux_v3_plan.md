# Plano — Auditoria UX/UI e evolução do editor de propostas (Lunari)

> **Etapa 1: diagnóstico + plano. Nenhuma linha de código foi alterada.** A implementação só começa após a sua aprovação, fase a fase.

## Contexto

O editor (`src/pages/comercial/EditorPropostaPage.tsx`) já funciona bem: arte editável direto no preview, painel por seção, grupos de pacotes, histórico de undo. O atrito que as 3 capturas mostram **não é de cor ou borda: é de estrutura** — acordeões aninhados viram formulários de 640–1 000 px que empurram os irmãos, o estado de "o que está aberto" se perde a cada troca, e a arte e o painel não sabem um do outro. O objetivo é evoluir isso **sem reescrever o editor e sem tocar em dados, persistência ou renderização pública**.

**Decisões anteriores que continuam valendo** (`docs/architecture/editor_ux_v2_plan.md`): inspetor sem abas, acordeão solitário por grupo; grupo aberto acompanha o fotógrafo de seção em seção (`PropertiesSidebar.tsx:129`); IA só no grupo Textos e só em hover/foco; zero toasts; campo que a variante não usa some (`showIf`); canvas primeiro. **Uma delas é revista** com a sua aprovação: "acordeão solitário nos itens de lista" passa a navegação lista→detalhe **só nas listas ricas** (pacotes, adicionais, depoimentos), porque o aninhamento é o que quebra.

**Regras do projeto que governam o desenho** (`.agents/rules/*`, `docs/constitution/DESIGN_DNA.md`, `CLAUDE.md`): exatamente 3 níveis visuais (§4); "na dúvida, esconder" (§13); "nunca repetir informação" (§14); dourado só em lista fechada, novo uso exige atualizar o DNA antes do código (§7/§11); hover sutil `bg-muted`, nunca `hover:bg-accent` (preto); cartões `rounded-xl`, bordas `/60–/80`; `paddingBottom: calc(8rem + env(safe-area-inset-bottom))` em toda rolagem; linguagem operacional (§19); `npm run typecheck:changed` antes de concluir.

**Em paralelo**: outra sessão ("Grupos de pacotes em propostas") atua na mesma área (`PackageGroupsField.tsx`). Coordenar antes da F4.

## Decisões já tomadas com você

| # | Pergunta | Decisão |
|---|---|---|
| D1 | Fixados | **1 item por vez** (substitui o anterior) |
| D2 | Textos duplicados no painel | **Recolher em "Editar como formulário"** (só os que têm gêmeo garantido na arte) |
| D3 | Abrir pacote/grupo | **Lista + página de detalhe** (voltar, ↑/↓) |
| D4 | Clique na arte | **Abre o detalhe do pacote** no painel; duplo clique segue editando |

Padrões que adotei sem perguntar (vetáveis na revisão): pin em dourado `accent-gold` com registro no DNA (F2); scroll-spy pausado enquanto um detalhe está aberto; painel mais largo só em telas ≥ 1728 px (ver F2); alças de redimensionar nas duas colunas.

## Resumo executivo

1. **Causa-raiz**: 3 acordeões aninhados (Itens → Grupo → Pacote) + estado de expansão em 3 `useState` locais descartados a cada troca + seleção na arte que só conhece a seção.
2. **Proposta**: (A) hierarquia e estados em 3 níveis do DNA; (B) lista rica vira **árvore compacta + página de detalhe**, com memória por seção; (C) **um item fixado** em barra de 1 linha fora da rolagem; (D) texto: **arte primeiro**, formulário recolhido só onde o gêmeo na arte é garantido.
3. **Ligação arte ↔ painel**: clicar no texto/foto de um pacote destaca o cartão e abre o detalhe dele (o que você desenhou à mão nas capturas 2 e 3).
4. **8 fases pequenas** (F0–F7), cada uma reversível; nada de dados, persistência, `useMaterialEditor` ou renderer público muda.

---

## 1. Diagnóstico da situação atual

### 1.1 Mapa real do editor

| Camada | Arquivo | Papel / estado |
|---|---|---|
| Página | `EditorPropostaPage.tsx` | `activeIndex` — seção por **índice** (L52); `viewMode`, `zoomOverride`, `mobilePanel`; scroll-spy troca `activeIndex` ao rolar (L361-414); colunas 280 px (L625) e 340 px (L697) **fixas**; o mesmo `propertiesPanel` é montado na coluna *e* no Sheet (L697-752) |
| Documento | `hooks/useMaterialEditor.ts` | reducer com histórico (50) e coalescência 900 ms; `updateBlock` (substitui `content`/`props`) e `updateBlockField` (caminho pontuado); `duplicateBlock` renova `id` de listas; dirty por `JSON.stringify`; autosave 2,5 s na página |
| Painel | `PropertiesSidebar.tsx` | acordeão solitário Textos/Itens/Fotos/Composição/Estilo/Botões (L68-75), `openGroup` local (L130); campos do schema `registryDefinitions.ts` |
| Listas | `FieldEditor.tsx` → `ListField` (L876), `SortableListItem` (L817) | acordeão por item, `openId` local (L880), dnd-kit |
| Pacotes | `PackageGroupsField.tsx` | acordeão por grupo, `openKey` local (L38) → 8 campos do grupo + `ListField` dos pacotes |
| Arte | `VisualRenderer.tsx` | clique na seção = `onSelectBlock(index,{scroll:false})` (L249); `InlineEditContext` por seção (L170-180); barra da seção em `CanvasToolbars.tsx` |
| Edição inline | `EditableText.tsx`, `EditableImage.tsx`, `inlineContext.ts` | duplo clique → `contentEditable`; clique simples abre popover de tamanho só em campos de topo (`fieldKey`) |
| Pacotes na arte | `PricingBlocks.tsx` (4 variantes), `PricingCollectionBlocks.tsx` (3), `PackageGroups.tsx` | `PathScope` remapeia `packages.N.` local → índice global **só na escrita** (L20-34) |

### 1.2 Problemas efetivamente encontrados (evidência no código)

| # | Problema | Origem | Impacto |
|---|---|---|---|
| E1 | **3 acordeões aninhados** (Itens → Grupo → Pacote) | `PropertiesSidebar.tsx:306`, `PackageGroupsField.tsx:135`, `FieldEditor.tsx:922` | largura útil do campo cai de ~308 px para ~256 px (340 − 2×16 − 2×13 − 2×13) |
| E2 | Formulário de grupo ≈ 640 px e de pacote ≈ 1 000 px (soma das alturas: `Input` h-10, `Textarea` ≥ 80, select h-9) > área útil (~740 px) | `registryDefinitions.ts:173-187` (8 campos), `:419-430` (10 campos) | rolagem obrigatória; **os irmãos ficam abaixo do formulário aberto** (a referência da lista se perde) |
| E3 | "Aberto/selecionado" quase não se vê: item de lista só gira o chevron; grupo L1 usa `bg-muted/20` | `FieldEditor.tsx:854-857`, `PropertiesSidebar.tsx:309` | dependência da "pequena seta" (problema 3 do pedido) |
| E4 | Estado de expansão em **3 `useState` independentes**, descartados quando o grupo fecha (Radix desmonta o conteúdo), quando o scroll-spy troca de seção e a cada abertura do Sheet | `PropertiesSidebar.tsx:130`, `PackageGroupsField.tsx:38`, `FieldEditor.tsx:880`; ver E8, E23 | voltar a "Itens" ou rolar a arte devolve tudo recolhido |
| E5 | Seleção na arte = só a seção; nenhum vínculo cartão ↔ formulário; `PathScope` só reescreve a escrita; o painel nem recebe item/campo | `VisualRenderer.tsx:249`, `PackageGroups.tsx:26-29`, `PropertiesSidebar.tsx:40-58` | "qual elemento estou editando?" não tem resposta visual |
| E6 | Todo texto curto do painel tem gêmeo na arte (§2) e a edição inline é **só mouse**: `EditableText` não é tabulável (`tabIndex`/`aria-*` ausentes) | `EditableText.tsx:123-173` | duas formas da mesma tarefa; remover o campo quebraria teclado/toque |
| E7 | IA existe **só** nos campos de topo do grupo Textos, invisível até o hover (decisão v2 "Silêncio") | `PropertiesSidebar.tsx:342`, `FieldEditor.tsx:112-117` | tirar o campo do painel remove a IA; hover não existe em toque |
| E8 | Painel montado **2×** em < lg (coluna `hidden lg:flex` + Sheet) e o Sheet remonta a cada abertura | `EditorPropostaPage.tsx:697-752`; remendo em `FieldEditor.tsx:705` | estado duplicado/dessincronizado; `openGroup`, `openKey`, `openId` e rolagem reiniciam |
| E9 | Largura fixa 340 px; escala do canvas cai ≈ 0,043 a cada +40 px do painel (1280 px → ≈ 0,62; 1024 px → piso 0,55 e o documento estoura) | `EditorPropostaPage.tsx:297-304,697` | largura é bem escasso: o ganho está em **não desperdiçá-la** (E1) |
| E10 | O helper `et()` (caminho → `EditableText`) está **copiado em ≥ 14 arquivos** (`kit.tsx:23`, `ClosingBlocks.tsx:14`, `EditorialBlocks.tsx:24,158`, `PricingBlocks.tsx:63,169,277,447`, 10 capas, `EditorialComposition.tsx:25`) | grep `inline?.set(path` | qualquer recurso "consciente de caminho" exige consolidar antes |
| E11 | Título da seção usa só `content.title` → capa Natal aparece como "Sessões de" (captura 1) | `registry.ts:18-20` | identificação ambígua |
| E12 | Preço: o exibido é `price_cash \|\| price`; editar "Preço (texto livre)" **não muda a arte** quando `price_cash` existe; rótulos não dizem isso | `pricing.ts:97-100`, `registryDefinitions.ts:422-424` | campo de painel "morto" |
| E13 | X do Sheet (`absolute right-4 top-4`) cai sobre o ⋮ do cabeçalho (e sobre a aba "Estilo" no Sheet esquerdo) | `ui/sheet.tsx:66` × `PropertiesSidebar.tsx:268-297` | **a validar visualmente** (forte indício) |
| E14 | Realce da seção ativa usa RGBA terracota fixo (`rgba(200,106,70,.1)`), fora da paleta grafite | `VisualRenderer.tsx:252` | linguagem visual arte ≠ painel |
| E15 | Ações secundárias só no hover (remover item, IA, grip da esquerda) | `FieldEditor.tsx:862`, `EditorSidebar.tsx:122` | invisíveis em toque |
| E16 | Sem padrão: 2 acordeões diferentes no mesmo painel (L1 linha cheia × item em cartão); 3 receitas de eyebrow; 6 receitas de "selecionado"; alturas h-6/7/8/9/10; `Input` h-10 `rounded-lg` com borda × `SelectTrigger` h-7 `rounded-md` | `FieldEditor.tsx`, `PackageGroupsField.tsx:150,165,173`, `ui/input.tsx:11`, `ui/select.tsx:21`, `DocumentStylePanel.tsx:68` | hierarquia irregular |
| E17 | **Campos visíveis que não têm efeito** na variante atual | `CoverBlock.eyebrow` em *ornament*; `EditorialBlock.eyebrow` em *split-portrait*; `title_italic` em *split-portrait/arch-portrait*; `price_unit` em *numbered/magazine*; `price_installments` em *cards-classic/minimal*; `badge` em *numbered-editorial*; `Gallery.eyebrow`/`align` em *captioned*; `InfoBlock.eyebrow` em *icon-columns*; `InfoBlock.align` em *icon-columns/icon-list/steps* (`registryDefinitions.ts:265,324,326,423,425,426,532,539,723,746`) | desconfiança do painel |
| E18 | Elementos que **somem da arte quando vazios** (só existem no painel até serem preenchidos) | `btnText` em 5 capas, `badge`, `title_italic` em *poster-split* e `EditorialComposition`, `items[].service`, listas vazias | "tirar do painel porque tem gêmeo" **quebraria** estes casos |
| E19 | `PackageGroupsField.onList` reordena `packages` a cada edição (grupo editado vai para o fim do array) | `PackageGroupsField.tsx:63-69` | índice `packages.N` **não é estável**: identidade só por `id` (vale para detalhe, fixado e seleção) |
| E20 | `activeIndex` é índice: undo/redo/discard não remapeiam; índice fora do intervalo cai no placeholder "Selecione uma seção" e esconde o botão "Editar" | `EditorPropostaPage.tsx:52,425,565-568` | memória e fixado devem usar `block.id` |
| E21 | Descumprem regra do projeto: `hover:bg-accent` ×5 (vira preto), classes sem efeito (`custom-scrollbar` em 10 arquivos, `shadow-xs`), `Button` força `[&_svg]:size-4` (anula `h-3.5 w-3.5`), `text-[11px]` renderiza 9,9 px (< `text-[10px]`), abas da esquerda fora de `ui-components.md §4/§6` | `PropertiesSidebar.tsx:364`, `FieldEditor.tsx:375,448,492`, `DocumentStylePanel.tsx:227`, `tailwind.config.ts:31`, `EditorSidebar.tsx:189` | ruído visual e regressão silenciosa |
| E22 | Acessibilidade: lista esquerda é `div onClick` (sem foco, `aria-current`); `AlignField` sem `aria-pressed`; cartões de importação `div onClick`; `title` como única dica; dnd-kit sem anúncios em PT; poucos `focus-visible` | `EditorSidebar.tsx:73-83`, `FieldEditor.tsx:438-452`, `PropertiesSidebar.tsx:421-425` | percurso só com teclado incompleto |
| E23 | O guarda do scroll-spy zera em `onPointerEnter`/`onWheel` do canvas: rolar a arte troca a seção enquanto o usuário "está no painel" | `EditorPropostaPage.tsx:262-263,362-364,656-661` | com um detalhe aberto isso o expulsaria da edição |
| E24 | Um único scroller no painel, sem reset/restauração ao trocar de seção | `PropertiesSidebar.tsx:302` | posição de rolagem herdada de outra seção |

**Achados adjacentes (fora do escopo, registrados)**: (a) provável bug de undo — na coalescência o reducer troca o último `past` pelo `present` (`useMaterialEditor.ts:57-59`), então uma rajada de digitação desfaz só o último passo e perde o estado anterior à rajada; correção de uma linha + teste, **a confirmar**; (b) `onMoveBlock` é passado ao `EditorSidebar` e não usado; (c) `AUDITORIA_PROPOSTAS_LUNARI.md` ainda descreve "3 abas"; (d) textos fixos na arte sem caminho de edição ("À VISTA", numeração, fallback "Falar no WhatsApp"); (e) `\n` aceito no painel sem `whitespace-pre-line` em várias artes (`EditorialBlocks.tsx:134,294`, `ClosingBlocks.tsx:130-134,220`); (f) frase padrão da capa Minimal (`CoverMinimalCenter.tsx:76`) aparece no público mas não no editor.

### 1.3 Hipóteses ainda não validadas

| # | Hipótese | Como validar |
|---|---|---|
| H1 | A descoberta do duplo clique é baixa (a dica só aparece em `lg`, `EditorPropostaPage.tsx:663-668`) e o painel funciona de muleta | observar 3–5 fotógrafos renomeando um pacote, sem dica |
| H2 | Edição inline funciona por duplo toque em tablet/celular (PWA) | teste real em iPad/Android; se falhar, ponteiro grosso usa o formulário como caminho principal |
| H3 | Trocar de pacote em sequência é frequente (fluxo T2) → vale reservar espaço para ↑/↓ | entrevista / telemetria leve |
| H4 | O scroll-spy tira o contexto do painel com frequência | contar trocas de `activeIndex` por sessão no harness |
| H5 | Entre 1024–1279 px o painel de 340 px já é o limite (canvas mínimo ≈ 593 px com escala 0,55) | medir no Browser pane |
| H6 | 1 fixado basta (decisão D1); se o piloto pedir 2–3, vira lista no mesmo store | piloto |
| H7 | Propostas antigas têm itens de lista **sem `id`** (`ListField` cai em `item-${idx}`, `FieldEditor.tsx:879`) | varrer `material_versions` |
| H8 | As estimativas de altura (E2) e a sobreposição do X (E13) | medir no harness / navegador |

### 1.4 Fluxos reais — baseline estimado × alvo

(Estimativa por leitura de código; **medir na F0**.)

| Fluxo | Hoje | Alvo |
|---|---|---|
| Título da seção na arte | 1 duplo clique + digitar | igual (já ótimo) |
| Configurar composição/fundo | barra do canvas: 2 cliques; painel: 2 cliques | igual, mesmos componentes (`VariantPicker`, `BackgroundSwatches`) |
| Achar o pacote do Lote 2 | Itens (1) → Lote 2 (1) → rolar ~640 px → linha | Itens (1) → árvore com todos os lotes → linha (1) |
| Editar o preço de um pacote | linha (1) + campo (3º do formulário, ~1 000 px) | linha (1) + campo (1) — ou direto na arte (clique) |
| Trocar para o pacote vizinho | fechar/abrir; o irmão está ~1 000 px abaixo → rolar | ↑/↓ no cabeçalho do detalhe (1) |
| Mover pacote de lote | expandir → rolar ~900 px até "Grupo" → select | ⋯ → "Mover para" (2) ou select no detalhe |
| Voltar ao grupo depois de editar | fechar pacote → rolar | breadcrumb (1) ou fixado (1) |
| Rolar a arte e voltar | painel perde o pacote aberto (E4) | memória por seção: volta ao mesmo lugar |

---

## 2. Auditoria da edição textual

Base: matriz exaustiva dos 13 tipos de bloco × 10 capas × 7 composições de pacote (63 consultas ao código). Hoje **não existe ponte** clique→painel: clicar na arte só troca `activeIndex`; nenhum campo/grupo/item do painel é aberto, rolado ou focado.

### 2.1 Como `EditableText` se comporta

- Duplo clique liga `contentEditable`; Enter confirma (Ctrl/⌘+Enter se `multiline`); Esc cancela; colar vira texto puro (`EditableText.tsx:96-160`).
- **Não é focável por Tab** e todo `keydown` faz `stopPropagation` (L145) — só ganha foco depois do duplo clique.
- No público devolve `null` se vazio (L92); no editor o nó vazio fica visível por CSS `:empty` + `data-placeholder`.
- Clique simples só tem efeito com `fieldKey` (campos de topo): abre o popover de tamanho. Campos de item (`packages.N.name`) não têm `fieldKey`.

### 2.2 Regra de decisão — por campo **e** variante, não por tipo

Um campo só é "redundante" quando existe um elemento editável **sempre presente** na arte, mesmo vazio, na composição atual. Caso contrário o painel é o único caminho e **não pode ser recolhido** (E18).

| Classe | Critério | Exemplos (da matriz) | Onde editar | No painel |
|---|---|---|---|---|
| **A** Curto com gêmeo garantido | renderizado e editável em toda variante em que o campo é exibido, vazio ou não | capas: `title`, `subtitle`, `photographer_name`; Editorial `title`; Pricing `eyebrow/title/title_italic/item_label/footnote`, `packages[].name`, preço; Addons `eyebrow/title/subtitle/items[].name/price`; Gallery `title/caption`; CTA (curtos); Info `title/title_italic/subtitle/list_title/note_title`; Palette `title`; Footer `copyright` | **Arte** | recolhido em "Editar como formulário" |
| **A′** Curto **sem** gêmeo garantido | só aparece preenchido, é estático ou a variante não renderiza | `btnText` (5 capas), `badge`, `title_italic` (*poster-split*, `EditorialComposition`), `items[].service`, `vertical_label`, `side_label`, `price_installments` (coleção), `price_unit`, `images[].caption` (só inline) | Painel (único caminho) | **visível** |
| **B** Texto longo | `multiline` em toda parte, mas incômodo na arte com zoom; é onde mora a IA | `body`, `aside`, `terms`, `quote`, `note`, `description`, `subtitle` longos | Arte **e** painel | **visível** (textarea + IA) |
| **C** Estrutura de lista | add/remover/reordenar só existem no painel (exceções: galeria e destaques de exemplo) | `packages`, `groups`, `details`, `items`, `highlights`, `colors`, `links`, `features` | Painel (árvore/detalhe) | lista |
| **C′** Texto de item | gêmeo na arte (quando preenchido) | `packages[].name/description`, `items[].title/body`, `colors[].name` | Arte + detalhe do item | no detalhe |
| **D** Imagem | upload nos dois lados (`uploadProposalImage`); painel tem lote, remover, miniaturas | `image_url`, `image_ref`, `photo_*`, `images[]` | Arte ("Trocar foto") + painel | mantém |
| **E** Ícone | catálogo visual só no painel | `*.icon`, `feature_icons`, `note_icon` | Painel | detalhe / "Avançado" |
| **F** Visual | `variant`/`background` têm atalho na barra; o resto só no painel | `align`, `text_color`, `card_style`, `hide_*`, `photo_style`, `title_style`, `numbering` | barra + painel (mesmo componente) | Composição/Estilo |
| **G** Operacional | em 2–4 lugares | duplicar/remover/mover/inserir | barra, menu ⋮, atalhos | menu ⋮ |

### 2.3 O que a auditoria muda no plano

1. **Recolher só a classe A** (decisão D2). A regra vira atributo do campo no schema: `onCanvas?: boolean | ((ctx) => boolean)` — padrão `true` para `text`/`textarea` de topo, com ~10 exceções declaradas (A′) e `longform: true` nos longos. **Estático**, não "registro em tempo de execução": o registro faria o campo sumir *enquanto o usuário digita nele* (digitar `btnText` no painel faz o botão aparecer na arte → o campo viraria "redundante" no meio da digitação).
2. **Corrigir antes** os campos sem efeito (E17): 9 `showIf`; o dado continua salvo.
3. **Preço**: o formulário passa a editar o preço **exibido** (`priceEditPath`, o mesmo caminho do inline) — "Preço"; "Preço à vista" explica que, se preenchido, é o exibido. Mesmas chaves, sem mudar contrato.
4. **IA**: fica no formulário recolhido, mantendo hover/foco (decisão v2). Em toque, o formulário já abre aberto e o botão aparece (sem hover). Oferecer IA no balão de texto da arte fica para F7.
5. **Acessibilidade**: o painel é o único caminho por teclado. O formulário abre **por padrão** com `(pointer: coarse)` e lembra a preferência do fotógrafo.
6. **Mensagem no grupo Textos** (linguagem operacional): "Edite estes textos direto na arte — clique duas vezes." + botão "Editar como formulário · n".

---

## 3. Reorganização do painel

### 3.1 Princípios

Um nível de cada vez; o item em edição sempre nomeado; voltar e trocar de item sem perder posição; progressivo (essencial à vista, resto sob demanda); **mesmo comportamento em todas as seções**; nada de dado novo.

### 3.2 Modelo: árvore compacta + página de detalhe

```
┌──────────────────────────────────────┐
│ SEÇÃO 03 · TABELA DE PREÇOS      ⋮   │  N1 identidade (fixa)
│ Pacotes                              │
│ 📌 Premium · LOTE 1               ✕  │  fixado (só se houver; 1 linha)
├──────────────────────────────────────┤
│ ▸ Textos        5 textos · na arte   │  N2 grupos (acordeão solitário)
│ ▾ Itens         2 grupos · 6 pacotes │
│   [+ Novo grupo ▾]  [Importar]       │
│   ▾ LOTE 1   3 pacotes        ⚙  ⋯   │  grupo: recolher / ajustes
│     ⠿ ▢ Premium     R$ 330   📌  ›   │  pacote: abre o detalhe
│     ⠿ ▢ Clássico    R$ 200       ›   │
│     + Adicionar pacote               │
│   ▸ LOTE 2   3 pacotes        ⚙  ⋯   │
│ ▸ Composição   Cartões com Foto      │
│ ▸ Estilo       #FAF6F0 · Automático  │
└──────────────────────────────────────┘

Detalhe (substitui o corpo; identidade e fixado permanecem):
┌──────────────────────────────────────┐
│ SEÇÃO 03 · TABELA DE PREÇOS      ⋮   │
│ 📌 Premium · LOTE 1               ✕  │
├──────────────────────────────────────┤
│ ‹ Voltar   Pacotes › LOTE 1          │
│ Premium             ‹ 1/6 ›  📌  ⋯   │
├──────────────────────────────────────┤
│ IDENTIDADE   Nome · Descrição · Selo │
│ VALORES      Preço │ À vista         │
│              Parcelamento │ Unidade  │
│ CONTEÚDO     Itens inclusos          │
│              ▸ Ícones dos itens      │
│ IMAGEM       [thumb] Trocar · Remover│
│ ORGANIZAÇÃO  Grupo: LOTE 1 ▾         │
└──────────────────────────────────────┘
```

### 3.3 Regras

| Regra | Detalhe |
|---|---|
| Quem usa detalhe | **listas ricas**: ≥ 4 subcampos ou com imagem/`textarea`/`stringlist`/`iconlist` (pacotes, adicionais, depoimentos). Declarado em `BlockField.presentation?: 'inline' \| 'detail'` (padrão inferido). Listas simples (links, destaques, cores, detalhes, itens de Info) **mantêm** o acordeão solitário atual |
| Nível 2 | continua acordeão solitário; **o grupo aberto acompanha** de seção em seção (decisão v2). A memória por seção guarda só: item em detalhe, grupos da árvore recolhidos e rolagem |
| Detalhe | substitui o corpo do painel; o mestre permanece **montado** sob ele (`inert`, sem `display:none`) para preservar rolagem e recolhidos |
| Cabeçalho do detalhe | `‹ Voltar` (ghost icon-sm) · breadcrumb "Pacotes › LOTE 1" · título do item · `‹ n/N ›` (percorre na ordem de exibição, entre grupos) · Fixar · ⋯ (Duplicar, Mover para…, Remover) |
| Foco | ao abrir: título do detalhe; ao voltar: a linha de origem; `Esc` (fora de campo) volta |
| Item removido/inexistente | volta à lista (derivado no render, sem efeito) |
| Scroll-spy | **pausado** enquanto houver detalhe aberto (guarda `\|\| activeItemRef.current`); retoma ao voltar ou ao clicar em outra seção |
| Edição por `id` | nunca por índice (E19); mover de grupo = trocar `group_id`; o array `packages` não é reordenado a cada edição |

### 3.4 Pacotes (caso principal)

- **Árvore**: usa `buildPackagePages(content, { includeEmpty: true })` (`pricing.ts:70`) — a mesma ordem de exibição da arte (sem grupo primeiro, depois cada grupo). Padrão: grupos abertos se houver ≤ 10 linhas; senão só o do item selecionado.
- **Linha de pacote** (receita `HubRow`, `GerenciarView.tsx:23-50`): grip · miniatura 32 px · nome · preço exibido (`displayPrice`) · fixado · ⋯ · `›`; `role="button"`, `tabIndex=0`, Enter/Espaço.
- **Detalhe do grupo**: composição (controle segmentado), "Começar em nova página", ícone; textos do grupo (título, subtítulo, período, nota, observação) **recolhidos** pela regra A (editáveis no cabeçalho do grupo na arte); "Importar pacotes cadastrados"; "Remover grupo". Toda a lógica atual (adotar pacotes no 1º grupo, copiar de outro lote, importar, remover mantendo pacotes) é **preservada**.
- **Detalhe do pacote**: subtítulos de afinidade (Identidade · Valores · Conteúdo · Imagem · Organização), curtos lado a lado (2 colunas). Altura estimada ≈ 720 px (hoje ≈ 1 000 px) e **cabeçalho fixo** com voltar/↑↓.
- **Mover entre grupos**: ⋯ → "Mover para ▸" (2 cliques) e select "Grupo" no detalhe. Arrastar entre grupos (dnd-kit multi-contêiner) fica em F7 só se for pedido.
- **Adicionar**: o pacote novo abre o detalhe (como hoje, que abre o item novo).

### 3.5 Princípios nas demais seções

| Seção | Comportamento |
|---|---|
| Adicionais, Depoimentos | lista rica → árvore (sem grupos) + detalhe, mesmo componente |
| Detalhes, Links, Destaques, Cores, Itens de Info | lista simples → acordeão solitário atual |
| Galeria | miniaturas + barra da foto na arte (sem mudança) |
| Capa, Editorial, Rodapé, CTA | sem lista: só o grupo Textos recolhido (regra A) e Composição/Estilo |
| Todas | mesmo cabeçalho, mesmo estado "selecionado", mesmo fixar |

### 3.6 Seleção arte ↔ painel (decisão D4)

- **Arte → painel**: clicar num texto ou foto cujo caminho tem índice de lista (`packages.N.*`, `groups.G.*`, `items.N.*`) seleciona o item (e a seção, sem rolar) e abre o detalhe; o cartão/cabeçalho recebe contorno grafite 2 px (`data-selected`). Duplo clique segue editando no lugar.
- **Painel → arte**: abrir um detalhe rola a arte até o cartão (centralizado, com `isProgrammaticScrollRef` como o `handleSelectBlock`).
- **Público**: `data-item`/`data-selected` só existem com `editable`; o HTML publicado não muda.
- **Celular**: tocar na arte não abre o Sheet (como hoje); o botão do cabeçalho abre direto no detalhe selecionado.

---

## 4. Item fixado (decisão D1: 1 por vez)

**Modelo: barra de fixado de 1 linha**, entre o cabeçalho da seção e o conteúdo, fora da rolagem (`shrink-0`). Nunca renderiza formulário.

| Alternativa | Veredito |
|---|---|
| Formulário congelado no topo | Rejeitado (pedido do usuário) |
| Cabeçalho contextual / breadcrumb | Já faz parte do detalhe (§3), mas não persiste ao trocar de seção → complementa |
| Navegação persistente (coluna "Seções") | Existe para seções; não alcança item (pacote/grupo) |
| **Barra de 1 linha** | **Escolhido**: persistente, 36 px, sem formulário |

| Aspecto | Desenho |
|---|---|
| O que se fixa | seção, grupo, pacote ou qualquer item de lista com detalhe |
| Barra | `📌 [miniatura 20] Nome · contexto (grupo · seção)` + ✕. Clicar leva ao item; só aparece quando o fixado ainda existe |
| Fixar | botão no cabeçalho do detalhe, ⋯ da linha e ⋮ da seção ("Fixar seção"); `aria-pressed` + Tooltip (molde `FavoriteStarToggle`). Fixar outro **substitui** o atual — sem toast; a barra muda |
| Desafixar | ✕ da barra ou o mesmo botão |
| Selecionado × fixado × expandido | três canais distintos: glifo `Pin` + presença na barra (fixado); barra lateral 2 px + peso 600 (selecionado); chevron + fundo (grupo expandido) |
| Ir ao fixado | seleciona a seção, rola a arte até o item e abre o detalhe |
| Item/seção removido | a barra some; **undo traz de volta** (a referência por `id` não é apagada até o usuário desafixar ou fixar outro) |
| Referência | `{ blockId, list?, key? }`; `key` = `id` do item ou `key` do grupo → sobrevive a reordenar, a "Trocar modelo" (`normalization.ts:400` preserva o `id` do bloco) e a undo; duplicar seção gera ids novos (a cópia não herda) |
| Item sem `id` (H7) | botão desabilitado com dica; se for comum, `ensureItemIds` em `normalizeBlock` |
| Persistência | `localStorage` por proposta (`lunari:proposal:pin:{materialId}`) via `safeStorage`, **chaveado por `materialId`, nunca por `versionId`** (muda no primeiro save sobre versão publicada). Não entra em `MaterialEditorState`: não suja, não dispara autosave, não entra no Ctrl+Z |
| Troca de contexto | seção, voltar à lista, fechar o Sheet, Desktop↔Celular: a barra não muda |
| Teclado | a barra é `button` (Enter/Espaço) e o ✕ é outro `button` |

Escala futura: se o piloto (H6) pedir 2–3, o store vira array e a barra vira lista — mudança local, sem tocar no resto.
Fora do escopo: fixar campos soltos, arrastar para fixar, fixados no banco/entre dispositivos.

---

## 5. Direção visual

### 5.1 Três níveis (DNA §4) — receita com as classes reais (1 rem = 14,4 px; evitar `text-[11px]`, que rende 9,9 px)

| Nível | Conteúdo no painel | Receita |
|---|---|---|
| **N1** crítico | título da seção; título do item em detalhe; item selecionado | `text-base font-semibold tracking-tight` (14,4 px); detalhe `text-sm font-semibold` |
| **N2** contexto | cabeçalho de grupo, nome da linha, valor | `text-sm font-medium` (12,6 px) |
| **N3** auxiliar | eyebrow, resumos, rótulos de campo, ajuda, breadcrumb | `text-xs text-muted-foreground` (10,8 px); eyebrow `text-[10px] font-semibold uppercase tracking-wider` |

### 5.2 Estados (iguais no painel, na lista de seções e na arte)

| Estado | Linha de item / grupo | Cabeçalho do grupo | Observação |
|---|---|---|---|
| Disponível | `bg-background`, `border-border/60` | `bg-background` | |
| Hover | `hover:bg-muted/40` (receita `HubRow`) | `hover:bg-muted/30` | `ui-components §1`: nunca `hover:bg-accent` |
| Seção expandida | — | `bg-muted/40` + barra 2 px grafite + `font-semibold` + chevron 180° | hoje só `bg-muted/20` (`PropertiesSidebar.tsx:309`) |
| Selecionado / em edição | `bg-primary/10 ring-1 ring-primary/30` (igual a `EditorSidebar.tsx:79`) + barra 2 px + `font-semibold` | — | **na arte**: contorno grafite 2 px, offset 4 px |
| Fixado | glifo `Pin` preenchido `text-accent-gold` | — | pede registro no DNA §7/§11 (F2); sem registro, cai para `text-foreground` |
| Desabilitado | `opacity-50`, `aria-disabled`, motivo no Tooltip | idem | campo que a composição não usa continua oculto por `showIf` |
| Foco por teclado | `focus-visible:ring-2 ring-ring/40` | idem | hoje só `DocumentStylePanel.tsx:166` tem |

### 5.3 Controles expansíveis — um padrão por nível

- **N2**: acordeão solitário (mantém), cabeçalho mais forte (5.2).
- **Linha de item**: navegável (`›`), não expansível — semânticas distintas, ícones distintos.
- **Avançado**: `Collapsible` "Avançado · n" no detalhe (ícones dos itens, ornamentos).
- Área clicável = linha inteira. Botões só-ícone: `variant="ghost" size="icon-sm"`, hover `bg-muted text-foreground`. Segmentado: `bg-muted/40 p-1 rounded-lg`, ativo `bg-background shadow-sm rounded-md` (`ui-components §3–4`).
- **Alturas de controle**: inputs/selects `h-9` no painel; "adicionar" único `h-9 w-full border-dashed rounded-xl text-xs`.

### 5.4 Largura e desenho dos painéis

| Região | Hoje | Proposta |
|---|---|---|
| Direita (inspetor) | `w-[340px]` fixo | 340 até 1727 px · 380 em ≥ 1728 px · 420 em ≥ 1920 px (onde o documento já está em escala 1,0: nunca piora a escala); **alça** de redimensionar (320–520, `localStorage`, duplo clique/Enter restaura) |
| Esquerda (seções) | 280 px fixo | 280; **alça** 220–360 (devolve canvas em 1024–1440 px) |
| Celular (< lg) | Sheet 340/380 px, X sobre o ⋮ (E13) | `w-[min(92vw,400px)]`; cabeçalho com `pr-10` |
| Aninhamento | 3 caixas (−52…84 px de largura útil) | 0 caixas: árvore plana + página de detalhe → campo volta a ~308–348 px |

Escala do canvas (cada +40 px no inspetor custa ≈ 0,043): 1024 → 0,55 (piso) · 1280 → ≈ 0,62 · 1440 → ≈ 0,80 · 1536 → ≈ 0,90 · 1920 → 1,0. Por isso **recuperar largura de campo removendo o aninhamento vale mais do que alargar o painel**; o painel só cresce onde a escala não sofre. Alça própria de ~30 linhas em vez de `react-resizable-panels` (já instalado, mas só em %, e a largura aqui é em px).

### 5.5 Ações secundárias e reaproveitamento

- ⋯ sempre visível a 60% (100% em hover/foco; visível em toque); remover/duplicar/mover dentro do ⋯ da linha — não mais `opacity-0`.
- IA: mantém hover/foco (decisão v2) e passa a aparecer em toque.
- Reaproveitar: `HubRow`/botão voltar de `ClientHeader.tsx:25-33`, `Collapsible`, `Tooltip`, `FavoriteStarToggle` (molde), `VariantPicker`, `BackgroundSwatches`, `SortableContext`, `tailwindcss-animate` (slide-in 150 ms, `motion-reduce:`), `safeStorage`, token `accent-gold`.

---

## 6. Arquitetura técnica sugerida

| Peça | Ação | O que muda |
|---|---|---|
| `useMaterialEditor` | **Manter** | nada de UI entra aqui; foco/fixado não geram mutação nem revisão |
| `FieldEditor` (folhas) | **Manter** | alturas/rótulos padrão (5.3), `AlignField` com `aria-pressed` |
| `registryDefinitions.ts` | **Ajustar** | campos opcionais em `BlockField`: `onCanvas`, `longform`, `presentation`, `section` (afinidade); 9 `showIf` corrigidos |
| `PropertiesSidebar.tsx` (454 l.) | **Dividir** | cabeçalho, barra de fixado, grupos N2, slots de mídia e `ImportPackagesDialog` em arquivos próprios; `fieldGroup`/`summarize` permanecem |
| `ListField` / `SortableListItem` | **Ajustar** | `inline` = comportamento atual; `detail` = linha navegável + página de detalhe |
| `PackageGroupsField.tsx` | **Ajustar** | árvore + detalhe de grupo; **toda a lógica** de copiar/importar/remover/adotar preservada; edição por `id` (sem reordenar `packages`) |
| `EditorPropostaPage.tsx` | **Ajustar** | `panelMemory` por `blockId` + `pin`; painel montado **uma vez** (coluna ≥ lg, Sheet < lg, via `useMediaQuery`); larguras |
| `VisualRenderer.tsx` | **Ajustar** | repassa `focusedItem`/`onFocusPath` no `InlineEditContext`; `data-selected` |
| `EditableText`/`EditableImage`/`kit.useEt` | **Ajustar** | prop `path` opcional; clique informa o caminho. **Antes**, consolidar os ~14 `et()` copiados em `kit.useEt` (E10) |
| `PathScope` | **Ajustar** | remapeia também o caminho de seleção/âncora |
| Novos | **Criar** | `components/editor/panel/{PanelPrimitives,PinnedBar,ItemTree,ItemDetail}.tsx`; `blocks/inspectorFocus.ts` (lógica pura e testável); `hooks/useMediaQuery.ts` |

**Estado — um dono para cada coisa**

| Estado | Onde | Observação |
|---|---|---|
| seção ativa | `activeIndex` (existe) | não duplicar; memória e fixado usam `block.id` (E20) |
| item em detalhe + grupos recolhidos + rolagem | `panelMemory: Record<blockId, {...}>` na página (validade **derivada** no render: bloco e item existem), via contexto | **substitui** `openKey`/`openId` das listas ricas (E4); listas simples mantêm `openId` local |
| grupo N2 aberto | `openGroup` (existe; acompanha entre seções) | decisão v2 mantida |
| fixado | `pin: PinRef \| null` na página + espelho em `localStorage` | |
| texto/foto selecionados na arte | `textSizeState`/`imageSel` do `VisualRenderer` | não mexer |

**Integração**: tudo é estado de UI. `content`/`props`/`global_settings`, `material_versions`, renderer público e Lunari Gallery **não mudam**. Mutações continuam em `onUpdateBlock`/`updateBlockField` (mesmos caminhos e coalescência). Callbacks novos do `InlineEditContext` são **opcionais** (o público, o `FullscreenPreviewModal` e `NovaPropostaPage` usam o mesmo renderer).

**Lógica pura** (`blocks/inspectorFocus.ts`, testada em `scripts/test_template_instantiation.ts` como `pricing.ts`): `resolveItem(block, ref)`, `itemRefFromPath(block, path)` (`packages.3.name` → `{packages, id}`), `resolvePin(blocks, pin)`, `neighbors(content, ref)` (anterior/próximo na ordem de exibição).

**Não se faz** (ponytail): store global (zustand não é dependência), `framer-motion` na transição (CSS basta), `cmdk`/paleta de comandos (YAGNI), novo contrato de dados, feature flag (cada fase é um commit reversível), registro de caminhos em tempo de execução.

---

## 7. Plano de implementação faseado

Cada fase termina com `npm run typecheck:changed`, `npm run test:proposals`, verificação no harness e **parada para autorização** (mesmo ritmo das propostas Natal).

| Fase | Objetivo | Arquivos principais | Depende de | Riscos | Critério de conclusão |
|---|---|---|---|---|---|
| **F0** Medição (sem código de produto) | baseline de alturas/cliques/rolagens; validar H4, H5, H7, H8, E13; confirmar achado (a) do undo; copiar este plano para `docs/architecture/editor_ux_v3_plan.md` | harness `natal-qa.local` (monta `PropertiesSidebar` com `ConfigurationContext` simulado) | — | harness não monta o painel real | tabela baseline preenchida |
| **F1** Higiene (sem mudar estrutura) | 9 `showIf` (E17); título composto (E11); rótulos de preço (E12); classes fantasma, `hover:bg-accent`, svg do `Button` (E21); a11y rápida (E22: lista esquerda focável, `aria-pressed`, cartões de importação como `button`, `focus-visible`); halo em token (E14); `pr-10` no Sheet (E13) | `registryDefinitions`, `registry.ts`, `EditorSidebar`, `FieldEditor`, `PropertiesSidebar`, `VisualRenderer`, `DocumentStylePanel` | F0 | regressão visual pequena | nenhuma mudança de dados; campos sem efeito somem; Tab percorre a lista de seções |
| **F2** Estados e largura | 3 níveis + estados (5.1–5.2) em N2/linhas/lista esquerda; painel montado 1× (E8); larguras responsivas + alças (5.4); registrar "item fixado" no `DESIGN_DNA.md` §7/§11 | `panel/PanelPrimitives`, `EditorPropostaPage`, `PropertiesSidebar`, `EditorSidebar`, `DESIGN_DNA.md` | F1 | escala do canvas em 1280 px; alça × `ResizeObserver` | 1 montagem do painel; estado visível sem olhar o chevron; escala não piora ≤ 1535 px |
| **F3** Textos sem duplicidade (D2) | `onCanvas`/`longform` no schema; grupo Textos = dica + A′/B visíveis + "Editar como formulário · n" (abre sozinho em toque); IA preservada | `registryDefinitions`, `PropertiesSidebar` | F1, matriz §2 | descoberta do duplo clique (H1) | todo campo classe A tem gêmeo na arte (verificado por sonda no harness em todas as variantes); nenhum campo se perde |
| **F4** Lista → detalhe (D3) | árvore + página de detalhe (voltar, ↑/↓, ⋯, mover para), memória por seção, scroll-spy pausado, edição por `id`, formulário por afinidade | `FieldEditor` (`ListField`), `PackageGroupsField`, `panel/ItemTree`, `panel/ItemDetail`, `EditorPropostaPage` | F2 | dnd-kit em linhas; foco ao voltar; sessão paralela em `PackageGroupsField` | achar e editar qualquer pacote sem rolar formulário > 1 viewport; voltar mantém posição; dados idênticos antes/depois |
| **F5** Fixado (D1) | barra de 1 linha, botões de fixar, persistência por proposta, ida ao item | `panel/PinnedBar`, `inspectorFocus.ts`, `EditorPropostaPage` | F4 | itens sem `id` (H7) | fixar/desafixar/ir sem mutação (`revision` inalterada, sem autosave) |
| **F6** Seleção arte ↔ painel (D4) | consolidar `et()`; `path` em `EditableText`/`EditableImage`; clique abre o detalhe; cartão destacado; abrir detalhe rola a arte | `kit.useEt` + ~14 arquivos, `EditableText`, `EditableImage`, `PathScope`, 7 variantes de pacote + `PackageGroupHeader` + 2 de adicionais (`data-item`) | F4 | **maior diff do plano**; `stopPropagation` do duplo clique; `zoom` do canvas | duplo clique segue editando; clique seleciona; público sem `data-*`; capturas antes/depois idênticas |
| **F7** (opcional) | atalho "Editar na arte" que ativa o texto; IA no balão de texto; arrastar pacote entre grupos | `EditableText` (foco por caminho), `TextSizeFloatingPopover`, dnd-kit | F6 | infra nova | só se H1/H2 pedirem |

Ordem: F1–F3 entregam valor sem mexer em listas; F4 resolve a maior dor (E1–E4); F5 depende da navegação de F4; F6 é a maior refatoração e só traz o refinamento arte↔painel (o pacote já é editável em F4).

---

## 8. Plano de validação

| Eixo | Como verificar | Aprovação |
|---|---|---|
| Compreensão | 4 tarefas cronometradas, antes × depois, no harness e com 3–5 fotógrafos: T1 renomear pacote do Lote 2; T2 mudar o preço dos 3 pacotes do Lote 1; T3 mover pacote entre lotes; T4 voltar ao grupo depois de editar o pacote 5 | cliques ↓, rolagem ↓, 0 tarefas em que o usuário "se perdeu" (pergunta: "qual item está editando?") |
| Edição direta continua | duplo clique em título/nome/preço/benefício em cada variante (7 de pacote, 10 capas); Esc cancela; Enter confirma; popover de tamanho abre | 100% dos caminhos que editavam continuam; público sem regressão |
| Dados não se perdem | JSON de `blocks` + `globalSettings` antes/depois de uma sequência de navegação/fixação = idêntico; `revision` inalterada; nenhum autosave; undo/redo coerente | diff vazio |
| Fixado | fixar, fixar outro (substitui), recarregar, remover o item e desfazer, trocar modelo, duplicar seção | comportamento da tabela §4 |
| Responsividade | 1024, 1280, 1440, 1920 e 375×812 (Sheet) no Browser pane; altura 700 px com fixado; zoom 50/100/150% | sem sobreposição; X do Sheet livre; escala não piora |
| Acessibilidade | percurso só com teclado (Tab, Enter, Esc, setas do dnd-kit); foco visível; `aria-expanded`/`aria-pressed`/`aria-current`; alvos ≥ 32 px (≥ 40 px em toque) | sem armadilha de foco; foco volta à linha de origem |
| DNA | checklist: 3 níveis; sem `hover:bg-accent`; bordas `/60–/80`; `rounded-xl`; ouro só no pin (registrado); sem toast; `paddingBottom` 8 rem; "Gerenciar" em vez de "Editar" | tudo marcado |
| Regressão automatizada | novos casos em `test:proposals` (29+): `resolveItem`, `itemRefFromPath`, `resolvePin`, `neighbors`, chave de grupo × `id`, troca de modelo preserva refs, edição por `id` não reordena `packages`; `typecheck:changed` | verde |

Harness: estender `natal-qa.local` (gitignored, sem login nem banco) para montar o `PropertiesSidebar` real.

---

## 9. Alternativas consideradas e descartadas

| Alternativa | Por que não |
|---|---|
| Só reestilizar acordeões (cor/borda) | não resolve E1/E2/E4: o formulário continua empurrando os irmãos |
| Lista + formulário lado a lado no painel | 340–420 px × ~740 px: lista e formulário disputam altura |
| Inspetor flutuante ancorado ao cartão (estilo Canva) | conflita com `zoom` e rolagem do canvas; pior em teclado/toque; pode complementar depois |
| Modal para editar pacote | esconde a arte: perde o "ver enquanto digita" |
| Abas por grupo dentro do painel | escondem a contagem e a visão geral dos lotes |
| Remover todos os campos de texto do painel | quebra teclado/toque e a IA; contraria o pedido |
| Registro de caminhos em tempo de execução para decidir "redundante" | o campo sumiria enquanto o usuário digita nele (E18) |
| Fixar com formulário congelado / vários fixados com trilho | rejeitado / fora da decisão D1 |

## 10. Síntese: arquitetura e fluxo recomendados

**Arquitetura**: um painel único (identidade → fixado → corpo) cujo corpo alterna entre **lista** (grupos N2 / árvore) e **detalhe** (página com voltar, ↑/↓, fixar), alimentado por **um** estado de UI na página (`panelMemory` por `block.id` + `pin`), fora do histórico e do documento. A arte e o painel compartilham a mesma linguagem de seleção (contorno grafite + `data-selected`), e o clique no texto/foto de um item leva ao detalhe dele.

**Fluxo** (pacote do Lote 2, do clique ao retorno):

1. Clicar no nome do pacote na arte → cartão destacado, painel abre o detalhe "Pacotes › LOTE 2 › Clássico". (Duplo clique edita o nome no lugar.)
2. Ajustar valores no detalhe curto (≈ 720 px, cabeçalho fixo); a arte atualiza em tempo real.
3. ↑/↓ passa ao pacote vizinho sem voltar à lista; "Fixar" deixa o grupo à mão na barra do topo.
4. Rolar a arte (ou trocar de seção) não perde o lugar: ao voltar, o painel reabre no mesmo detalhe e na mesma rolagem.
5. "Voltar" (ou o fixado) devolve à árvore com todos os lotes, a linha marcada e a posição preservada.

**Por que é melhor do que as alternativas**

- Remove a **causa** (aninhamento e estado local descartável), não o sintoma: o campo recupera ~50–80 px de largura sem alargar o painel, e nenhum formulário empurra os irmãos.
- Cabe nas decisões já tomadas (acordeão solitário nos grupos; grupo aberto acompanha; IA em hover/foco) e nas regras do DNA (3 níveis, "esconder na dúvida", "não repetir informação"), mudando só o que quebra.
- **Seguro por construção**: foco e fixado nunca passam por `mutate` (sem sujar, sem autosave, sem undo); referência por `id` (não por índice); o campo só é recolhido onde o gêmeo na arte é garantido.
- **Incremental**: F1–F3 já entregam valor sem tocar em listas; F4–F6 são commits independentes e reversíveis.

## 11. Riscos principais

| Risco | Mitigação |
|---|---|
| Sessão paralela mexendo em `PackageGroupsField` | alinhar antes da F4; a lógica de grupos é preservada, só muda a apresentação |
| F6 toca ~19 arquivos de renderer | consolidar `et()` **sem** mudar comportamento e validar por captura antes/depois, antes de adicionar `path` |
| Duplo clique × clique de seleção | seleção no 1º clique não remonta o `EditableText` (chave estável); testar nos 7 layouts |
| Painel único × estado do Sheet | estado vive na página (contexto), não no painel |
| Itens sem `id` | fixar/detalhe desabilitado com dica; avaliar `ensureItemIds` após H7 |
| Escala do canvas | painel só cresce em ≥ 1536 px; alça deixa o fotógrafo decidir |

## Arquivos críticos (referência)

`src/pages/comercial/EditorPropostaPage.tsx` · `components/editor/{PropertiesSidebar,PackageGroupsField,EditorSidebar,CanvasToolbars,VisualRenderer,DocumentStylePanel}.tsx` · `blocks/{FieldEditor,registryDefinitions,pricing,EditableText,EditableImage,inlineContext,normalization,recentColors}.ts(x)` · `components/editor/blocks/{kit,PackageGroups,PricingBlocks,PricingCollectionBlocks}.tsx` · `hooks/useMaterialEditor.ts` · `scripts/test_template_instantiation.ts` · `natal-qa.local/*` · `docs/architecture/editor_ux_v2_plan.md` · `docs/constitution/DESIGN_DNA.md` · `.agents/rules/{design-dna,ui-components}.md`.

## Verificação (fim a fim, por fase)

1. `npm run typecheck:changed` (o `npm run build` não checa tipos).
2. `npm run test:proposals` (28 casos atuais + novos da fase).
3. Harness `natal-qa.local/index.html?panel=1&mode=edit` (variantes `?pricing=`, `?groups=`, `?view=mobile`): percurso das tarefas T1–T4 e checklist de DNA; capturas antes/depois em 1280 px e 375 px.
4. Conferir `git diff`: nenhuma mudança em `useMaterialEditor.ts`, em `PublicProposalViewer.tsx` ou em migrações SQL.

---

## Status das fases

| Fase | Status |
|---|---|
| F0 Medição (harness `natal-qa.local/panel.html`, baseline abaixo) | ✅ 2026-10-14 |
| F1 Higiene: 9 `showIf` sem efeito (E17), título composto (E11), rótulos de preço (E12), `hover:bg-accent` ×5 (E21), a11y rápida (E22), halo em token (E14), X do Sheet (E13); caso 29 em `test:proposals` | ✅ 2026-10-14 (não commitada) |
| F2 Estados e largura: `EditorColumns` (3 colunas + alças), painel montado 1× via `useResponsiveMode` (E8), grupo aberto/item aberto/linha ativa com estado visível, `EYEBROW` único, inputs `h-9`, Sheet de propriedades até 400 px, "item fixado" registrado no DNA | ✅ 2026-10-14 (não commitada) |
| F3 Textos sem duplicidade: `onCanvas`/`longform` no schema (`editedOnCanvas`), grupo Textos = dica + "Editar como formulário · n" recolhido (abre sozinho com `pointer: coarse`, lembra a escolha), longos e A′ visíveis, IA preservada; caso 30 em `test:proposals` | ✅ 2026-10-14 (não commitada) |
| F4 Lista → detalhe: árvore de grupos/pacotes (`PackageGroupsField`), página de detalhe (`panel/ItemDetail`: voltar, ↑/↓, ⋯ duplicar/mover/remover, Esc), formulário por afinidade, memória por seção (`PanelMemory` na página), scroll-spy pausado com detalhe aberto, edição por `id` (`pricing.ts`, `inspectorFocus.ts`); adicionais e depoimentos usam o mesmo detalhe; caso 31 em `test:proposals` | ✅ 2026-10-14 (não commitada) |
| F5 Fixado (1 item): `panel/PinnedBar`, `usePin` (localStorage por `materialId`), `resolvePin`; botão no detalhe, ⋯ das linhas e ⋮ da seção; fixar outro substitui; ir ao item de qualquer seção; caso 32 em `test:proposals` | ✅ 2026-10-14 (não commitada) |
| F6 Seleção arte ↔ painel: âncoras `data-item`/`data-selected` por `id` (`useItemAnchor`, só no editor) nos 7 layouts de pacote, 3 composições do cabeçalho de grupo e 2 de adicionais; clique no cartão abre o detalhe; contorno grafite; abrir detalhe rola a arte (`nearest`). **Sem consolidar os `et()` nem `path` no `EditableText`**: a delegação por âncora dispensou | ✅ 2026-10-14 (não commitada) |
| F7 (opcional): atalho "Editar na arte", IA no balão de texto, arrastar pacote entre grupos | ⏸ não feita: depende de H1/H2 (descoberta do duplo clique e edição por toque), que só o uso real valida; "Mover para" já cobre mudar de grupo |

## Baseline medido (F0)

Harness `natal-qa.local/panel.html` (EditorSidebar + VisualRenderer + PropertiesSidebar reais, sem login/banco), modelo "Sessões de Natal", seção "Tabela de Preços" com 2 lotes × 3 pacotes, painel de 340 px.

| Medida | Valor |
|---|---|
| Altura útil da rolagem do painel (janela 1440×900, sem o header global do app) | 777 px |
| Cartão do grupo aberto (8 campos + lista de 3 pacotes + importar) | **863 px** |
| Cartão do pacote aberto (10 campos) | **1 074 px** |
| Largura útil do campo: grupo / pacote (E1) | 281 px / **257 px** (de 308 px disponíveis no nível 1) |
| Posição do pacote vizinho: antes → depois de abrir o anterior (E2) | 919 px → **1 958 px** (empurrado ~1 040 px) |
| Altura total do conteúdo do painel com 1 pacote aberto | 2 549 px (≈ 3,3 telas) |
| X do Sheet × ⋮ do cabeçalho (E13) | **sobrepostos**: X em (671, 14) 14×14 dentro do ⋮ em (657, 14) 29×29 |
| Escala do canvas em 1024 px (H5) | **0,55** (piso); canvas de 398 px para documento de ~507 px (a casca real tira mais ~58 px da sidebar global) |

Hipóteses H1–H4, H6–H7 seguem abertas (dependem de uso real / varredura de `material_versions`).

## Achado confirmado (fora do escopo): coalescência do undo

`useMaterialEditor.ts:57-59` troca o último `past` pelo `present` quando a edição coalesce. Reprodução da lógica: rajada de digitação A → AB → ABC → ABCD com `past = [Z]` termina em `past = [Z, ABC]`; o 1º Ctrl+Z volta a ABC (uma tecla) e o estado A (anterior à rajada) se perde. Correção provável: manter `past` inalterado quando `coalesce` (`past: state.past`), com teste. Não aplicada: muda o histórico de todo o editor.
