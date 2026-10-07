---
trigger: always_on
description: Catálogo rigoroso de componentes UI (Botões, Tabs, Cards) e proibições de Tailwind no Lunari Studio
---

# Catálogo e Regras Rigorosas de UI Components (Lunari Studio)

Ao revisar ou criar qualquer tela no Lunari Studio, você deve OBRIGATORIAMENTE seguir estas especificações exatas de componentes para garantir a padronização visual.

## 🚨 1. Regra de Ouro do Hover e Contraste
- O Hover deve ser sempre **sutil**. NUNCA transforme um botão em outra cor abruptamente.
- **NUNCA use hover:bg-accent** para botões Ghost ou Outline. No Lunari, a variável --accent é Grafite/Preto Sólido (#171717). Usar g-accent deixará o botão preto!
- O padrão correto para hover sutil (cinza claro) em botões secundários ou de ícone é **hover:bg-muted hover:text-foreground**.

## 🖱️ 2. Botões Secundários (Ações de Suporte)
Usado para ações como "Hoje", "Gerenciar", "Cancelar", "Filtros".
- **Variante Obrigatória**: ariant="outline"
- **Estilo Base**: order border-input bg-background shadow-sm.
- **Hover**: hover:bg-muted hover:text-foreground.
- **Canto**: O componente oficial já usa ounded-md (8px).
- **Proibições**: NUNCA force ounded-full (pílula) nesses botões. NUNCA insira cores arbitrárias (order-primary/40).

## ⚙️ 3. Icon Buttons (Botões apenas com Ícone)
Usado para menus (⋮), navegação secundária < >, e ações inline rápidas +.
- **Variante Obrigatória**: ariant="ghost" acompanhado de size="icon" (ou size="icon-sm").
- **Canto**: ounded-md (8px). 
- **Proibições**: NUNCA force ounded-full a não ser que seja um Floating Action Button (FAB). NUNCA coloque bordas ou fundos estáticos nesses botões.

## 🗂️ 4. Segmented Controls / Tabs (Seletores de Visão)
Usado para alternar "Dia/Semana/Mês", ou filtros exclusivos.
- **Container**: g-muted/40 p-1 rounded-lg (12px).
- **Proibições no Container**: NUNCA use bordas (order-border/60). Container de abas não tem borda, apenas fundo.
- **Botão Ativo**: g-background text-foreground shadow-sm rounded-md.
- **Botão Inativo**: 	ext-muted-foreground hover:text-foreground hover:bg-muted/30. (Fundo transparente).

## 📄 5. Cards Internos e Divisões de Layout
Usado para painéis de conteúdo, resumos (ex: "Tarefas do Dia") ou grids.
- **Canto (Radius)**: OBRIGATORIAMENTE ounded-xl (12px) para cartões de conteúdo principal, e ounded-2xl para Modais. NUNCA use ounded-lg para dividir áreas maiores da tela.
- **Borda**: order-border/60 a order-border/80.
- **Proibições**: NUNCA use order-border/20 (invisível demais, perde a definição da interface em monitores claros).


## 📑 6. Sub-abas de Navegação (Tabs Interiores / Páginas)
Usado para navegação horizontal principal dentro de módulos (ex: "Visão Geral", "Fluxo Financeiro", "Gerenciar").
Sempre que houver sub-abas (em páginas, modais, etc), o estilo deve obrigatoriamente seguir o padrão visual "Finanças":
- **Container (TabsList)**: Deve ser w-full h-auto p-0 bg-transparent border-b border-border rounded-none justify-start gap-1 sm:gap-6 overflow-x-auto no-scrollbar.
- **Botões (TabsTrigger)**: Devem ter fundo transparente, sem background no active. 
- **Indicador de Ativo (Borda Inferior Dourada)**: O item ativo recebe uma borda inferior dourada através do pseudo-elemento fter e cor escura no texto. NUNCA coloque sombra ou fundo branco sólido em Sub-abas.
- **Classes exatas obrigatórias para o TabsTrigger**:
  `	sx
  'relative px-3 sm:px-4 py-3.5 text-[13px] sm:text-sm font-medium bg-transparent rounded-none text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:content-[\"\"] data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:-bottom-px data-[state=active]:after:h-[2px] data-[state=active]:after:bg-accent-gold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0'
  `

