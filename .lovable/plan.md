

# Redesign Glassmorphism da Página Tarefas

## Problemas Identificados

1. **Conflito CSS critico**: `index.css` tem regras `.page-tarefas` que matam TODAS as transitions e hovers com `!important`. A pagina usa `.page-tarefas-modern` mas esses seletores antigos sobrescrevem tudo.
2. **Glassmorphism generico**: Colunas e cards usam branco/cinza puro, sem cor por status.
3. **DnD travado**: Card original fica `opacity: 0` sem transicao. O `DragOverlay` nao tem estilo glass. `PointerSensor` com `distance: 4` e baixo, e `restrictToFirstScrollableAncestor` limita o movimento.
4. **Modais e botoes sem redesign glass**.

## Plano de Implementacao

### 1. Remover conflito CSS global (index.css)
- Remover/renomear os blocos `.page-tarefas` em `index.css` (linhas 530-548) que desabilitam transitions e hovers. A pagina ja usa `.page-tarefas-modern` — os seletores antigos nao sao mais necessarios.

### 2. Reescrever Tarefas.css — Glassmorphism com cores de status

**Background da pagina**: Degradê cinza claro vertical (top → bottom) como base.

**Colunas**: Cada coluna recebe tint da cor do status via inline style. Em vez de `background: rgba(255,255,255,0.3)`, usar uma funcao que mescla a cor do status com alpha baixo:
- Coluna "A Fazer" (azul): `rgba(59, 130, 246, 0.06)` com `backdrop-filter: blur(16px)`
- Coluna "Em Andamento" (amarelo): `rgba(234, 179, 8, 0.06)`
- etc.

Isso sera feito passando `--col-color` como CSS variable inline no `StatusColumn`.

**Cards**: Fundo fosco/opaco com leve degradê vertical. Mais solido que a coluna para contrastar:
- Light: `rgba(255, 255, 255, 0.7)` com blur menor (6px)
- Tint sutil da cor do status no top via `linear-gradient`

**Hover nos cards**: `translateY(-3px)`, aumento de blur e shadow, borda ganha cor do status.

**DragOverlay**: Card com blur forte, sombra elevada, borda accent, escala 1.03.

### 3. Melhorar DnD (Tarefas.tsx + DraggableTaskCard.tsx)
- Trocar `restrictToFirstScrollableAncestor` por nenhum modifier (ou `restrictToWindowEdges`) para permitir drag livre entre colunas
- Aumentar `PointerSensor distance` para 6 (evita drag acidental sem travar)
- No `DraggableTaskCard`, em vez de `opacity: 0`, usar `opacity: 0.3` com escala reduzida para "placeholder" visual
- Adicionar `will-change: transform` nos cards para GPU acceleration
- Passar `statusColor` para o `DragOverlay` card para manter o tint

### 4. Redesign StatusColumn (Tarefas.tsx)
- Adicionar CSS variable `--col-hue` baseada na cor do status
- Header da coluna: badge count com fundo tinted, dot maior
- Coluna com `border-top: 3px solid {statusColor}` para destaque visual
- Fundo com gradiente vertical: tint da cor no topo → transparente embaixo
- Drop zone ativa (`isOver`): glow na cor do status em vez de ring generico

### 5. Redesign TaskCard.tsx
- Remover a barra lateral colorida de 1px (antiquada)
- Adicionar tint de cor no background do card via `--card-status-color` CSS variable
- Botoes internos: estilo ghost com backdrop-filter blur no hover
- Badge de prioridade: glass effect com cor propria
- Titulo: hover com underline animado em vez de mudanca de cor

### 6. Redesign filtros e header
- `TaskFiltersBar`: glass-panel com blur, borda sutil, hover nos selects
- Botoes "Nova tarefa" e "Gerenciar": glass primary com glow sutil
- `PriorityLegend`: opacity reduzida, sem borda extra

### 7. Redesign modais (TaskDetailsModal, UnifiedTaskModal)
- `DialogContent`: glass background com blur forte, borda sutil
- Inputs dentro do modal: fundo semi-transparente com blur
- Botoes: glass variants

## Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| `src/index.css` | Remover blocos `.page-tarefas` conflitantes |
| `src/pages/Tarefas.css` | Reescrever completo com glass colorido por status |
| `src/pages/Tarefas.tsx` | StatusColumn com CSS vars de cor, DnD melhorado, DragOverlay estilizado |
| `src/components/tarefas/TaskCard.tsx` | Redesign com tint de status, hover elegante |
| `src/components/tarefas/dnd/DraggableTaskCard.tsx` | Placeholder visual em vez de opacity 0 |
| `src/components/tarefas/TaskFiltersBar.tsx` | Classe glass-panel |
| `src/components/tarefas/PriorityLegend.tsx` | Estilo glass sutil |
| `src/components/tarefas/TaskDetailsModal.tsx` | Modal glass |
| `src/components/tarefas/UnifiedTaskModal.tsx` | Modal glass |

