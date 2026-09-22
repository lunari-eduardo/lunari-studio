# Constituição e Diretrizes Globais do Lunari Studio

Este arquivo é o contrato primordial de engenharia, arquitetura e experiência de usuário (UX/UI) do Lunari Studio. Ele é lido automaticamente pelos agentes de IA ao iniciar qualquer interação com o repositório.

---

## 🚨 1. Regra Primordial de Comunicação
- **Sempre responda em Português BR**.
- Mantenha tom profissional, objetivo, colaborativo e técnico de alto nível.

---

## 🎯 2. Identidade & Propósito do Lunari
- O Lunari **não é** um simples ERP, CRM burocrático ou sistema administrativo comum.
- O Lunari é uma **Plataforma de Inteligência e Aceleração para Fotógrafos Profissionais**.
- **Princípio Fundamental**: A interface deve *desaparecer* durante o uso. O fotógrafo nunca deve se sentir preenchendo formulários lentos ou operando sistemas legados. Cada tela é um painel limpo, moderno, ágil e focado em economizar tempo e gerar valor de negócio.

---

## 🎨 3. Design DNA (Luxo Silencioso & UI Premium)

Toda criação e edição de interface deve seguir estritamente o [**Design DNA**](file:///docs/constitution/DESIGN_DNA.md):

### 3.1 Proporção Cromática Áurea
- **85% Neutros**: Fundos limpos (`#F7F6F3` / `#121212`), cartões elevados com contraste suave, divisórias sutis.
- **12% Preto Grafite**: Superfícies de suporte (`#171717`), sidebar institucional, botões de alto contraste.
- **3% Dourado Lunari (`hsl(var(--accent-gold))` / `#D4AF37`)**: Reservado exclusivamente para inteligência, status ativos e destaques estratégicos. **Nunca** deve competir com o conteúdo principal nem ser usado como fundo de blocos gigantes.

### 3.2 Benchmarks de Referência
- A linguagem do Lunari se aproxima de: **Linear**, **Notion Calendar**, **Raycast** e **Stripe Dashboard**.
- Muito respiro, tipografia refinada, linhas elegantes, sombras suaves de dispersão ampla e cantos arredondados consistentes (`rounded-xl` a `rounded-2xl`).

### 3.3 Hierarquia Visual em 3 Níveis (Obrigatória em Toda Tela)
1. **Nível 1 (Crítico)**: Títulos, ação principal da tela, valores pendentes e status vitais. Maior contraste e peso.
2. **Nível 2 (Contexto)**: Badges sutis, contadores de itens, datas e metadados. Não competem com o Nível 1.
3. **Nível 3 (Auxiliar)**: Dicas, micro-legendas e textos de suporte discretos. Sempre suaves e legíveis.

### 3.4 Filosofia de Feedback & Toasts
- **Zero Toasts Desnecessários**: Ações de salvar rascunho, atualizar formulários ou editar campos NÃO devem exibir toasts flutuantes invasivos. Prefira feedback inline discreto (ex: indicador *"Salvo agora"* com ícone verde sutil).
- Toasts são reservados **exclusivamente** para erros críticos ou confirmações explícitas de ações destrutivas/transacionais.

### 3.5 Ergonomia de Layout e Rolagem
- **Divisão em Colunas Independentes**: Em telas de edição (como formulários e contratos), o cabeçalho e as barras laterais permanecem fixos no topo, enquanto a área de trabalho central possui rolagem vertical isolada.
- **Prevenção de Vazamento em Flexbox**: Containers de rolagem não devem restringir a altura de folhas e cartões dinâmicos com `flex-row`. Usar containers de bloco (`mx-auto max-w-4xl h-auto`) para que o cartão branco sempre envolva 100% do texto digitado.
- **Margem Inferior de Segurança**: Toda área de rolagem deve possuir respiro amplo no rodapé com suporte à safe-area de mobile (`style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}`), impedindo que o fim da página colida com menus inferiores ou botões flutuantes.

---

## ⚡ 4. Regras Arquiteturais Inquebráveis

1. **Cálculos Financeiros e Status**: O frontend **NUNCA** calcula nem envia `valor_pago`, `valor_total` ou `status_financeiro` nos updates de sessão ou agendamentos. Esses valores são mantidos exclusivamente por triggers no banco PostgreSQL.
2. **Armazenamento de Mídia**: Novos uploads de arquivos e fotos de alta resolução **DEVEM** utilizar Cloudflare R2 via `useR2Upload`. Nunca utilize Supabase Storage como destino padrão para galerias ou documentos pesados.
3. **Segurança de Dados e RLS**: Toda query, mutation ou nova tabela com dados de usuários deve obrigatoriamente respeitar a política de isolamento multi-tenant (`auth.uid() = user_id`).
4. **Ecossistema Compartilhado**: O banco de dados é compartilhado com o produto **Lunari Gallery**. Alterações em clientes, sessões, fotos e cobranças devem ser retrocompatíveis para não quebrar a galeria pública.
5. **IDs de Sessão do Workflow**: Os IDs das sessões possuem formato textual longo e único gerado pelo sistema; devem ser sempre tratados como strings, e nunca tipados ou parseados como UUIDs.
6. **Gateway de Pagamento**: O **Asaas** é o provedor atual e definitivo de billing e assinaturas. Tabelas e referências ao Stripe são código legado e não devem ser reutilizadas.

---

## 🛡️ 5. Checklist Obrigatório de Pré-Validação (Zero Regressões)

O comando `"build"` neste repositório roda apenas `"vite build"` (sem `tsc`), o que significa que o Vite **NÃO verifica variáveis inexistentes (`ReferenceError`) nem valida tipos TypeScript em tempo de compilação**.

Antes de dar qualquer tarefa por concluída, **siga obrigatoriamente**:

1. **Revisão Minuciosa do `git diff`**:
   - Rodar `git diff` nos arquivos alterados e verificar cada linha modificada.
   - Certificar-se de que nenhuma variável, flag local ou import existente foi apagado por engano (ex: `hasBottomNav`, `isEditor`, etc.).
2. **Escopo dos Componentes**:
   - Conferir se todas as variáveis, funções utilitárias (`cn`, etc.), ícones do Lucide e hooks utilizados no retorno JSX estão devidamente declarados ou importados.
3. **Validação Estática de Tipos**:
   - Rodar SEMPRE `npm run typecheck:changed`.
   - **NUNCA** validar uma tarefa se `npm run typecheck:changed` acusar qualquer erro de tipagem ou de variável não encontrada.
4. **Build de Produção**:
   - Rodar `npm run build` e confirmar que a compilação finaliza com código de saída 0.
5. **Componentes Nucleares**:
   - Tratar com cuidado redobrado arquivos que compõem o shell do sistema (`src/components/layout/Layout.tsx`, `PhotographerApp.tsx`, `App.tsx`), pois erros nesses arquivos derrubam a aplicação inteira para todos os usuários.
