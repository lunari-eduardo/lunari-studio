# Auditoria e Plano de Implementação: Card de Cliente Inteligente (Conversas)

## 1. Auditoria da Estrutura Atual e Problemas Encontrados

Após uma varredura completa nos componentes de contexto de Conversas (`src/components/conversas/context/cards`), observou-se o seguinte:

- **Top Card Poluído (`ContactHeaderCard.tsx`)**: O cartão possui foto grande do contato, número do telefone visível repetindo o subtítulo, botão explícito (e com cor de marca - verde) para WhatsApp e botão de 3 pontos sem função clara. A lógica de tags (Lead, Cliente, Cliente recorrente) já funciona via `useChatStateResolver`, mas divide espaço com esses excessos visuais. Não há link direto para abrir o cliente no CRM usando `cliente_id`.
- **Sessões Fragmentadas e Mockadas**: Existem hoje dois cartões, `WorkflowContextCard.tsx` e `HistoryCard.tsx`. O WorkflowContextCard exibe "Próxima sessão", mas o `HistoryCard` está fortemente populado com mockups visuais (fotos fixas do Unsplash, textos "Newborn" hardcoded).
- **Sobrecarga de Requisições de Rede (Overhead)**: O hook `useConversasContactContext.ts` gerencia o contexto do cliente acionando o React Query, porém ele realiza de **6 a 8 requisições separadas (concorrentes)** para formar o painel (busca cliente, sessoes, lead, orçamentos, tarefas, cobrancas, etc).
- **Falta do "Local" na Query**: O frontend espera `local_ensaio`, mas o hook `useConversasContactContext` consulta a tabela `clientes_sessoes` sem incluir essa coluna.
- **Isolamento do Workflow**: A página `src/pages/Workflow.tsx` é uma Single Page Application complexa em Kanban, e **não intercepta parâmetros de URL** como `?open_session=id`. Logo, o botão "Ver no Workflow" redireciona hoje às cegas (apenas joga para a rota `/app/workflow`), sem foco automático na sessão.

---

## 2. Arquitetura Proposta

O design propõe fundir e simplificar a interface para seguir o **Design DNA do Lunari (Luxo Silencioso)**, além de mudar a estratégia de consumo de dados para um formato Ultra-Leve e Orientado a Servidor.

### 2.1 Reestruturação do Contact Header
O cartão de cabeçalho manterá a hierarquia limpa (Nível 1 de destaque):
- Ocultar Avatar grande e telefone (já estão no topo do chat).
- Remover o botão verde do WhatsApp e o botão de 3 pontos.
- Substituir o conteúdo por: **Nome**, **Etiqueta principal (Lead/Cliente)**, e Botão neutro de CTA: **"Ver Cliente"**.
- Ação: O botão executa `navigate(\`/app/clientes/${chat.cliente_id}\`)`, aproveitando a rota existente e isolando 100% de buscas por nome.

### 2.2 Smart Session Context Card (Fusão)
Criação de um novo cartão único `SmartSessionCard` fundindo Histórico e Workflow, reaproveitando a tabela fonte-de-verdade (`clientes_sessoes`):
- O contexto recebe as sessões ordenadas do banco (`order: data_sessao DESC`).
- **Decisão Automática (Lógica de Cliente)**:
  - O código dividirá a matriz de sessões entre `futuras` e `passadas` baseado em `new Date(sessao.data_sessao) >= hoje`.
  - Se a lista `futuras` possuir itens, a "Próxima sessão" a ser exibida como herói será a mais próxima de acontecer (`futuras[ultimo]`).
  - Caso não haja futuras, a "Última sessão" (mais recente do passado) assume a posição de herói.
- **Histórico Ultraleve**: Uma sublista de no máximo 3 sessões (excluindo a herói) será renderizada apenas em texto tipográfico (Pacote, Data e Local, sem foto thumbnail).

### 2.3 Integração: Rota Dinâmica no Workflow
- Adicionar leitura de `searchParams` (ex: `?open_session=UUID`) na montagem base do `Workflow.tsx`.
- O módulo de roteamento de contexto dentro do calendário forçará o painel `ExpandedFinances` ou o formulário de Sessão daquele ID a abrir se a URL estiver presente.
- Isso dispensa buscar pelo nome e vai direto à fonte, acionando as mutations exatas.

### 2.4 Estratégia de Consultas e Cache (Mata o N+1 e o Overhead)
1. **Nenhum JOIN inicial**: A lista de conversas `useConversasState.ts` não deve jamais saber sobre sessões. Só dados de Chat. (Já está correto no sistema).
2. **Visualização por Demanda com RPC (Opcional e Escalável)**: Para abater as 8 requisições do painel do contexto, implementaremos uma função SQL (RPC) chamada `get_conversas_cliente_context(p_cliente_id UUID)`.
   - Essa RPC fará um `SELECT JSON_BUILD_OBJECT( ... )` devolvendo as Sessões, Cobranças e Tarefas pendentes em uma *única* Query JSON.
   - O hook será enxugado para realizar uma única chamada (`supabase.rpc`), populando todos os dados sob um mesmo `staleTime` de React Query (2 minutos).
   - O cache será validado em *Realtime* apenas nas mutations locais (ao criar tarefa ali dentro) e invalida de imediato se o painel for aberto e houver mudanças de pagamento em background via trigger.

---

## 3. Plano de Implementação em Fases

### Fase 1: Limpeza Visual e Lógica (Smart Card)
**Foco:** Refatorar a interface do Context Panel sem mexer no servidor, arrumando a query atual de Sessoes.
- Modificar a query em `useConversasContactContext.ts` para incluir `local_ensaio`.
- Criar `src/components/conversas/context/cards/SmartSessionCard.tsx`.
- Remover `WorkflowContextCard.tsx` e `HistoryCard.tsx`.
- Refatorar `ContactHeaderCard.tsx` (deletar foto, tags antigas, botões sociais; inserir `navigate('/app/clientes/:id')`).
- *Impacto:* Redução de complexidade visual; fim das imagens mockadas e histórico funcional com decisões baseadas na data atual.

### Fase 2: O Roteamento de Workflow
**Foco:** Garantir que o Fotógrafo pule perfeitamente do Chat para a Sessão.
- Atualizar o `SmartSessionCard` para injetar no botão o ID via: `navigate(\`/app/workflow?open_session=${sessao.id}\`)`.
- Modificar `src/pages/Workflow.tsx` e o provider `WorkflowMonthDataContext.tsx` para extrair este query param.
- Fazer a lógica para abrir programaticamente a linha da sessão correspondente (talvez despachando um state global provisório `SessionExpandedModal`).
- *Impacto:* Workflow finalmente navegável de forma direta (zero pesquisa manual do usuário).

### Fase 3: Otimização Severa (Single Query Context)
**Foco:** Transformar as 8 consultas concorrentes do painel direito em apenas 1.
- Criar a migration de banco de dados `rpc_get_conversas_cliente_context`.
- Atualizar o React Query dentro do `useConversasContactContext.ts` para bater nessa nova API.
- *Impacto:* Painel do conversas abre ~30% mais rápido em conexões móveis, pois remove o overhead de TLS e conexões concorrentes da API Rest do Supabase, resolvendo o "Context N+1" indireto no lado do cliente.

---

## 4. Arquivos Impactados

- `src/components/conversas/context/ChatContextPanel.tsx`
- `src/components/conversas/context/cards/ContactHeaderCard.tsx`
- `src/components/conversas/context/cards/SmartSessionCard.tsx` (Novo)
- `src/hooks/useConversasContactContext.ts`
- `src/pages/Workflow.tsx` (E hooks associados de roteamento)

## 5. Critérios de Teste

- [ ] Clicar no botão "Ver Cliente" precisa abrir os detalhes do cliente e isolá-lo de qualquer outro.
- [ ] O Smart Card **DEVE** pular para "Última sessão" automaticamente se as datas futuras não existirem no sistema. O pacote e o local não podem repetir no histórico de "recentes".
- [ ] Mudar uma aba na conversa (ex: carregar mais um cliente) não trava o navegador aguardando 8 requests em série. O Cache gerencia imediatamente ou a RPC descarrega o pacote completo.
- [ ] O Build Vite não pode quebrar por tipo (`npm run typecheck:changed` deve retornar limpo) ao substituir os componentes de cartões.
