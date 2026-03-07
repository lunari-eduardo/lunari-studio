

# Fix Workflow Cards: Tamanho, Hover e Glassmorphism

## Problemas Identificados

1. **Card cortado a 100% zoom**: `WorkflowCardList.tsx` linha 60 usa `w-[70%]` com `min-w-[1100px]`. O grid desktop do `WorkflowCardCollapsed` tem ~1016px de colunas fixas + coluna auto (Galerias). A 100% zoom, o `w-[70%]` limita a largura e o conteúdo é cortado à direita.

2. **Hover invertido**: `WorkflowCard.tsx` aplica `bg-gradient-to-br from-white via-gray-100/60 to-gray-50/80` + shadow base, criando um visual já "elevado" por padrão. O hover adiciona shadow maior, mas a diferença visual é mínima — parece que o efeito já está ativo.

3. **Sem glassmorphism**: Os cards usam gradientes opacos sólidos sem backdrop-filter.

## Plano

### 1. Fix largura do card (WorkflowCardList.tsx)
- Linha 60: Trocar `w-[70%] min-w-[1100px]` por `w-full` — o card deve preencher o container e o overflow horizontal fica no scroll container pai.

### 2. Glassmorphism + Fix hover (WorkflowCard.tsx)
- **Base**: Remover gradientes opacos. Aplicar fundo translúcido: `bg-white/40 backdrop-blur-xl border border-white/50` com shadow mínima (`shadow-sm`).
- **Hover**: Aumentar opacidade para `bg-white/60`, shadow elevada (`shadow-lg`), borda mais brilhante. `translateY(-1px)`.
- **Expanded**: Shadow moderada entre base e hover. Hover no expanded adiciona mais elevação.
- **Dark mode**: `bg-white/[0.04]` base → `bg-white/[0.08]` hover, bordas `border-white/10`.

### 3. Background do container (WorkflowCardList.tsx)
- Manter o gradiente cinza no container para que o blur dos cards tenha algo para "embaçar", mas torná-lo mais contrastante para o efeito glass funcionar.

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/workflow/WorkflowCardList.tsx` | Fix `w-[70%]` → `w-full` |
| `src/components/workflow/WorkflowCard.tsx` | Glassmorphism + fix hover hierarchy |

