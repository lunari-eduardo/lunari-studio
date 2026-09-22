# Lunari Studio — Auditoria Completa do Design System

> **Data:** 2026-09-22
> **Escopo:** 10 eixos (botões, cards, headers, modais, inputs, tipografia, tabelas, navegação, cores, estados)
> **Método:** Varredura exaustiva do `src/` por 10 agentes paralelos.
> **Achado central:** o estúdio já tem um "design system silencioso" funcionando (tokens shadcn + `dialogTokens.ts`), mas a maioria do código convive com legados `lunar-*`, hex literais e CVA locais que disputam — não complementam — esse sistema.

---

## 1. Diagnóstico executivo

- **Funciona:** `dialogTokens.ts`, sonner, `Skeleton`, `PageHeader` (em quem usa), shadcn `Table` (em quem usa), paleta `accent-gold` quando respeitada.
- **Não funciona:** cor dourada Lunari hardcoded (`#C9A87C`/`#C6A36A`/`#cbb384`) em 100+ lugares; paleta `lunar-*` em 15+ arquivos; 7 `StatusBadge` divergentes; 3 padrões de tabela simultâneos; sombras/bordas/paddings de card re-inventados em cada módulo.
- **Risco principal:** a marca Lunari (o ouro silencioso) está fragmentada em três hex. Quem abrir `onboarding/new/StepWelcome.tsx` e `conversas/chat/MessageBubble.tsx` não vê o mesmo produto.

---

## 2. Inventário por eixo

### 2.1 Botões

- Base oficial: `src/components/ui/button.tsx` — variantes `default | destructive | outline | secondary | terracotta | luxury | gallery-primary | ghost | link`, sizes `default=10 | sm=9 | lg=11 | icon=10 | icon-sm=8`.
- Drift:
  - `AuthButton` (gradient próprio `#C9A87C → #9A7F52`).
  - `ProUpgradeModal` / `PlanRestrictionGuard` (`bg-amber-600`).
  - `ExpandedActions` (gradient escuro `#1C1815 → #2B231D`).
  - `LancamentoForm` (`bg-accent-gold`).
  - `site/primitives.tsx` e `landing/primitives.tsx` (sistemas paralelos com tokens `site`/`landing-brand`).
- Recomendação: 1 variante cobre o dourado Lunari (`terracotta`); `gallery-primary` quando houver override por tenant; nada de gradient inline.

### 2.2 Cards

- Base oficial: `Card` shadcn com `rounded-lg border bg-card shadow-sm backdrop-blur-xl`.
- Padrões paralelos: `.glass` (CSS), `dashboard-card-inner`, `StatCard`, `SalesMetricsCards`, `LeadCard`, `TaskCard`, `WorkflowCard`, `BlogCard`, `GalleryCard`, `FormCard`, `ContratoCard` — todos `<div>`/`<article>`/`<li>` custom.
- Recomendação: 5 variantes nomeadas (`Metric`, `Glass`, `ListItem`, `Feature`, `Mini`) — nenhuma classe solta `rounded-2xl border bg-card` ad-hoc.

### 2.3 Page Headers

- Oficial: `PageHeader.tsx` → `font-heading text-[15px] font-semibold tracking-tight` + `text-xs text-muted-foreground` descrição.
- Quem ignora (15+ páginas):
  - Admin: `SistemaPage`, `DashboardPage`, `AssistantRolloutPage`, suporte admin (4 páginas).
  - Gallery detail/create/edit/deliver (5 componentes), `ArtigoAjuda`, `ShareAnalysisPage`, `GerenciarView`.
- Recomendação: criar `AdminPageHeader` e `GalleryHeader` variantes, ou absorver esses casos em `PageHeader` aceitando `size="lg"`.

### 2.4 Modais / Overlays

- Já existe `src/lib/dialogTokens.ts` definindo `dialogSize('sm'|'md'|'lg')`, `DIALOG_SHELL`, `DIALOG_BODY`, `DIALOG_FOOTER`, `DIALOG_TITLE_CLS`, `DIALOG_DESCRIPTION_CLS`, `FIELD_LABEL`, `LIST_SHELL`, `ROW_DIVIDER`, `LIST_EMPTY`, `GHOST_INPUT`, `GOLD_ICON`.
- Quem não usa: `ClientModal`, `LeadFormModal`, `CreditPackagesModal` (`max-w-4xl` cru), `ContratoViewerModal` (`max-w-5xl`), `EmailTemplateModal` (`sm:max-w-xl`), `PersonalEventModal` (`sm:max-w-[480px]`), `CropperModal`. `Lightbox`/`DeliverLightbox` (`z-[99999]`) precisam de z-index normalizado.
- Padronizar z-index: overlay 40, modal 50, modal interno 60, lightbox 99999 (já é exceção).

### 2.5 Inputs / Forms

- Base oficial: `Input` shadcn `h-10` `rounded-lg` `bg-background` `border-input`.
- Drift:
  - `AddressFieldsBlock` (`h-9`), `VendaAvulsaPanel` (`h-9`), `AssistantLauncher` (`h-12`), `Onboarding` comboboxes (`h-12 rounded-full`).
  - Auth/onboarding: `rounded-xl border-white/10 bg-white/[0.04]`.
  - Finance: `rounded-md bg-transparent` em fields inline.
  - 9+ comboboxes custom (`ClientSearchCombobox`, `ProductSearchCombobox`, `NichoCombobox`, etc.) com lógica semelhante — candidato único a `<Combobox>`.
- Label: 3 padrões diferentes (`text-xs`, `text-[11.5px] uppercase`, label-via-placeholder). Erro: `text-destructive` vs `text-red-400/600`.

### 2.6 Tipografia & Espaçamento

- Padrão: `font-medium` dominante (2762×), `font-semibold` em títulos, `tracking-tight` nos h1, `uppercase tracking-wide` em labels.
- Tamanhos UI: `text-[15px]` no PageHeader, `text-sm` no body, `text-xs` em labels, `text-[11px]` e `text-[10px]` emergindo como micro-tamanhos.
- Spacing: `gap-2 / gap-3 / gap-4`, `p-4 / p-6`, `space-y-4`, `mb-4`.
- Drift: `font-heading` prometido mas não definido em `tailwind.config.ts`; landing/blog/galerias usam `font-serif` Playfair (intencional mas declarado); admin usa `text-2xl font-bold` sem `font-heading`.

### 2.7 Tabelas / Listas densas

- 3 padrões: shadcn `<Table>` (ExtratoTable, ResponsesTable, ClientesTable), `<table>` HTML puro (TabelaLancamentos, AdminTickets, FAQManager, AdminUsuarios), `<Accordion>` para "tabela" (WorkflowHistoryTable).
- Hover varia: `hover:bg-muted` / `/30` / `/50`.
- shadcn `Pagination` existe em `ui/pagination.tsx` mas **não é usado em lugar nenhum** — todas as páginas implementam manualmente.
- **Não existe `EmptyState`** no `src/components/ui/`; cada módulo reinventa inline.
- Código morto: `WorkflowTable.tsx` (apenas delega), `WorkflowTableHeader.tsx` (retorna null).

### 2.8 Navegação

- Sidebar principal: 4 rem colapsado / 15 rem (240 px) expandido desktop; bottom-nav 5 colunas `h-14` mobile + drawer lateral para overflow (`Sheet`).
- shadcn `Sidebar`: `SIDEBAR_WIDTH=16rem`, `SIDEBAR_WIDTH_ICON=3rem`, `SIDEBAR_WIDTH_MOBILE=18rem` — conflitam com a principal.
- 8 sidebars independentes (`Sidebar.tsx`, shadcn, `AdminSidebar`, `AgendaSidebar`, 3 editor sidebars, `ChatListSidebar`) — nenhuma compartilha componente.
- Item: `h-9 px-3 rounded-md text-[13px] font-medium hover:bg-white/5`; ativo: `text-[hsl(var(--sidebar-active-fg))]` + ícone `text-accent-gold`.
- Logo Lunari hardcoded no topo da sidebar principal (não varia por tenant).
- Tabs: 5+ estilos (underline shadcn, pill/contained, custom bordered, sidebar tabs, inline pill editoras). Padronizar 2 — underline para navegação, pill/contained para settings/modals.
- Header principal: `h-12` com `bg-card/40 dark:bg-background/60 backdrop-blur-xl border-b border-border/30`. Cada área (admin, gallery, agenda, dashboard) tem o próprio.
- Breadcrumb shadcn existe (`breadcrumb.tsx`) mas usado em apenas 2 páginas.
- `ProductSwitcher`: Studio/Gallery, `bg-[hsl(var(--sidebar-accent))] text-accent-gold` quando ativo.
- Breakpoints via `useResponsiveMode`: `mobile <768`, `tablet-portrait/landscape 768–1024`, `desktop ≥1024`.

### 2.9 Cores / Tokens

- **Dourado Lunari fragmentado:** `#C9A87C` (auth/conversas/deliver/landing), `#C6A36A` (StepIndicator/onboarding), `#cbb384` (Button/DeliverPhotoManager) — 100+ ocorrências, todos deveriam colapsar em `accent-gold`.
- **Hex crus dark:** `#0A0A0A`, `#121212`, `#1C1C1C`, `#0F0F0F` em landing/onboarding — deveriam ser `foreground`.
- **Hex crus light:** `#FAFAF7`, `#F5F5F5`, `#F8F8F8`, `#F0F0F0` — `background` / `muted`.
- **Cores raw Tailwind em tags de status:** `bg-blue-500/10 text-blue-700`, `bg-green-500/10 text-green-700`, `bg-red-500/15 text-red-700`, `bg-purple-500/10 text-purple-700`, `bg-amber-500/10 text-amber-600`, `bg-orange-500/10` em `extratoConstants.ts` — deveriam ser `success` / `warning` / `info` / `destructive` (precisam ser criados em `tailwind.config.ts`).
- **`lunar-*`** (legacy shadcn backward-compat) em 15+ arquivos; `lunar-success` = verde `#2E7D5B`, deve virar `text-success` (token ainda não existe).
- **`accent-gold-soft`** já existe como token mas é chamado como `bg-[hsl(var(--accent-gold-soft))]` em 11 arquivos (ContactoTab, ClienteFormDrawer).
- **Casos justificados (manter):** `#25D366` WhatsApp, paleta de avatares, `etiquetaColorTokens.ts`, phone mockup.

### 2.10 Estados

- **Badges:** 7+ componentes (shadcn `Badge`, `StatusBadge` finanças, `StatusBadge` galeria, `FinancialStatusBadge`, `ColoredStatusBadge`, `ProductStatusChip`, `PaymentStatusCard`, `ChargeStatusDisplay`). Cada um com paleta própria (`amber-500` na galeria, `green-100` nas finanças, `bg-warning/10` se existisse).
- **Toasts:** Sonner (231 arquivos, dominante) + shadcn Toast legado (~10). Manter Sonner, remover shadcn Toast.
- **Loading:** `Skeleton` shadcn em 49 arquivos, padrão correto. Spinner `Loader2` em tabelas. Modal-pesados sem skeleton: `ManualPaymentModal`, `WorkflowDeleteConfirmModal`, `Step4Photos`.
- **Empty state:** 4 padrões ad-hoc (minimal, card+CTA, ilustração, inline). Falta componente `src/components/ui/empty-state.tsx`.
- **Error states:** `RootErrorBoundary` (página inteira) + `ErrorBoundary` (seção) + erro inline em campo/pagamento/checkout público. Já OK.

---

## 3. Top 10 prioridades de refatoração

| # | Ação | Arquivos tocados | Esforço |
|---|---|---|---|
| 1 | Substituir 3 hex do dourado (`#C9A87C`, `#C6A36A`, `#cbb384`) por `text-accent-gold` / `border-accent-gold` | `onboarding/new/*`, `conversas/chat/*`, `auth/*`, `deliver/*`, `landing/*` (~70 lugares) | M |
| 2 | Adicionar tokens semânticos `success`, `warning`, `info` em `tailwind.config.ts` e migrar `bg-green-500/10 text-green-700`, `bg-red-500/15 text-red-700`, `bg-amber-500/10`, `bg-blue-500/10` em `extratoConstants.ts` e `financialConstants.ts` | `tailwind.config.ts`, `extratoConstants.ts`, `financialConstants.ts`, `etiquetaColorTokens.ts` (manter) | M |
| 3 | Migrar 7 `StatusBadge` para 1 `StatusBadge` parametrizado por estado semântico (`success|warning|destructive|info|muted`) usando os tokens do item 2 | `src/components/ui/status-badge.tsx` + 6 arquivos | M |
| 4 | Criar `src/components/ui/empty-state.tsx` (ícone + título + descrição + CTA opcional) e migrar os 9 lugares ad-hoc | 1 arquivo novo + 9 consumidores | P |
| 5 | Migrar todos os dialogs/modais para os tokens de `dialogTokens.ts` (`dialogSize`, `DIALOG_SHELL`, `DIALOG_BODY`, `DIALOG_FOOTER`, `DIALOG_TITLE_CLS`) | 8 modais (`ClientModal`, `LeadFormModal`, `EmailTemplateModal`, `PersonalEventModal`, `CreditPackagesModal`, `ContratoViewerModal`, `CropperModal`) | M |
| 6 | Migrar `lunar-*` (15+ arquivos) para tokens shadcn (`text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`) | `modules/tasks/*`, `financas/*`, `agenda/*`, `analise-vendas/*` | M |
| 7 | Adicionar `font-heading` em `tailwind.config.ts` e padronizar Admin/Gallery/Suporte para usar `PageHeader` (ou variantes `AdminPageHeader`/`GalleryHeader`) | `tailwind.config.ts` + 15 páginas | M |
| 8 | Substituir `<table>` HTML cru por shadcn `Table` em `TabelaLancamentos`, `AdminTicketsListPage`, `FAQManagerPage`, `AdminUsuarios` (já usa) | 4 arquivos | P |
| 9 | Criar `<Combobox>` único (cliente, produto, pacote, nicho, cidade, categoria) substituindo os 9 atuais | 1 novo + 9 consumidores | M |
| 10 | Consolidar sidebars: criar variantes de `Sidebar` (`ProductSwitcher` + `IconNav` + `ListNav`) para Admin/Agenda/Chat/Editores compartilharem estrutura | 8 sidebars | G |

---

## 4. Plano de execução (3 fases)

### Fase 1 — Fundação (1-2 sprints)
- Definir `tailwind.config.ts`: adicionar `font-heading`, tokens semânticos `success/warning/info`, mapear `accent-gold` para os 3 hex existentes.
- Publicar `src/components/ui/empty-state.tsx` e `src/lib/statusColors.ts` (lookup status → token).
- Adicionar `font-heading` ao CSS.
- Migrar `extratoConstants.ts` e `financialConstants.ts` para os novos tokens.
- Remover shadcn Toast legado (após auditoria de uso residual).

### Fase 2 — Migração em massa (2-3 sprints)
- Substituir dourado hex por `accent-gold` (automatizar com `grep -rl '#C9A87C\\|#C6A36A\\|#cbb384'`).
- Migrar `lunar-*` (script de codemod + revisão).
- Migrar modais para `dialogTokens.ts`.
- Adicionar página skeleton em modais sem cobertura.
- Substituir `<table>` HTML cru por shadcn `Table` (após decidir empty-state).

### Fase 3 — Consolidação (1-2 sprints)
- Unificar `StatusBadge` em 1 componente.
- Criar `<Combobox>` único, migrar 9 lugares.
- Consolidar sidebars (Admin/Agenda/Chat/Editores) em variantes parametrizadas.
- Introduzir `AdminPageHeader` + `GalleryHeader`.
- Adicionar ESLint rule custom para barrar hex `#[0-9a-f]{6}` fora de arquivos de token.

---

## 5. Observações de saúde

- **Bom:** `accent-gold*` usado corretamente em wrappers de ícones; `landing-*` corretamente confinado em `src/components/landing/`; `site.*` e `terra-*` sem uso; Sonner dominante sobre shadcn Toast; `dialogTokens.ts` é um excelente semente a propagar; `Skeleton` amplamente adotado.
- **A confirmar (não fiz medições):** acessibilidade — `fieldset/legend`, `aria-live` em toasts, contraste de combinações não-auditadas; métricas de bundle após unificação de cards; consistência de animações (`duration-200` vs `duration-300` vs `duration-1000`).
- **Não analisado por escopo:** React Query keys, performance de listas longas, testes visuais.

— fim —
