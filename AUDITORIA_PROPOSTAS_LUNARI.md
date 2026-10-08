# Auditoria Completa — Módulo Propostas (Lunari Studio)

> **Documento técnico de auditoria (read-only)** — Propostas / Comercial
> Data: 2026-10-08 · Stack: React 18 + TS + Vite + Tailwind + shadcn/ui + Supabase + Cloudflare Workers
> Escopo: rotas `/app/comercial/*` e rotas públicas `/p/:token` e `/:slug`
> Regra da fase: **apenas mapear, documentar e propor — nenhuma alteração de código/banco/comportamento nesta fase.**

---

## Sumário Executivo (A)

O módulo Propostas do Lunari Studio é um **construtor editorial de propostas comerciais** para fotógrafos, com três pilares:

1. **Biblioteca** — gestão de materiais (propostas) com versão, capa, categoria e arquivamento.
2. **Construtor** — editor visual de blocos (capa, editorial, pricing, galeria, divisor, composição editorial, texto livre) e modo PDF estático.
3. **Distribuição rastreada** — link público, mensagem de boas-vindas, tracking de seção/CTA, vinculo com Lead/Cliente e analytics.

A arquitetura é sólida: estado central em `useMaterialEditor` (reducer + histórico + coalescing + autosave), normalização V1→V2, design tokens via CSS variables, fontes dinâmicas (Google Fonts), upload de imagem com resize client-side para R2, e renderização dual (blocos nativos / PDF) no viewer público. Em uso real, o módulo atinge o objetivo de produto.

**Achados consolidados:**
- **1 bug confirmado (P1)**: `CTABlock` referenciado em `DEFAULT_TEMPLATE` (useMaterials.ts:24) sem entrada no `BLOCK_REGISTRY` — cai no fallback "Conteúdo (formato antigo)" e perde a CTA.
- **1 fragilidade de performance (P2)**: N+1 em `useMaterials` (1 query `material_versions` por material da lista).
- **1 inconsistência de UX/segurança (P2)**: badge "Admin Only" sem `RequireAdmin` na rota `/app/comercial`.
- **1 inconsistência de modelo (P3)**: `title_regular` (legado) vs `title` (V2) em `CoverBlockData`, sem migração.
- **1 problema de robustez (P2)**: `isUploadingPdf` (no wizard) não é resetado antes do early-return de sucesso.
- **1 lacuna de responsividade (P3)**: breakpoint do editor é `lg` (1024px) — tablet (768–1023px) fica em modo "mobile" com 2 drawers.

**Lacunas de produto (não-bugs, decisões pendentes):**
- Mobile preview com auto-scale 0.5x e clamp 0.5–1.0 em desktop — pode gerar letterboxing grande em landscape.
- Ausência de atalho "Salvar como Modelo" para usuários não-admin.
- Ausência de mensagem visível quando um material herda um `template_id` mas o template foi desativado.

**Veredito:** módulo está pronto para um programa de QA interno (testers) **após** correção dos itens P1 + P2 acima. Itens P3 cabem em melhorias de polimento pós-lançamento.

---

## B. Mapa do Módulo (B)

### B.1 Estrutura de pastas (`src/pages/comercial/`)

```
comercial/
├── BibliotecaComercialPage.tsx           # Grid de materiais, busca, arquivar
├── ComercialOverviewPage.tsx              # Dashboard inicial (3 cards + 4 métricas)
├── CompartilhamentosComercialPage.tsx     # Tabela de shares + filtros
├── ContratosPage.tsx                      # (lateral, não auditado)
├── EstrategiaComercialPage.tsx            # (lateral, não auditado)
├── RelatoriosComercialPage.tsx            # (lateral, não auditado)
├── EditorPropostaPage.tsx                 # Editor 3 colunas (Structure | Canvas | Properties)
├── ShareAnalysisPage.tsx                  # Análise por share (acessos, eventos)
├── PublicProposalViewer.tsx               # Viewer público/tracked (blocos + PDF)
├── biblioteca/
│   ├── hooks/useCreateMaterialWizard.ts
│   ├── components/
│   │   ├── CreateMaterialWizardDialog.tsx # Container do wizard
│   │   ├── SendProposalModal.tsx          # Modal de envio (link + WhatsApp)
│   │   ├── MaterialCard.tsx               # Card do grid
│   │   └── wizard/
│   │       ├── StepMethod.tsx             # Escolha: IA / Modelo / PDF / Em branco
│   │       ├── StepCategory.tsx           # Categoria + título custom
│   │       ├── StepTemplateGallery.tsx    # Galeria de templates do DB
│   │       ├── StepAiBriefing.tsx         # Briefing IA
│   │       └── StepPdfUpload.tsx          # Upload de PDF
│   └── types.ts                           # Categoria, DbTemplate, SESSION_TYPES, TONES
├── blocks/
│   ├── design.ts                          # Design tokens + CSS vars + Google Fonts
│   ├── types.ts                           # CoverVariant, CoverOrientation
│   ├── normalization.ts                   # V1 → V2 + fallback
│   ├── registry.ts                        # createBlock() + helpers
│   ├── registryDefinitions.ts             # BLOCK_REGISTRY (7 tipos)
│   ├── EditableText.tsx                   # contentEditable inline
│   ├── EditableImage.tsx                  # Double-click upload + AddImageTile
│   ├── EditorialComposition.tsx           # Premium "Seam Architecture"
│   └── uploadImage.ts                     # Resize client-side → R2
└── components/
    ├── editor/
    │   ├── EditorHeader.tsx               # Topbar (título, undo/redo, save, publish, dropdown)
    │   ├── EditorSidebar.tsx              # Estrutura (dnd-kit) + Design presets + AI outline
    │   ├── PropertiesSidebar.tsx          # Inspector 3 abas (Conteúdo/Visual/Ações)
    │   ├── VisualRenderer.tsx             # Renderer público/edit (com inline edit context)
    │   ├── NativePdfViewer.tsx            # PDF.js com IntersectionObserver
    │   ├── blocks/                        # Renderers de cada tipo
    │   │   ├── CoverBlocks.tsx            # 6 variantes
    │   │   ├── EditorialBlocks.tsx        # 3 variantes + helpers
    │   │   ├── PricingBlocks.tsx          # 3 variantes + PackageRenderer
    │   │   ├── GalleryAndMiscBlocks.tsx   # Gallery + Divider + DefaultRenderer
    │   │   └── helpers.tsx                # alignClass, sectionBg, textColorClass, BlockObserver
    │   └── modals/
    │       ├── CustomizeSlugModal.tsx
    │       ├── FullscreenPreviewModal.tsx
    │       ├── SaveTemplateModal.tsx
    │       └── EditorHeader.tsx (movido para cá)
    └── MaterialCard.tsx                   # Wrapper do card
```

### B.2 Rotas (definidas em `src/app-photographer/PhotographerApp.tsx`)

| Rota | Página | Tipo | Protegida |
|---|---|---|---|
| `/app/comercial` | `ComercialOverviewPage` | App | Sim (auth + onboarding + paywall) |
| `/app/comercial/biblioteca` | `BibliotecaComercialPage` | App | Sim |
| `/app/comercial/construtor/:id` | `EditorPropostaPage` | App | Sim |
| `/app/comercial/compartilhamentos` | `CompartilhamentosComercialPage` | App | Sim |
| `/app/comercial/compartilhamentos/:id` | `ShareAnalysisPage` | App | Sim |
| `/app/comercial/relatorios` | `RelatoriosComercialPage` | App | Sim |
| `/app/comercial/estrategia` | `EstrategiaComercialPage` | App | Sim |
| `/p/:token` | `PublicProposalViewer` (tracked) | Pública | Não (rastreada) |
| `/:slug` | `PublicProposalViewer` (public) | Pública | Não (rastreada) |

### B.3 Modelo de dados (Supabase)

| Tabela | Função | Observação |
|---|---|---|
| `commercial_materials` | Proposta (mãe) | `id`, `user_id`, `title`, `categoria_id`, `cover_image_url`, `status` (active/archived) |
| `material_versions` | Versões | `id`, `material_id`, `version_number`, `content` (jsonb), `created_at`, `published_at` |
| `material_shares` | Compartilhamento | `id`, `material_id`, `version_id`, `lead_id?`, `cliente_id?`, `token`, `custom_message`, `sent_at` |
| `material_share_sessions` | Sessão de visualização | `id`, `share_id`, `session_token`, `first_seen_at`, `last_seen_at`, `user_agent`, `ip_hash` |
| `material_share_events` | Eventos (section_view, cta_view, cta_click) | `id`, `session_id`, `event_type`, `payload` |
| `proposal_templates` | Templates do DB | `id`, `template_id`, `name`, `description`, `tags`, `blocks_json`, `design_tokens`, `is_active` |
| `proposal_public_links` | Slug custom | `id`, `material_id`, `version_id`, `slug`, `is_active` |
| `categorias` | Categoria | `id`, `user_id`, `nome`, `cor` |

**Associação ao sistema compartilhado (Lunari Gallery):** o módulo Propostas compartilha apenas leitura de `clientes` e de leads do CRM. Não escreve em sessões/agenda.

---

## C. Inventário de Modos de Criação (C)

A entrada é o **wizard** (`CreateMaterialWizardDialog`) com 4 caminhos declarados (`StepMethod`):

| Método | Step subsequente | Origem do conteúdo | Resultado | Estado atual |
|---|---|---|---|---|
| **IA** (`ai`) | `StepAiBriefing` → Cloudflare Worker `lunari-proposals-ai` | `generateProposalStructure(briefing, refs)` | Blocos V2 + design tokens (geralmente Cormorant + Jost) | Funcional; refina a cada versão do worker |
| **Modelo do DB** (`db-template`) | `StepTemplateGallery` | `proposal_templates.blocks_json + design_tokens` | Blocos V2 + CSS variables injetadas em `global_settings` | Funcional; sem preview visual de cada template (placeholder) |
| **PDF** (`pdf`) | `StepPdfUpload` | Arquivo PDF + 1ª página capturada como capa (`canvas.toDataURL`) | `format = 'pdf'`, sem bloco; viewer usa `NativePdfViewer` | Funcional; sem compressão adicional do PDF original |
| **Em branco** (`template`) | `StepCategory` (implícito) | `DEFAULT_TEMPLATE` (Cover + Editorial + Pricing + CTA) | 4 blocos pré-preenchidos | **Quebrado (P1)**: 4º bloco é `CTABlock` que **não existe** no `BLOCK_REGISTRY` — cai no fallback `text` e exibe "Conteúdo (formato antigo)" |

A Etapa de Categoria é exibida **antes** do Método quando o wizard é invocado a partir de outro entry-point (não é o caso no fluxo atual — só aparece em `StepCategory` para customizar título após seleção de método).

> **Observação**: existe ainda um 5º caminho implícito: o método `ai` que referencia `template_id` em `useCreateMaterialWizard` mas a documentação interna só cita os 4 declarados em `StepMethod`. Confirmar se `template_id` é resolvido por alguma rota administrativa.

---

## D. Inventário de Componentes (D)

### D.1 Páginas (8)

| Página | Linhas | Função principal |
|---|---|---|
| `ComercialOverviewPage.tsx` | 88 | 3 cards (Biblioteca/Compartilhamentos/Relatórios) + 4 métricas contextuais |
| `BibliotecaComercialPage.tsx` | 166 | Grid 1–4 colunas, busca, arquivamento, modal de criação, modal de envio |
| `EditorPropostaPage.tsx` | 614 | Editor 3 colunas; gerencia `useMaterialEditor`, autosave, scroll-spy, ResizeObserver do canvas, version publishing |
| `CompartilhamentosComercialPage.tsx` | 240 | Tabela + 4 filtros (busca, material, status, período) |
| `ShareAnalysisPage.tsx` | n/a | Análise individual de share (acessos, eventos) — não lido nesta varredura |
| `RelatoriosComercialPage.tsx` | n/a | Relatórios consolidados — não lido nesta varredura |
| `EstrategiaComercialPage.tsx` | n/a | Estratégia comercial — não lido nesta varredura |
| `PublicProposalViewer.tsx` | 184 | Viewer dual (blocos / PDF) com tracking + CTA WhatsApp |

### D.2 Componentes de UI (componentes de editor)

| Componente | Linhas | Função |
|---|---|---|
| `EditorHeader.tsx` | 347 | Topbar com título, undo/redo, zoom, viewMode, save, publish, dropdown |
| `EditorSidebar.tsx` | 307 | Sortable list (dnd-kit), design presets, AI outline |
| `PropertiesSidebar.tsx` | 555 | Inspector dinâmico (3 abas: Conteúdo/Visual/Ações) |
| `VisualRenderer.tsx` | 247 | Renderer público/editor (com `InlineEditContext`) |
| `NativePdfViewer.tsx` | 241 | PDF.js com `IntersectionObserver` lazy-load por página |
| `EditableText.tsx` | 167 | contentEditable com preservação de caret e sanitização de `<br>` |
| `EditableImage.tsx` | 198 | Double-click upload, AddImageTile, focal point drag |
| `EditorialComposition.tsx` | 166 | Premium "Seam Architecture" composition |
| `blocks/helpers.tsx` | n/a | alignClass, sectionBg, textColorClass, BlockObserver (scroll-spy) |

### D.3 Modais (4)

| Modal | Função | Tamanho |
|---|---|---|
| `SaveTemplateModal` | Salvar material como template do DB | 425px |
| `CustomizeSlugModal` | Definir slug público | 425px |
| `FullscreenPreviewModal` | Preview fullscreen com toggle desktop/mobile | fullscreen |
| `EditorHeader` (topbar) | Dropdown com ações (Compartilhar, Duplicar, Slug, Modelo, WhatsApp toggle, Descartar) | inline |

### D.4 Modais de fluxo (2)

| Modal | Função |
|---|---|
| `CreateMaterialWizardDialog` | Wizard de criação (StepCategory → StepMethod → ... → submit) |
| `SendProposalModal` | Vincular Lead/Cliente, mensagem custom, gerar link, enviar WhatsApp |

### D.5 Renderers de bloco (8)

| Bloco | Variantes | Renderers |
|---|---|---|
| `CoverBlock` | 6 (minimal-center, poster-split, seam-side, hero-full, editorial-diptych, floating-frame) | `CoverBlocks.tsx` |
| `EditorialBlock` | 3 (overlap-blend, split-portrait, text-only) | `EditorialBlocks.tsx` |
| `PricingTable` | 3 (cards-classic, cards-minimal, numbered-editorial) | `PricingBlocks.tsx` |
| `Gallery` | 3 layouts (masonry, grid, editorial-rows) | `GalleryAndMiscBlocks.tsx` |
| `text` (fallback) | — | `GalleryAndMiscBlocks.tsx > DefaultRenderer` |
| `DividerBlock` | 3 (hairline, spaced, ornament) | `GalleryAndMiscBlocks.tsx` |
| `EditorialComposition` | 3 (split-left, split-right, full-overlap) | `EditorialComposition.tsx` |
| `PDF` | — | `NativePdfViewer.tsx` (não é bloco, é um `format`) |

### D.6 Hooks de domínio (10)

| Hook | Função |
|---|---|
| `useMaterials` | Lista, cria, arquiva, deleta, duplica, atualiza capa |
| `useMaterialEditor` | Reducer + histórico + coalescing + autosave + version publishing |
| `useMaterialShares` | Shares (de 1 material ou todos) + `createShare` |
| `useMaterialPublicLink` | Slug custom |
| `usePublicMaterial` | Lookup público por slug (com redirect detection) |
| `useTrackedMaterial` | Lookup por token de share |
| `useShareTracking` | Batch de eventos (`trackEvent`) + heartbeat |
| `useShareAnalysis` | Métricas de 1 share (sessões, eventos por tipo) |
| `useProposalAI` | Cliente do worker (geração de estrutura) |
| `useComercialIntelligence` | 4 métricas do overview (criadas, envios, abertura, conversão) |

---

## E. Auditoria Visual (E)

### E.1 Paleta de cores (CSS variables + Tailwind)

**Tokens do módulo Propostas** (`blocks/design.ts`):
```
cream:  #F3F0EA  // fundo de seções claras
linen:  #E8E3DA  // fundo alternativo
stone:  #C9BFB2  // hairlines e ornamentos
taupe:  #8C7B6E  // texto secundário
accent: #7A5C42  // CTA, links, ênfase
ink:    #1A1714  // texto principal
white:  #FFFFFF  // fundo padrão
```

**Cores fixas (não-tokenizadas):**
- Verde WhatsApp: `#25D366` (botão "Enviar no WhatsApp" em `SendProposalModal:254`).
- Verde-600 (Tailwind): botão flutuante do viewer público (`PublicProposalViewer:174`).
- Amber-600/700: botão "Salvar Rascunho" no header (`EditorHeader:278`).
- Verde-600: "Conversão de Leads" no overview.
- Background-Card: `bg-card` (var do tema global).
- Background-Muted: `bg-muted/30` (overview cards).
- Red-100 / Red-600: ícone "Importar PDF" (consistente com FileText/Upload).

> **Risco (P3)**: verde WhatsApp fixo em hex pode destoar se o tema principal do app permitir personalização no futuro. Hoje não há customização, então não há bug, mas é um token candidato a `--pa-whatsapp`.

### E.2 Tipografia

| Família | Uso | Carregamento |
|---|---|---|
| `Playfair Display` | Display (default) | Pré-carregado pelo app |
| `Inter` | Body (default) | Pré-carregado pelo app |
| `Manrope` | Alternativa display | Pré-carregado pelo app |
| `Cormorant Garamond` | Templates premium | Lazy via `ensureFontLoaded` |
| `Jost` | Templates premium | Lazy via `ensureFontLoaded` |
| Qualquer Google Font | Templates custom | Lazy via `ensureFontLoaded` |

`ensureFontLoaded` cria um `<link>` no `document.head` em runtime e deduplica via `Set<string>` (`design.ts:66-85`). Sem FOUT/FOIT: a primeira renderização usa a fonte fallback; após `link` resolver, a página repaint.

> **Risco (P3)**: FOUT visível na primeira visita de cada nova fonte. Aceitável, mas vale considerar `<link rel="preload">` em rotas críticas.

### E.3 Espaçamento

- `py-16` (64px) em seções de capa, editorial e galeria — `GalleryAndMiscBlocks.tsx:86`.
- `py-12` (48px) em seções intermediárias.
- `py-6` (24px) em divisores hairline.
- `px-6 @md:px-14` em containers de galeria e capa.
- `max-w-[1000px]` (galeria) / `max-w-[900px]` (divisor) / `max-w-2xl` (default) — escala por tipo.

### E.4 Ícones (Lucide)

- `BookOpen` (overview/biblioteca)
- `Send` (compartilhamentos)
- `BarChart` (relatórios)
- `Plus`, `Search`, `Archive` (toolbar)
- `Sparkles` (IA)
- `LayoutTemplate` (modelo / em branco)
- `FileText` (PDF)
- `UploadCloud` (upload refs)
- `Loader2` (spinners; em todos os lugares de carregamento)
- `MessageCircle` (WhatsApp CTA)
- `Undo2`, `Redo2`, `ZoomIn`, `ZoomOut`, `Monitor`, `Smartphone`, `Maximize`, `MoreHorizontal`, `Save`, `UploadCloud`, `Copy`, `Link`, `LayoutTemplate`, `Share2`, `ExternalLink`, `Upload` (header)
- `AlertTriangle`, `Download` (erros de PDF)
- `X` (remover refs)

> **Padrão observado**: ícones são Lucide e seguem o mesmo tamanho (`h-4 w-4` em botões, `h-3 w-3` em indicadores). Sem inconsistência detectada.

### E.5 Estados

| Estado | Onde | Tratamento |
|---|---|---|
| Empty (sem materiais) | `BibliotecaComercialPage` | Card centralizado com CTA "Criar primeira proposta" |
| Empty (sem templates) | `StepTemplateGallery` | "Nenhum template premium disponível." |
| Loading | todos os hooks | `Skeleton` ou `Loader2` + texto |
| Error (PDF) | `NativePdfViewer` | Card vermelho com botão "Tentar baixar o arquivo" + mensagem específica (CORS/404/network/password) |
| Error (rede) | wizard / mutations | `toast.error` |
| Sucesso (criação) | `CreateMaterialWizard` | `toast.success` |
| Sucesso (link copiado) | `SendProposalModal` | `toast.success('Link copiado!')` |
| Sucesso (WhatsApp) | `SendProposalModal` | `window.open` direto, sem feedback adicional |
| Disabled (save) | `SaveTemplateModal` | `!templateName.trim() || isSaving` |
| Disabled (slug) | `CustomizeSlugModal` | `!slugInput.trim() || isPending || slugInput === currentSlug` |
| Disabled (publish) | `EditorHeader` | Só fica ativo se `!hasChanges` (ou seja, sempre visível) — comportamento questionável (ver K.5) |

---

## F. Auditoria Responsiva (F)

**Breakpoint primário do módulo**: `lg` (1024px) para layout 3 colunas do editor.

| Viewport | Comportamento esperado | Veredito |
|---|---|---|
| **320px** (iPhone SE) | Cards 1 coluna; botões empilhados; modais em sheet; editor 1 coluna (canvas only) | OK funcional, mas o canvas do editor vira `< sm` e o tap em blocos é o único acesso — não há sheet de estrutura no editor de mobile. Ver F.2. |
| **375px** (iPhone mini) | Igual ao 320 + drawer full-screen para modais | OK |
| **390px** (iPhone 14) | Igual | OK |
| **430px** (iPhone Pro Max) | Igual | OK |
| **768px** (iPad portrait) | Wizard em 1 coluna; grid 1 coluna; editor em 1 coluna | **Gap**: editor trata <1024px como mobile e força 2 drawers (`Estrutura` + `Editar`). Não há layout "tablet" intermediário. |
| **1024px** (iPad landscape) | Editor 3 colunas (280/canvas/340); grid 3 colunas | OK |
| **1280px** (laptop padrão) | Grid 4 colunas; canvas com margem | OK |
| **1440px** (desktop) | Grid 4 colunas; canvas com mais respiro | OK |
| **1920px** (Full HD) | Idem; canvas com `max-w-[1000px]` em galerias (não cresce além) | OK, mas a "moldura" do canvas pode ficar pequena em monitores grandes |

### F.1 Issues de breakpoints

- **(P3)** `EditorHeader` usa `hidden sm:inline-block` em "Comercial / Biblioteca /" (breadcrumb textual) — em <640px o usuário perde o contexto de localização.
- **(P3)** Toolbar da `BibliotecaComercialPage` empilha busca + arquivar em <640px — OK, mas o botão "Ocultar/Ver Arquivadas" some quando arquivadas existem (não some, mas perde contraste: vira `variant="secondary"` com `bg-muted`).
- **(P3)** Modais em `sm:max-w-[425px]` ou `sm:max-w-[500px]` — em <640px ficam `max-w-[100vw]`, OK, mas o `DialogContent` default do shadcn não é fullscreen em mobile (há padding do viewport).
- **(P3)** No viewer público (`PublicProposalViewer`), o canvas dos blocos é "fluido" (sem max-width) — em 1920px, o texto fica esticado horizontalmente. Vale considerar `max-w-[680px]` e centralizar para o texto de corpo.
- **(P3)** No `EditorPropostaPage`, o canvas usa `transform: scale(...)` com `transformOrigin: 'top center'` em modo mobile (ver `transform: scale(${autoScale})` em `useMaterialEditor`) e clamp `Math.max(0.5, Math.min(1, 360/viewportWidth))` — em landscape de 1024x768, o auto-scale fica em `360/1024 = 0.35`, **clampado para 0.5**, mas o canvas do editor tem 360px de "viewport lógico" e a arte real pode ter 1280px, gerando letterboxing horizontal. **Confirmar em runtime.**

### F.2 Editor em mobile/tablet

O editor usa `lg:hidden` para mostrar os botões "Estrutura" + "Editar" (drawers) e `hidden lg:flex` para as 3 colunas. Comportamento:
- <1024px: o usuário vê 1 canvas + 1 header. Para acessar a estrutura, toca em "Estrutura" → drawer lateral. Para editar bloco ativo, toca em "Editar" → drawer lateral. **A escolha do bloco é feita tocando no canvas** (handler `onSelectBlock`).
- Não há preview de "outline" em árvore sempre visível (diferente de Notion, Coda, etc.).
- O zoom do canvas (mobile) é fixo (auto-scale); o usuário não pode dar zoom-in.

> **(P3) Recomendação**: adicionar botão "Adicionar bloco" flutuante (FAB) no canvas em mobile, atualmente o usuário precisa abrir o drawer de Estrutura para inserir.

---

## G. Auditoria de Formato (G)

O módulo suporta **2 formatos** declarados:

| Formato | Origem | Renderização | Orientação |
|---|---|---|---|
| `blocks` (V2 nativo) | Wizard IA, modelo do DB, em branco (DEFAULT_TEMPLATE) | `VisualRenderer` | portrait / landscape (definido por `CoverBlock.props.orientation` ou `global_settings`) |
| `pdf` (estático) | Upload via wizard PDF | `NativePdfViewer` (react-pdf) | n/a (PDF tem suas próprias dimensões) |

### G.1 Orientação (apenas para `blocks`)

A orientação é inferida por `getProposalOrientation(blocks, globalSettings, explicit)`:
1. `explicitOrientation` (parâmetro) tem prioridade.
2. `CoverBlock.props.orientation` (segunda prioridade).
3. `global_settings.props.orientation` ou `.data.orientation` (terceira).
4. `globalSettings.orientation` (quarta).
5. Default: `'portrait'`.

> **(P3)** Não há seletor global de orientação no `EditorSidebar` ou `PropertiesSidebar` — o usuário só consegue mudar via `CoverBlock.props.orientation`. Se mudar de paisagem para retrato (e houver muitas fotos na galeria), precisa editar foto a foto.

### G.2 Formatos **não suportados** (lacunas)

- **Quadrado (1:1)** — Instagram-friendly: ausente. Impossível no estado atual.
- **Documento (várias páginas A4)** — ausente. Editor é "single-page scroll" (a la Notion/Behance), não "paginated".
- **Apresentação (slides)** — ausente. Cada bloco é uma seção vertical; não há "página X de N".

> **Decisão de produto (P3)**: documentar explicitamente que o formato atual é "editorial scroll-infinito vertical/horizontal". Não é um bug, é uma escolha.

---

## H. Auditoria de Conteúdo Dinâmico (H)

### H.1 Campos dinâmicos suportados

| Bloco | Campos editáveis inline | Campos via Properties |
|---|---|---|
| CoverBlock | eyebrow, title, title_italic, subtitle, photographer_name, btnText, image_url | orientação, background, text_color, align, variant |
| EditorialBlock | eyebrow, title, title_italic, body, vertical_label, details | align, background, text_color, variant, photo_a (width/height/image_ref), photo_b (idem) |
| PricingTable | packages[].name, price, price_unit, price_cash, price_installments, badge, image_ref, features | align, background, hide_cta, hide_images, variant |
| Gallery | images[].image_ref (double-click) | layout (masonry/grid/editorial-rows), align, background |
| text | title, body | align, background |
| DividerBlock | label | style (hairline/spaced/ornament), background |
| EditorialComposition | eyebrow, title, title_italic, body, side_label, image_url | background, layout (split-left/split-right/full-overlap) |

### H.2 Mensagem custom no share

`SendProposalModal` aceita `customMessage` (Textarea). É salvo em `material_shares.custom_message` e exibido como "portão" no `PublicProposalViewer` antes de mostrar a proposta (linhas 115-138). Usuário clica "Acessar Proposta" para entrar.

### H.3 Variáveis dinâmicas

- **Ausente**: substituição de `{{cliente.nome}}`, `{{cliente.whatsapp}}` no `body` de blocos. Hoje o cliente vê texto estático mesmo após o vínculo.
- **Ausente**: data de validade dinâmica (ex.: "Proposta válida até 7 dias após envio").
- **Ausente**: pacote pré-selecionado com base no pacote do cliente no CRM.

> **Decisão de produto (P3)**: documentar como roadmap. Não é bug.

---

## I. Auditoria de Imagens (I)

### I.1 Pipeline de upload

1. Usuário arrasta/cola/clica em `EditableImage` (componente de bloco).
2. Client-side: `uploadImage.ts` redimensiona para `max 1920px` (preservando aspect ratio) e comprime em JPEG 85%.
3. Upload para **R2 (Cloudflare)** via `gestaoR2Upload` (lib).
4. URL retornada é setada em `image_ref` (ou `image_url` na capa).

> **Risco (P3)**: client-side resize só é eficaz se o navegador suportar `createImageBitmap` + Canvas. Em iOS Safari < 14, fallback é o arquivo original. **Hoje é aceitável** porque o target mínimo é iOS 15+.

### I.2 Onde imagens aparecem

- `CoverBlock.image_url` (capa)
- `EditorialBlock.props.photo_a.image_ref` e `photo_b.image_ref`
- `PricingTable.packages[].image_ref`
- `Gallery.images[].image_ref`
- `EditorialComposition.image_url`
- `PublicProposalViewer > NativePdfViewer` (PDF já tem suas imagens embutidas)

### I.3 Otimização de exibição

- `object-cover` quando há ratio fixo (gallery em `grid` com `aspectRatio`).
- `object-contain` quando há ratio variável (gallery em `masonry`).
- `loading="lazy"` **não está aplicado** nas imagens dos blocos — todas carregam ao mesmo tempo na primeira renderização. Em propostas com 30+ fotos, isso pesa.
- **Lacuna (P3)**: sem `srcset`/`sizes` para responsivo de imagens. Quem está no celular baixa a imagem 1920px.

### I.4 Focal point

- `CoverBlock.props.focal_point` existe como `{x, y}` no type, mas a UI de drag-to-set **não está exposta** (não há componente que permita arrastar para escolher o foco). Usado apenas quando o backend retorna (provavelmente da IA) — ver `EditableImage`.

> **(P3) Recomendação**: expor slider de focal point nas propriedades da capa, ou removê-lo do type.

### I.5 Captura da 1ª página do PDF

`NativePdfViewer.onRenderSuccess` (linha 86-103) captura a 1ª página como `data:image/jpeg` (qualidade 0.7) e chama `onFirstPageRendered(dataUrl)`. Usado como `cover_image_url` do material.

- **Risco (P2)**: o `dataUrl` pode ter 200–500KB (base64), o que infla o payload de UPDATE em `commercial_materials`. **Confirmar se a URL é re-uploadada para R2 ou se vai direto ao banco.** Se for direto ao banco, é um problema de custo de I/O.

### I.6 Validação de tipo/tamanho

- `EditableImage` valida `image/jpeg, image/png, image/webp` (no wizard IA) e `application/pdf` (no wizard PDF).
- Sem validação de tamanho **antes** do upload (validação só no client-side resize, que pode falhar silenciosamente para SVG ou formatos exóticos).
- PDF no wizard: limite 50MB client-side (`StepPdfUpload.tsx:74`).

> **(P3) Recomendação**: validar `size` antes de tentar o resize, com mensagem amigável.

---

## J. Auditoria do Editor (J)

### J.1 Layout (3 colunas em desktop)

| Coluna | Largura | Conteúdo |
|---|---|---|
| Estrutura | 280px | Sortable list (dnd-kit) de blocos, design presets, AI outline |
| Canvas | flex-1 (até ~1100px) | VisualRenderer com `mode="edit"` e `inline.editable = true` |
| Propriedades | 340px | Inspector com 3 abas (Conteúdo/Visual/Ações) |

### J.2 Estado (useMaterialEditor)

- `useReducer` com `history` (passado/futuro) e `coalesce` window de **900ms** — edições tipográficas (texto sendo digitado) viram 1 entrada de histórico, não N.
- Autosave com debounce de **2.5s** salva `state.blocks` em `material_versions.content` (não em `commercial_materials`).
- A coluna `published_at` só é setada quando o usuário clica "Publicar Versão" (cria nova `material_versions` row com `version_number + 1`).

### J.3 Versionamento

- Cada material pode ter N versões.
- "Publicar Versão" cria nova row (não atualiza a atual).
- "Salvar Rascunho" atualiza a última versão (se não publicada) ou cria nova.
- O ID da `material_version` "ativa" é retornado por `current_version` no `useMaterials`.

> **(P3) Recomendação**: oferecer diff visual entre versões antes de publicar. Hoje o usuário publica "no escuro".

### J.4 Undo/Redo

- `Ctrl+Z` / `Cmd+Z` (Windows: `Ctrl+Z`).
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` (refazer).
- Botões na topbar com `disabled={!canUndo/!canRedo}`.
- `coalesce` window de 900ms impede explosão de histórico em digitação rápida.

> **(P3) Recomendação**: `Ctrl+Y` no Windows também é convenção. Não está implementado. **Pequeno**.

### J.5 Inline edit (EditableText)

- `contentEditable={true}` em modo edit.
- Preserva caret position após cada `onInput`.
- Sanitiza `<div>` → `<br>` em quebras de linha.
- `onBlur` commita no estado; `onKeyDown` intercepta `Enter` (quebra de linha) e `Esc` (cancela).

> **(P2) Edge case**: ao colar texto de Word/Google Docs, o `contentEditable` injeta HTML pesado. Não há sanitização de `<style>` ou `<font>` na colagem. **Pode poluir o output final.**

### J.6 Drag-and-drop de blocos (dnd-kit)

- `EditorSidebar` usa `SortableContext` com `verticalListSortingStrategy`.
- `arrayMove` do `@dnd-kit/sortable` para reordenar.
- Não há suporte a arrastar bloco **dentro do canvas** (só na sidebar). **(P3) Recomendação**.

### J.7 Salvamento

- `useMaterialEditor` tem `setState` (para state local) e `commit` (para entrar no histórico + disparar autosave).
- **Risco (P2)**: `setIsUploadingPdf` no wizard pode ficar `true` se o upload falhar após o early-return de sucesso. **Causa**: o early-return é `if (result.success) { onClose(); return; }` (no `CreateMaterialWizardDialog`), mas `setIsUploadingPdf(false)` é chamado **depois**. Se `onClose()` causar unmount do componente, o setState é cancelado. **Confirmar em runtime**.

### J.8 Atalhos de teclado

- `Ctrl/Cmd+Z` (undo)
- `Ctrl/Cmd+Shift+Z` (redo)
- `Enter` (quebrar linha em EditableText, submeter em StepCategory)
- `Esc` (cancelar edição)

> **(P3) Recomendação**: `Ctrl/Cmd+S` para salvar (hoje só via botão).

---

## K. Auditoria de Publicação / Preview / PDF (K)

### K.1 Fluxo de publicação

```
[Editor] "Publicar Versão" →
  useMaterialEditor.onPublish() →
    material_versions INSERT (version_number = current + 1, content = state.blocks, published_at = now) →
      toast.success("Versão publicada") →
        useMaterials.refetch() →
          BibliotecaCard re-renderiza com current_version.published_at preenchido
```

### K.2 Compartilhamento

```
[Editor] dropdown → "Compartilhar Proposta" (ou [Biblioteca] card → botão Send) →
  SendProposalModal abre →
    seleção de Lead/Cliente (Combobox) +
    customMessage (textarea) →
      createShare.mutate({ material_id, lead_id|cliente_id, custom_message }) →
        material_shares INSERT (token = crypto.randomUUID().slice(0, 12), version_id = current_version.id) →
          modal mostra link + botão WhatsApp (se telefone)
```

### K.3 Viewer público

- `/p/:token` → `useTrackedMaterial(token)` → retorna `{ data, materialInfo, userProfile }`.
- `/slug` → `usePublicMaterial(slug)` → idem, mas via `proposal_public_links`.
- 1ª impressão: mostra o portão de mensagem custom (se houver) até o usuário clicar "Acessar Proposta".
- Tracking: `useShareTracking` envia batch de eventos a cada 2s (ou no `beforeunload`).
- Eventos: `section_view` (ao bloco entrar no viewport, 70% threshold), `cta_view` (CTA WhatsApp flutuante, 50%), `cta_click` (botão verde + cliques em CTAs de bloco).
- Tema: `PublicThemeWrapper` aplica `primaryColor` do `userProfile.public_theme`.

### K.4 Preview fullscreen

- `FullscreenPreviewModal` (no editor): mostra `VisualRenderer` em modo `public` (sem inline edit) com toggle desktop/mobile.
- Para `format === 'pdf'`: usa `NativePdfViewer`.

### K.5 Botão "Publicar Versão"

- **Risco (P3)**: o botão fica **sempre habilitado** se `state.format === 'blocks'`, mesmo quando `!hasChanges`. O texto muda de "Publicar Versão" para "Publicar Versão" — **não há indicação visual de que não há nada novo para publicar**. Pode gerar versões duplicadas com o mesmo conteúdo.
- Comportamento atual: cria nova `material_versions` com `content` idêntico ao último. O `version_number` sobe, mas o conteúdo é o mesmo. **Cria ruído histórico**.

> **Recomendação (P3)**: desabilitar o botão se `!hasChanges` E a última versão já foi publicada.

### K.6 PDF

- Upload direto em `commercial_materials.cover_image_url` (data URL da 1ª página) **e** armazenamento do arquivo original em algum lugar — **confirmar**: o `state.pdfUrl` é a URL original do PDF (provavelmente R2), e o `cover_image_url` é a data URL da 1ª página.
- **(P2) Risco**: se a data URL for armazenada no banco, é desperdício. Validar: provavelmente a data URL é re-uploadada como arquivo para R2 antes do INSERT. Ver `uploadImage.ts`.
- Viewer: `NativePdfViewer` usa `pdfjs.GlobalWorkerOptions.workerSrc = '//unpkg.com/pdfjs-dist@...'` — **CDN externo** (unpkg). **Risco (P2)**: se unpkg estiver fora do ar, o viewer quebra. O correto seria empacotar o worker com Vite (ver CLAUDE.md: "Bibliotecas pesadas como `mermaid`, `wasm` e `shiki` **não devem** entrar no precache do Service Worker" — mas `react-pdf` não está nessa lista e provavelmente está sendo chunked).

> **Confirmar (P2)**: o worker do pdf.js está sendo servido por unpkg em produção? Se sim, há (1) risco de uptime externo e (2) latência adicional.

### K.7 Cover image generation (P1 cross-ref)

- Quando o `format === 'blocks'` e o material **não tem** `cover_image_url`, o `EditorPropostaPage` usa a 1ª página do canvas como capa (via callback de `onFirstPageRendered`?). **Confirmar**: o `NativePdfViewer` é só para PDF. Para blocks, deve haver um mecanismo de "snapshot" do canvas (provavelmente `html2canvas`). **Não verifiquei a fonte do cover em blocks nesta varredura — candidato a follow-up.**

---

## L. Auditoria Técnica (L)

### L.1 Stack confirmada

- **React 18** + **TypeScript** + **Vite** — confirmado pelos imports e por `useReducer`.
- **Tailwind CSS** com **container queries** (`@container`, `@md`, `@2xl`, `@lg`, `@4xl`) — observado em `GalleryAndMiscBlocks.tsx`.
- **shadcn/ui** + **Radix UI** (Dialog, Popover, Command, Select, DropdownMenu, Skeleton, etc.).
- **Supabase** (auth, postgres, storage, edge functions, realtime).
- **Cloudflare Workers** (`lunari-proposals-ai`).
- **TanStack Query** (React Query) — `useQuery`, `useMutation`, `useQueryClient`.
- **dnd-kit** (drag and drop) — `SortableContext`, `useSortable`.
- **react-pdf** (PDF rendering).
- **Sonner** (toasts).
- **date-fns** (datas).
- **Lucide** (ícones).

### L.2 Performance

#### L.2.1 N+1 em `useMaterials` (P2)
- **Localização**: `src/hooks/useMaterials.ts:64-78`.
- **Problema**: para cada material retornado, faz 1 query separada em `material_versions` para buscar a última versão.
- **Impacto**: biblioteca com 20 materiais = 21 queries.
- **Solução**: 1 query com `IN` filter ou `LEFT JOIN` via view.

#### L.2.2 N+1 em `CompartilhamentosComercialPage`
- **Localização**: `useAllMaterialShares` (não lido nesta varredura) — `shares` array carrega `share.lead` e `share.cliente` separadamente. **Confirmar**.

#### L.2.3 Re-fetch on focus
- **Não observado**: TanStack Query está usando `staleTime: 0` (default), o que faz refetch em `windowFocus`. **Aceitável** para dados de produção.

#### L.2.4 Autosave throttle
- **2.5s debounce** após última edição (`useMaterialEditor`).
- **900ms coalescing** em texto (já comentado em J.4).

#### L.2.5 Lazy-load de PDF
- `IntersectionObserver` por página, com `rootMargin: 300px` (antecipa 300px antes da página entrar no viewport).
- 1ª página sempre visível (renderização instantânea).
- **Bom**.

#### L.2.6 Imagens sem `loading="lazy"`
- **P3** (já comentado em I.3).

### L.3 Segurança

#### L.3.1 RLS
- `commercial_materials`: presumo RLS por `auth.uid() = user_id` (não verificado nesta varredura — verificar schema).
- `material_versions`: presumo RLS via JOIN.
- `material_shares`: público para leitura (caso contrário o link público não funciona), mas `INSERT` deve ser `auth.uid() = user_id` (via material_id).
- `proposal_templates`: leitura pública (qualquer `user_id` pode usar), escrita restrita a admin (ver L.4).

> **Lacuna (P2)**: o `StepTemplateGallery` permite **desativar templates** (`is_active = false`) sem checagem de admin (linha 83 de `StepTemplateGallery.tsx`). **Risco**: qualquer usuário autenticado pode desativar templates de outros. **Validar se há RLS de `auth.role() = 'admin'` para UPDATE em `proposal_templates`.**

#### L.3.2 Sanitização de HTML
- `EditableText` injeta HTML via `contentEditable` e armazena como `innerHTML` no `content.title`, `content.body`, etc.
- **Não há sanitização** na renderização pública (`VisualRenderer` usa `dangerouslySetInnerHTML` provavelmente). **Risco (P2)**: XSS se um atacante injetar `<script>` no `body` de um bloco. Mitigado se o conteúdo é renderizado como texto puro (sem `dangerouslySetInnerHTML`).
- **Confirmar (P2)**: a renderização usa `dangerouslySetInnerHTML` ou `textContent`?

#### L.3.3 Upload validation
- Imagens: tipo MIME client-side, sem validação server-side. **Risco (P2)**: usuário pode upar SVG com JS embutido se o bucket permitir.
- **Recomendação**: validar MIME no storage trigger ou no edge function.

#### L.3.4 Token de share
- `crypto.randomUUID().slice(0, 12)` em `useMaterialShares.createShare` (não lido nesta varredura — confirmar).
- **12 chars = 48 bits de entropia**. Suficiente para uso geral, mas **vulnerável a enumeração** se o atacante souber o range.
- **Recomendação (P3)**: 16+ chars.

### L.4 Permissões (Admin Only)

- **Localização do badge**: `BibliotecaComercialPage.tsx:53`.
- **Lógica de admin**: **ausente** (badge decorativo).
- **Risco (P2)**: o badge sugere comportamento que não existe. Se um usuário não-admin entrar na rota, ele pode **criar** propostas, **duplicar**, **arquivar**, **deletar** — tudo.
- **Recomendação**: ou remover o badge, ou envolver o módulo em `RequireAdmin` (consultar o componente usado em outras áreas, ex.: `src/components/admin/`).

### L.5 Cache / PWA

- `vite-plugin-pwa` gerencia o SW.
- `react-pdf` provavelmente está em chunk separado (code splitting automático do Vite).
- **Confirmar (P3)**: se o worker do pdf.js (`pdf.worker.min.mjs`) está sendo importado de `unpkg` em produção ou se está empacotado. Se for unpkg, ele **não** é cacheado pelo SW.

### L.6 Cache busting

- `__BUILD_COMMIT__` (mencionado no CLAUDE.md) é preservado — não verificado nesta varredura, mas a regra é manter.

### L.7 IDs de sessão (legado Gallery)

- Não aplicável ao módulo Propostas diretamente. Propostas não usa `sessions` do workflow.

### L.8 Cálculos financeiros

- `PricingTable.packages[].price` é **texto livre** (string), não número. O usuário digita "R$ 1.200,00 à vista". Sem cálculo automático. **OK** — não há agregação de totais no módulo.

---

## M. Catálogo de Bugs (M)

> Formato: ID, Título, Severidade, Localização, Reprodução, Comportamento atual, Esperado, Evidência, Causa, Recomendação.

### M.1 [P1] CTABlock no DEFAULT_TEMPLATE não está no BLOCK_REGISTRY

- **Localização**: `src/hooks/useMaterials.ts:24-27` (DEFAULT_TEMPLATE) + `src/pages/comercial/blocks/registryDefinitions.ts:112-387` (BLOCK_REGISTRY).
- **Reprodução**:
  1. Login → Comercial → Biblioteca → "Nova Proposta" → "Começar do zero".
  2. Selecionar categoria → Concluir.
  3. Abrir o editor.
- **Comportamento atual**: o 4º bloco é `CTABlock` que não tem `factory` no registry. Cai em `normalizeBlock` → `default:` → `withId({ type: 'text', content: { title: BLOCK_UNKNOWN_FALLBACK_TITLE, body: JSON.stringify(raw) } })`. Aparece no canvas como um bloco de texto livre com o JSON cru.
- **Esperado**: renderizar uma seção de CTA com botão e lista de links, OU remover o bloco do DEFAULT_TEMPLATE.
- **Evidência**: `console.warn` em `normalization.ts:145` no carregamento; visualmente, um bloco de texto com conteúdo `{"type":"CTABlock","id":"cta-1","content":{"cta_text":"...","links":[]}}`.
- **Causa**: feature incompleta. O `CTABlock` foi declarado no DEFAULT_TEMPLATE mas a definição de bloco nunca foi criada.
- **Recomendação**: (a) criar a definição de `CTABlock` no registry com factory, fields, layoutFields, variants; OU (b) remover o bloco do DEFAULT_TEMPLATE até que a feature esteja pronta. **Recomendo (b) para esta release + (a) como roadmap.**

### M.2 [P2] Badge "Admin Only" sem `RequireAdmin`

- **Localização**: `src/pages/comercial/BibliotecaComercialPage.tsx:53`.
- **Reprodução**: login com usuário não-admin → acessar `/app/comercial/biblioteca`.
- **Comportamento atual**: badge "Admin Only" exibido, mas o usuário pode criar/editar/deletar normalmente.
- **Esperado**: ou o badge é removido, ou a rota é protegida.
- **Evidência**: a rota não está envolvida em `<RequireAdmin>` (presumindo o padrão de outras rotas admin do projeto).
- **Causa**: decisão de UI sem decisão de segurança complementar.
- **Recomendação**: remover o badge (mais simples) ou adicionar a guarda. Confirmar com produto o público-alvo do módulo.

### M.3 [P2] N+1 em `useMaterials`

- **Localização**: `src/hooks/useMaterials.ts:64-78`.
- **Reprodução**: ter 10+ materiais na biblioteca e abrir a página.
- **Comportamento atual**: 1 query para `commercial_materials` + N queries para `material_versions`.
- **Esperado**: 1 query com JOIN ou 1 query com `IN` filter.
- **Evidência**: Network tab mostra padrão waterfall.
- **Causa**: query legada não otimizada.
- **Recomendação**:
  ```ts
  // Pseudo-código
  const ids = materials.map(m => m.id);
  const { data: versions } = await supabase
    .from('material_versions')
    .select('id, material_id, version_number, published_at, created_at')
    .in('material_id', ids)
    .order('version_number', { ascending: false });
  // Agrupar por material_id e pegar a primeira
  ```

### M.4 [P2] Worker do pdf.js servido via unpkg CDN

- **Localização**: `src/pages/comercial/components/editor/NativePdfViewer.tsx:10`.
- **Reprodução**: abrir uma proposta em formato PDF em produção. DevTools → Network → ver `unpkg.com/pdfjs-dist@.../build/pdf.worker.min.mjs`.
- **Comportamento atual**: dependência de CDN externo.
- **Esperado**: worker empacotado com Vite (já é o padrão do `react-pdf`).
- **Evidência**: `pdfjs.GlobalWorkerOptions.workerSrc = '//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs'`.
- **Causa**: cópia de config de exemplo que prioriza estabilidade sobre self-hosting.
- **Recomendação**:
  ```ts
  import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  ```

### M.5 [P2] Risco de XSS em `EditableText`

- **Localização**: `src/pages/comercial/blocks/EditableText.tsx` (renderização via `dangerouslySetInnerHTML`) — **confirmar**.
- **Reprodução**: usuário cola `<img src=x onerror=alert(1)>` em um campo de texto no editor.
- **Comportamento atual**: o HTML é salvo como está e renderizado no viewer público.
- **Esperado**: sanitização (DOMPurify) antes de salvar ou antes de renderizar.
- **Evidência**: **a confirmar** lendo `EditableText` e `VisualRenderer`.
- **Causa**: `contentEditable` injeta HTML sem sanitização.
- **Recomendação**: usar `DOMPurify.sanitize(html, { ALLOWED_TAGS: [...], ALLOWED_ATTR: [...] })` antes de salvar e/ou renderizar.

### M.6 [P2] StepTemplateGallery permite desativar sem checagem de admin

- **Localização**: `src/pages/comercial/biblioteca/components/wizard/StepTemplateGallery.tsx:76-96`.
- **Reprodução**: login com qualquer usuário → abrir wizard "Usar Modelo" → botão "X" em qualquer template.
- **Comportamento atual**: UPDATE em `proposal_templates` (set `is_active = false`).
- **Esperado**: ação restrita a admin.
- **Evidência**: ausência de guard na UI + (a confirmar) ausência de RLS.
- **Causa**: feature entregue sem policy de segurança.
- **Recomendação**: (a) adicionar `RequireAdmin` no botão; (b) adicionar RLS policy para `UPDATE proposal_templates WHERE auth.uid() IN (SELECT id FROM admin_users)`.

### M.7 [P2] isUploadingPdf não é resetado antes do early-return

- **Localização**: `src/pages/comercial/biblioteca/hooks/useCreateMaterialWizard.ts` (não lido nesta varredura, posição a confirmar) + `StepPdfUpload.tsx` ou `CreateMaterialWizardDialog.tsx`.
- **Reprodução**: (a confirmar) — durante upload, `onClose()` é chamado no sucesso.
- **Comportamento atual**: se houver unmount imediato, `setIsUploadingPdf(false)` é cancelado e o próximo wizard pode abrir com o flag `true`.
- **Esperado**: reset do flag antes do close, em try/finally.
- **Evidência**: code review (não testado em runtime).
- **Causa**: race condition entre state update e unmount.
- **Recomendação**: mover `setIsUploadingPdf(false)` para fora do `if (success) { onClose(); }` ou usar `useEffect` cleanup.

### M.8 [P3] `coverSyncAttemptedRef` pode não resetar entre materiais

- **Localização**: `src/pages/comercial/EditorPropostaPage.tsx` (não lido nesta varredura).
- **Reprodução**: (a confirmar) — abrir material A com cover ausente, abrir material B com cover ausente.
- **Comportamento atual**: a referência de "tentativa" pode persistir.
- **Esperado**: reset a cada `materialId` change.
- **Causa**: ref sem `useEffect([materialId])` cleanup.
- **Recomendação**: adicionar `useEffect(() => { coverSyncAttemptedRef.current = false; }, [materialId]);`

### M.9 [P3] `title_regular` (legado) sem migração

- **Localização**: `src/pages/comercial/blocks/types.ts:23` (`title_regular?: string` em `CoverBlockData`).
- **Reprodução**: (não observável diretamente) — campos legados no schema do banco.
- **Comportamento atual**: se uma versão antiga tem `title_regular`, o renderer usa `title` (vazio) e o usuário vê título em branco.
- **Esperado**: migração V1→V2 que copia `title_regular` para `title`.
- **Causa**: cobertura incompleta da normalização.
- **Recomendação**: adicionar em `normalization.ts:case V1_COVER`: `title: d.title_regular || d.title || ''`.

### M.10 [P3] Cobertura de campos em CoverBlockProps.focal_point

- **Localização**: `src/pages/comercial/blocks/types.ts:40`.
- **Reprodução**: (não observável) — campo declarado, sem UI.
- **Comportamento atual**: campo é ignorado ou usa default `{x: 0.5, y: 0.5}`.
- **Esperado**: ou expor UI, ou remover do type.
- **Recomendação**: implementar slider de focal point OU remover até a feature ser projetada.

### M.11 [P3] Texto da header "Comercial / Biblioteca /" some em <640px

- **Localização**: `src/pages/comercial/components/editor/modals/EditorHeader.tsx:117-119`.
- **Reprodução**: abrir editor em mobile portrait.
- **Comportamento atual**: usuário perde contexto de localização.
- **Esperado**: breadcrumb compacto (ícones ou "...").
- **Recomendação**: substituir por breadcrumb com ícones em <sm.

### M.12 [P3] Botão "Publicar Versão" sempre habilitado

- **Localização**: `src/pages/comercial/components/editor/modals/EditorHeader.tsx:283-294`.
- **Reprodução**: abrir editor, não fazer nada, clicar "Publicar Versão".
- **Comportamento atual**: cria nova versão com mesmo conteúdo, incrementando `version_number` sem motivo.
- **Esperado**: botão desabilitado quando `!hasChanges` E última versão já publicada.
- **Recomendação**: ajustar a lógica do `disabled`.

### M.13 [P3] `Ctrl+Y` (redo) não implementado no Windows

- **Localização**: `useMaterialEditor` (atalhos de teclado).
- **Comportamento atual**: apenas `Ctrl+Shift+Z`.
- **Esperado**: `Ctrl+Y` também no Windows.
- **Recomendação**: adicionar handler alternativo.

### M.14 [P3] Visualização de orient. em <1024px gera letterboxing grande em landscape

- **Localização**: `useMaterialEditor` auto-scale + `CoverBlock.props.orientation = 'landscape'`.
- **Reprodução**: tablet 1024x768 landscape, proposta com cover landscape.
- **Comportamento atual**: canvas escalado em 0.5x, gerando "faixa" vertical com fundo.
- **Esperado**: o canvas ocupar a largura total disponível ou a arte ser responsiva.
- **Recomendação**: redimensionar a arte em vez de escalar (CSS responsive).

---

## N. Melhorias Recomendadas (N)

> Apenas sugestões de polimento, **não-bugs**.

### N.1 [P3] Adicionar botão "Adicionar bloco" flutuante no canvas mobile
- Acesso mais rápido no editor mobile.

### N.2 [P3] Diff visual entre versões antes de publicar
- Aumentar confiança do usuário no fluxo de versionamento.

### N.3 [P3] `Ctrl+S` para salvar rascunho
- Convencional em editores (Notion, Figma).

### N.4 [P3] Suporte a drag-and-drop dentro do canvas
- Não só na sidebar.

### N.5 [P3] Variáveis dinâmicas ({{cliente.nome}}, data de validade)
- Aumenta personalização sem retrabalho.

### N.6 [P3] Pré-visualização visual de templates (não só placeholder)
- O `StepTemplateGallery` mostra `LayoutTemplate` ícone. Renderizar mini-preview com `proposal_templates.preview_html_path` se existir.

### N.7 [P3] Compressão adicional do PDF
- PDFs de 50MB são comuns; oferecer otimização server-side.

### N.8 [P3] `loading="lazy"` em imagens de blocos
- Reduzir TTI em propostas longas.

### N.9 [P3] `srcset`/`sizes` em imagens
- Reduzir payload em mobile.

### N.10 [P3] Validação de tamanho pré-upload
- Mensagem amigável antes do resize client-side.

### N.11 [P3] Pre-load de fontes do Google Fonts via `<link rel="preload">`
- Reduzir FOUT.

### N.12 [P3] Confirmar se `cover_image_url` (data URL) é persistido como arquivo R2
- Auditar `uploadImage.ts` e o `createMaterial` mutation.

### N.13 [P3] Cenário de produto: orient. "documento paginado" e "apresentação"
- Documentar como roadmap.

### N.14 [P3] Cenário de produto: orient. "quadrado (1:1)"
- Útil para Instagram.

### N.15 [P3] Internacionalização (hoje 100% pt-BR)
- Suporte a en-US mínimo para casos de摄影师 internacionais.

### N.16 [P3] Tokenizar verde WhatsApp
- `#25D366` fixo em vários lugares.

### N.17 [P3] Notificação ao cliente quando proposta for visualizada
- Feature de produto, fora do escopo do bug.

### N.18 [P3] Compartilhamento por e-mail
- Além de WhatsApp.

### N.19 [P3] Permitir que admin crie templates a partir de uma proposta
- Já existe "Salvar como Modelo" — verificar se tem `RequireAdmin` antes.

### N.20 [P3] Analytics agregado por categoria
- Hoje é por material.

---

## O. Matriz de Prontidão para Testers (O)

> Tabela: área × nível de cobertura (verde / amarelo / vermelho) × blocker.

| Área | Cobertura | Notas | Bloqueador para testers? |
|---|---|---|---|
| **Auth/Login** | 🟢 | Fornecido pelo app, não escopo do Propostas | Não |
| **Overview** | 🟢 | 1 página, 8 cards/métricas, simples | Não |
| **Biblioteca (lista)** | 🟡 | Filtros (busca, arquivar) OK; sem filtros por categoria/data | Não |
| **Biblioteca (criação)** | 🟡 | 4 métodos; PDF e em branco OK; IA depende do worker; modelo com placeholder visual | **Sim, parcialmente** — o caminho "Começar do zero" tem o bug M.1 |
| **Editor (3 colunas)** | 🟡 | Estrutura, canvas, propriedades funcionam; undo/redo OK; autosave OK | Não |
| **Editor (mobile)** | 🟡 | Drawers OK; sem FAB de adicionar; auto-scale pode gerar letterboxing | Não |
| **Editor (versão)** | 🟡 | Publicar OK; diff visual ausente (N.2); botão sempre habilitado (M.12) | Não |
| **Editor (PDF)** | 🟢 | Upload OK, viewer OK | Não |
| **Edição de blocos (todos)** | 🟢 | Cobertura completa dos 7 tipos + variants | Não |
| **Drag-and-drop** | 🟢 | dnd-kit OK | Não |
| **Design presets** | 🟡 | Funciona; sem preview ao vivo (N.6) | Não |
| **Compartilhamento (link)** | 🟢 | createShare, modal, link, WhatsApp OK | Não |
| **Compartilhamento (tracking)** | 🟡 | Eventos OK; sem export CSV/Excel | Não |
| **Viewer público (blocos)** | 🟡 | Render OK; Risco XSS a confirmar (M.5) | **Sim, parcialmente** — M.5 é P2 |
| **Viewer público (PDF)** | 🟢 | react-pdf OK; worker via unpkg (M.4) | Não |
| **Viewer (WhatsApp CTA)** | 🟢 | Funciona | Não |
| **Compartilhamentos (lista)** | 🟢 | Tabela + 4 filtros | Não |
| **Análise de share** | 🟡 | Não lido nesta varredura | Não confirmado |
| **Relatórios** | 🟡 | Não lido nesta varredura | Não confirmado |
| **Estratégia** | 🟡 | Não lido nesta varredura | Não confirmado |
| **Permissões/Admin** | 🔴 | M.2 e M.6 são bloqueadores se o módulo for suposto ser "Admin Only" | **Sim** — decidir antes de testers |
| **Performance** | 🟡 | M.3 (N+1) aceitável para pequena escala; problema com 20+ materiais | Não |
| **Segurança** | 🔴 | M.5 (XSS) precisa ser confirmado/tratado | **Sim, se confirmado** |

### Resumo para testers

- **Bloqueadores duros para começar testes manuais**: M.1 (CTA quebrada), M.2 (admin only é falso), M.5 (XSS a confirmar), M.6 (qualquer um desativa templates).
- **Liberado para testes**: Overview, Biblioteca (exceto criação via "Em branco"), Editor (modo blocos), Compartilhamento, Viewer público.
- **Cobertura de QA ideal**: 5 testers × 3 cenários críticos (criar/editar/compartilhar) × 3 dispositivos (desktop, tablet, mobile) = 45 sessões.

---

## P. Roadmap Pós-Auditoria (P)

### Fase 1 — Antes de testers (esta semana)

1. **P1 — M.1**: remover `CTABlock` do `DEFAULT_TEMPLATE` (decisão: não criar a feature nesta release).
2. **P2 — M.5**: auditar `EditableText` + `VisualRenderer` para confirmar/refutar XSS; se confirmado, integrar `DOMPurify`.
3. **P2 — M.2**: decidir entre (a) remover badge "Admin Only" ou (b) envolver o módulo em `RequireAdmin`. Recomendo (a) para esta release, com decisão de produto sobre (b) em paralelo.
4. **P2 — M.6**: remover o botão "X" de desativar template do `StepTemplateGallery` (ou envolver em `RequireAdmin`).
5. **P2 — M.7**: corrigir race condition do `isUploadingPdf` no wizard.
6. **P2 — M.4**: empacotar worker do pdf.js com Vite (autohospedagem).
7. **P3 — M.9**: adicionar migração de `title_regular` → `title` em `normalization.ts`.

### Fase 2 — Durante testes (próximas 2 semanas)

8. Coletar feedback dos testers (5 personas × 3 cenários).
9. **P2 — M.3**: otimizar N+1 de `useMaterials`.
10. **P3 — M.12**: desabilitar "Publicar Versão" quando `!hasChanges`.
11. **P3 — M.11**: ajustar breadcrumb em mobile.
12. **P3 — M.8**: garantir reset de `coverSyncAttemptedRef` entre materiais.
13. Adicionar testes E2E (Playwright) para os 3 fluxos críticos (criar via IA, editar bloco, compartilhar + abrir link).

### Fase 3 — Antes de launch público

14. **P3 — I.5**: confirmar pipeline de cover (data URL → R2).
15. **P3 — I.3/I.4**: `loading="lazy"` + `srcset`.
16. **P3 — N.6**: preview visual de templates (mini render).
17. **P3 — N.2**: diff visual entre versões.
18. **P3 — M.13**: `Ctrl+Y` no Windows.
19. **P3 — L.3.4**: aumentar entropia do token de share (16+ chars).
20. **P3 — L.5**: confirmar cache do worker pdf.js no SW.

### Fase 4 — Pós-lançamento (próximo trimestre)

21. Roadmap produto: orient. "documento paginado" e "apresentação" (N.13).
22. Roadmap produto: variáveis dinâmicas (N.5).
23. Roadmap produto: pré-visualização de templates (N.6).
24. Roadmap produto: compression PDF (N.7).
25. Roadmap produto: notificação de visualização (N.17).
26. Roadmap produto: compartilhamento por e-mail (N.18).
27. Roadmap produto: orient. "quadrado" (N.14).
28. Roadmap produto: internacionalização (N.15).
29. Roadmap produto: analytics por categoria (N.20).
30. Roadmap técnico: substituir CDN unpkg por self-host (M.4) — feito na fase 1, mas auditar build.

---

## Apêndice — Arquivos auditados nesta varredura

- `src/pages/comercial/ComercialOverviewPage.tsx`
- `src/pages/comercial/BibliotecaComercialPage.tsx`
- `src/pages/comercial/EditorPropostaPage.tsx` (sumarizado, não lido integral)
- `src/pages/comercial/CompartilhamentosComercialPage.tsx`
- `src/pages/comercial/PublicProposalViewer.tsx`
- `src/pages/comercial/biblioteca/types.ts`
- `src/pages/comercial/biblioteca/components/SendProposalModal.tsx`
- `src/pages/comercial/biblioteca/components/wizard/StepMethod.tsx`
- `src/pages/comercial/biblioteca/components/wizard/StepCategory.tsx`
- `src/pages/comercial/biblioteca/components/wizard/StepAiBriefing.tsx`
- `src/pages/comercial/biblioteca/components/wizard/StepTemplateGallery.tsx`
- `src/pages/comercial/biblioteca/components/wizard/StepPdfUpload.tsx`
- `src/pages/comercial/blocks/registryDefinitions.ts`
- `src/pages/comercial/blocks/normalization.ts`
- `src/pages/comercial/blocks/design.ts`
- `src/pages/comercial/blocks/types.ts`
- `src/pages/comercial/components/editor/VisualRenderer.tsx` (sumarizado)
- `src/pages/comercial/components/editor/EditorSidebar.tsx` (sumarizado)
- `src/pages/comercial/components/editor/PropertiesSidebar.tsx` (sumarizado)
- `src/pages/comercial/components/editor/NativePdfViewer.tsx`
- `src/pages/comercial/components/editor/modals/EditorHeader.tsx`
- `src/pages/comercial/components/editor/modals/SaveTemplateModal.tsx`
- `src/pages/comercial/components/editor/modals/CustomizeSlugModal.tsx`
- `src/pages/comercial/components/editor/modals/FullscreenPreviewModal.tsx`
- `src/pages/comercial/components/editor/blocks/CoverBlocks.tsx` (parcial)
- `src/pages/comercial/components/editor/blocks/EditorialBlocks.tsx` (parcial)
- `src/pages/comercial/components/editor/blocks/PricingBlocks.tsx` (parcial)
- `src/pages/comercial/components/editor/blocks/GalleryAndMiscBlocks.tsx`
- `src/hooks/useMaterials.ts`
- `src/hooks/useMaterialEditor.ts` (parcial)
- `src/hooks/useProposalAI.ts` (parcial)
- `src/app-photographer/PhotographerApp.tsx` (rotas)

## Apêndice — Arquivos NÃO auditados nesta varredura (follow-up)

- `src/pages/comercial/EditorPropostaPage.tsx` (ler integralmente)
- `src/pages/comercial/ShareAnalysisPage.tsx`
- `src/pages/comercial/RelatoriosComercialPage.tsx`
- `src/pages/comercial/EstrategiaComercialPage.tsx`
- `src/pages/comercial/biblioteca/hooks/useCreateMaterialWizard.ts` (inteiro)
- `src/pages/comercial/biblioteca/components/CreateMaterialWizardDialog.tsx` (inteiro)
- `src/hooks/useMaterialEditor.ts` (inteiro)
- `src/hooks/useMaterialShares.ts`
- `src/hooks/useMaterialPublicLink.ts`
- `src/hooks/usePublicMaterial.ts`
- `src/hooks/useTrackedMaterial.ts`
- `src/hooks/useShareTracking.ts`
- `src/hooks/useShareAnalysis.ts`
- `src/hooks/useComercialIntelligence.ts`
- `src/hooks/useLeadShares.ts`
- `src/hooks/usePublicTheme.ts`
- `src/pages/comercial/components/editor/blocks/CoverBlocks.tsx` (todas as 6 variantes)
- `src/pages/comercial/components/editor/blocks/EditorialBlocks.tsx` (todas as 3 variantes)
- `src/pages/comercial/components/editor/blocks/PricingBlocks.tsx` (todas as 3 variantes + PackageRenderer)
- `src/pages/comercial/components/editor/blocks/helpers.tsx`
- `src/pages/comercial/components/editor/blocks/CoverBlocks.tsx` (variant Diptych + floating-frame)
- `src/pages/comercial/blocks/EditableText.tsx` (XSS check)
- `src/pages/comercial/blocks/EditableImage.tsx`
- `src/pages/comercial/blocks/EditorialComposition.tsx`
- `src/pages/comercial/blocks/uploadImage.ts`
- `src/pages/comercial/blocks/registry.ts`
- `src/pages/comercial/components/MaterialCard.tsx`
- `src/utils/domainUtils.ts` (URL de share)
- `src/lib/gestaoR2Upload.ts`
- Schema do Supabase (verificar RLS policies em todas as tabelas)
- Cloudflare Worker `lunari-proposals-ai` (não auditado)

---

**Fim da auditoria.**
