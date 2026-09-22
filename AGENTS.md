# Diretrizes e Regras Globais do Lunari Studio

Este arquivo é lido automaticamente pelos agentes de IA ao interagir com o repositório do Lunari Studio.

## 🚨 Regra Primordial de Resposta
- **Sempre responda em Português BR**.

---

## 🛡️ Integridade e Prevenção de Quebras em Produção

### 1. `npm run build` não valida tipos em tempo de compilação
- O comando `"build"` neste repositório roda exclusivamente `vite build`.
- Por design de performance, o Vite não faz checagem estática de variáveis não declaradas (`ReferenceError`) ou tipos TypeScript quebrados.
- **Portanto, um build verde NÃO significa que o código está livre de erros de runtime.**

### 2. Checklist Obrigatório Pré-Validação
Antes de apresentar qualquer tarefa como concluída ou aprovada:
1. **Revisão Manual de Diff**: Rodar `git diff` nos arquivos alterados e conferir se nenhuma variável local foi deletada ou renomeada por engano (ex: `hasBottomNav`, `isEditor`, etc.).
2. **Escopo dos Componentes**: Verificar se cada variável chamada no retorno JSX está devidamente declarada no corpo do componente (ex: `cn`, `toast`, hooks, etc.).
3. **Validação Automática de Tipos**: Rodar obrigatoriamente `npm run typecheck:changed` para verificar se os arquivos alterados possuem qualquer erro de TypeScript ou variável não importada.
4. **Componentes Nucleares**: Ter cuidado redobrado com arquivos que afetam 100% da aplicação (`src/components/layout/Layout.tsx`, `PhotographerApp.tsx`, `App.tsx`).
