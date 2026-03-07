

# Correções DnD + Glassmorphism Aprimorado

## Problemas Identificados

**DnD — Snap-back animation**: O `DragOverlay` tem `dropAnimation` com duração de 200ms. Quando o card é solto numa nova coluna, o dnd-kit anima o overlay DE VOLTA para a posição original antes de desaparecer. Isso causa o efeito visual de "card volta e depois pula para o destino". A solução é `dropAnimation={null}` para remoção instantânea do overlay.

**DnD — Card fantasma persistente**: O placeholder (card opaco na coluna de origem) continua visível durante todo o drag. Isso é esperado, mas combinado com o snap-back cria confusão visual.

**Glassmorphism fraco**: Comparando com as referências Apple/Windows (imagens 4-6), o efeito atual tem:
- Blur muito baixo (8px nos cards, 16px nas colunas)
- Opacidade muito alta (75% branco nos cards — quase sólido)
- Sem saturação visível
- Bordas sem destaque de luz (o "inner glow" branco precisa ser mais forte)

## Plano

### 1. Fix DnD — Eliminar snap-back (Tarefas.tsx)
- Setar `dropAnimation={null}` no `DragOverlay` para remoção instantânea
- Manter o placeholder com opacity 0.3 durante drag (comportamento atual está OK)

### 2. Glassmorphism mais intenso (Tarefas.css)

**Colunas** — aumentar blur e transparência:
- `backdrop-filter: blur(24px) saturate(180%)` (era 16px/140%)
- Background mais transparente: `rgba(var(--col-color), 0.05)` a `0.015`
- Adicionar `rgba(255,255,255,0.25)` na mistura para o efeito fosco
- Borda: `rgba(255,255,255,0.35)` combinada com cor do status (atualmente só usa cor)
- Inner shadow branco mais forte

**Cards** — frosted glass real:
- `backdrop-filter: blur(16px) saturate(160%)` (era 8px)
- Background: `rgba(255,255,255,0.45)` a `0.30` (era 0.75/0.55 — muito opaco)
- Borda: `rgba(255,255,255,0.5)` com 1px (efeito de "borda de luz")
- Inner glow mais visível: `inset 0 1px 0 rgba(255,255,255,0.7)`
- Top stripe mais sutil (1px em vez de 2px)

**Hover nos cards** — aumento de elevação glass:
- Background sobe para `rgba(255,255,255,0.6)` (mais claro mas ainda translúcido)
- Shadow maior com tint de cor: `0 12px 32px -8px rgba(var(--card-color), 0.15)`
- Borda ganha brilho: `rgba(255,255,255,0.7)`

**DragOverlay** — glass premium:
- `backdrop-filter: blur(30px) saturate(200%)`
- Background: `rgba(255,255,255,0.55)` (translúcido mas distinto)
- Sombra proeminente com cor do status
- Scale 1.04

**Dark mode** — ajustar proporcionalmente com tons escuros translúcidos

### 3. Background da página mais contrastante
- Adicionar um gradiente mais visível para que o blur tenha algo para "borrar":
- Light: `hsl(220 20% 95%)` → `hsl(220 12% 88%)`  
- Isso faz os painéis glass se destacarem mais contra o fundo

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Tarefas.tsx` | `dropAnimation={null}` no DragOverlay |
| `src/pages/Tarefas.css` | Glassmorphism intensificado em colunas, cards, overlays |

