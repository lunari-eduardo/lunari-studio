# Plano de Padronização UI (Silent Luxury)

Este documento detalha o plano de ação rigoroso para refatorar as páginas **Leads**, **Agenda**, **Clientes** e **Tarefas**, alinhando-as 100% à consistência visual da página **Finanças** (Design DNA), sem causar regressões funcionais.

## 🎯 1. Unificação do Container e Layout (Page Wrapper)
A página de Finanças utiliza um layout fluido (100% width) no dashboard e um container alinhado (`max-w-[79rem]`) nas áreas de conteúdo.
- **Leads & Tarefas (Kanban/Listas)**: Como precisam usar toda a largura para os Kanbans, removeremos wrappers rígidos que cortam a tela e adotaremos o padrão `div className="w-full"` com margens laterais consistentes (`px-4 md:px-6`).
- **Clientes (Tabelas/Cards)**: Continuará usando o `PageContainer` com variante default (`max-w-[79rem]`), que é o mesmo utilizado no miolo de Finanças (`FinancePageContainer`).
- **Agenda**: Ajustar o `AgendaShell` para que o preenchimento de telas menores não tenha bordas cortadas ou desalinhadas.

## 🎨 2. Padronização de Tabs e Navegação Interna
Muitas páginas hoje usam "pills" (botões preenchidos, `bg-muted`) para abas. Finanças utiliza **Tabs sublinhadas** que são mais limpas e dão sensação de respiro (Luxo Silencioso).
- **Ação**: Criar um componente global (ou exportar as classes do Finanças) de `UnderlineTabs`.
- **Alvo**: Substituir as abas `Ativos / Ganhos / Perdidos` de **Leads** e qualquer outro `TabsList` no formato pill por este novo padrão (borda inferior sutil e linha dourada no item ativo).

## 🎛️ 3. Cabeçalhos e Controles (Filtros e Ações)
Atualmente cada tela monta seu `PageHeader` ou barras de ações com inputs variados.
- **Botões Primários (Ação Principal)**: Seguir o padrão de Finanças: `h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm`.
- **Botões Secundários (Filtros/Views)**: Utilizar `h-9 border-border/60 bg-transparent text-foreground hover:bg-muted/50`.
- **Selects / Inputs de Filtro**: Padronizar a altura em `h-9` (Finanças utiliza `h-9` nos selects de Período), fundos transparentes no estado idle (`bg-transparent border-border/60`), e evitar bordas muito escuras ou claras que não respeitam o modo dark.
- **Ação**: Remover o CSS injetado como `.glass-filters input:focus` de Tarefas, pois ele quebra a consistência do Design System e gera cores não-padrão. 

## 🖱️ 4. Correção de Hovers Inconsistentes e Textos Ocultos
O usuário relatou "hovers que ocultam textos". Isso geralmente ocorre quando a cor do texto (`text-muted-foreground` ou customizada) não contrasta com o background de `hover:bg-muted` ou `hover:bg-zinc-800` no Dark Mode.
- **Tabelas / Cards (Clientes e Leads)**: Garantir que os botões de ação nas linhas da tabela não invertam cores incorretamente no hover. 
- **Tarefas (Kanban Cards)**: Rever a regra `.task-card:hover` e certificar-se de que nenhum texto perde contraste.
- **Padronização Dark/Light**: Todos os ícones de ação usarão botões fantasmas padrão (`variant="ghost"`) gerenciados pelo tema do Shadcn (`hover:bg-accent hover:text-accent-foreground`), erradicando classes soltas como `dark:hover:text-white`.

## 🛠️ 5. Execução em Etapas (Risco Zero de Regressão)
1. **Etapa A (Leads e Clientes)**: Ajuste dos Cabeçalhos, Filtros e botões (Substituição de Pill Tabs por Underline Tabs).
2. **Etapa B (Tarefas)**: Limpeza do CSS local (`Tarefas.css`), alinhamento do `PageHeader` para o padrão sem bordas e ajuste dos inputs/selects de Filtro.
3. **Etapa C (Agenda)**: Refinamento visual da Header de Agenda, ajustes de padding para alinhamento global e normalização dos seletores de visualização.
4. **Etapa D (Revisão de Hovers)**: Pente-fino em todas as tabelas (Clientes) e grids para assegurar contraste em Light e Dark modes. Validação final estrita (`npm run typecheck:changed` e `build`).

---
_Aguardando aprovação do plano para iniciarmos as alterações no código._
