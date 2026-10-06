---
trigger: always_on
description: Regras obrigatórias de integridade e pré-validação antes de considerar qualquer alteração pronta
---

# Regras de Integridade e Validação Pré-Entrega (Lunari Studio)

## ⚠️ AVISO CRÍTICO: `npm run build` NÃO FAZ TYPECHECK
No `package.json`, o comando `"build"` executa apenas `"vite build"`.
- O Vite usa `esbuild` para remover tipos em alta velocidade.
- O Vite **NÃO** verifica variáveis indefinidas (`ReferenceError`) nem valida tipos estáticos em tempo de compilação.
- Um `npm run build` com código 0 **NÃO GARANTE** que o aplicativo não quebrará em produção!

---

## 📋 Checklist Obrigatório Antes de Validar Qualquer Tarefa:

1. **Revisão Rigorosa do `git diff`**:
   - Inspecione minuciosamente cada alteração em relação à branch/versão anterior.
   - Verifique se nenhuma variável existente foi removida ou renomeada acidentalmente (ex: `hasBottomNav`, `isEditor`, etc.).
   - Garanta que todas as variáveis utilizadas no JSX existam no escopo local do componente.

2. **Atenção Máxima a Arquivos Nucleares (Shell/Root)**:
   - `src/components/layout/Layout.tsx`
   - `src/app-photographer/PhotographerApp.tsx`
   - `src/App.tsx`
   - Erros nesses arquivos derrubam a aplicação inteira para todos os usuários com o ErrorBoundary global ("Algo deu errado").

3. **Verificação de Sintaxe e Tipos dos Arquivos Modificados**:
   - Rodar SEMPRE `npm run typecheck:changed` antes de qualquer entrega ou encerramento de tarefa.
   - NUNCA considerar uma tarefa pronta se `npm run typecheck:changed` acusar qualquer erro.

4. **Validação de Encoding (Prevenção de Mojibake)**:
   - Certifique-se de que todos os arquivos modificados ou criados foram salvos e mantidos estritamente no formato **UTF-8**.
   - Verifique o `git diff` e procure por caracteres corrompidos como `Ã©`, `Ã§`, `Ã£` ou ``.
   - Se identificar corrupção (Mojibake) causada por ferramentas ou editores rodando em Windows (ex: Windows-1252 ANSI), reverta ou corrija IMEDIATAMENTE (re-encodando a string ou arquivo de latin1 para utf8). NUNCA envie código com acentuação quebrada.
