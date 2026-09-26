# Auditoria e Plano Mestre de Implementação: Conversas 2.0 (Lunari Studio)

**Status:** Aprovado para execução técnica
**Escopo:** Refatoração Arquitetural e UX/UI do Módulo Conversas (Foco no Painel Direito Contextual e Assistente de IA)

---

## 1. Visão Geral e Princípios Diretivos

O módulo Conversas 2.0 deixa de ser apenas um espelho do WhatsApp para se tornar o **Motor de Ação Comercial do Lunari Studio**. O objetivo é reduzir a carga cognitiva do fotógrafo através de um painel de contexto "State-Driven" que prevê o que precisa ser feito e exibe apenas a informação necessária.

### Princípios da Refatoração:
- **Painel Direito Inteligente e Vertical:** Fim do modelo de abas (Modelos / Contexto / Notas). O painel passa a ser uma trilha vertical que adapta seus blocos conforme o estágio de relacionamento com o contato.
- **Header Otimizado:** A identificação do cliente (Foto, Nome, Telefone) sobe permanentemente para o `ChatHeader` no painel central, liberando espaço vertical nobre no painel direito.
- **Integração "Lu" Sob Demanda:** Introdução do assistente de IA "Lu" na barra superior, servindo como "co-piloto" do fotógrafo para criar leads, agendar sessões e sugerir respostas, sem executar ações destrutivas autonomamente.
- **Ações Determinísticas + Auxílio IA:** O painel direito sugere categorias e mensagens com base em algoritmos; a IA valida a propensão comercial, mas o clique final é sempre do fotógrafo.

---

## 2. Auditoria da Implementação Atual vs. UI Alvo

### 2.1 Análise Arquitetural
- **`ChatContextPanel.tsx` atual:**
  - Baseado em estado local de abas (`activeTab`: 'templates' | 'context' | 'notes').
  - Renderiza blocos com base em flags puramente booleanas (`isLinkedToCliente`, `isLinkedToLead`).
  - Ocupa espaço superior e inferior de forma ineficiente, escondendo notas e modelos.
- **Banco de Dados / Supabase:**
  - A tabela `conversas_templates` carece de suporte a anexo de mídias (fotos e PDFs), o que será exigido pelo novo sistema de templates.
  - O schema atual de `conversas_templates` não possui o campo `categoria` implementado na migration base (`20260911230000_conversas_schema.sql`), o que impede a filtragem contextual refinada proposta.
- **Cabeçalho Central (`ChatHeader.tsx`):**
  - Já possui Avatar, Nome e Telefone, mas disputa atenção com 3 botões de toggle do painel direito (Zap, Sparkles, StickyNote).

### 2.2 Diferenças Cruciais a Eliminar
1. **Fim das Abas:** O usuário visualizava uma aba por vez. No novo modelo, os "Cards" de inteligência se empilham de cima a baixo em uma visualização única.
2. **Criação de Leads (FastLeadModal):** Atualmente é manual e limpo. O alvo exige que a IA classifique silenciosamente a primeira mensagem, sugira o nicho/interesse e preencha o modal antecipadamente para o fotógrafo apenas confirmar. A criação automática invisível está **descartada** para evitar CRM sujo.
3. **Follow-up Automático:** Atualmente baseado em badges passivas. O alvo exige que o sistema assuma o controle do tempo configurado pelo estúdio e sugira ativamente a mensagem de retomada no "Card de Sugestões de Mensagens".

---

## 3. Arquitetura Proposta e Estrutura de Componentes

### 3.1 Novos Componentes do Painel Direito (`src/components/conversas/painel/`)
- `ContextPanelRoot.tsx`: O novo container principal substituto do `ChatContextPanel`, sem gerenciar abas de visualização.
- `StateResolver.ts`: Hook/Lógica central que avalia os dados de cliente/lead/sessões e decide qual dos 4 estados renderizar.
- **Cards Autônomos (Smart Cards):**
  - `InterestCard.tsx` (Possível interesse detectado pela IA para contatos novos).
  - `MessageSuggestionsCard.tsx` (Lista condensada de templates contextuais com barra de busca embutida).
  - `LeadContextCard.tsx` (Estágio, Serviço, Valor, Follow-up automático).
  - `WorkflowContextCard.tsx` (Capa/Foto do ensaio, pacote, data, local).
  - `FinancialSummaryCard.tsx` (Total da sessão, Recebido, Pendente).
  - `QuickActionsCard.tsx` (Ações dinâmicas que alteram seus botões de acordo com o estado do contato).
  - `FooterNotes.tsx` (Componente de input e lista de notas permanentemente pinado ao bottom).

### 3.2 Novo Componente de Assistência IA
- `LuAssistantPopover.tsx`: Acoplado ao botão `✦ Lu` adicionado ao `ChatHeader`. Apresenta a interface de interação rápida ("Resumir conversa", "Sugerir resposta", "Registrar pagamento", "Agendar sessão"), conectando-se ao back-end inteligente.

### 3.3 Alterações no Banco de Dados
Nova migration necessária (`YYYYMMDDHHMMSS_conversas_templates_v2.sql`):
```sql
ALTER TABLE public.conversas_templates ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'geral';
ALTER TABLE public.conversas_templates ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.conversas_templates ADD COLUMN IF NOT EXISTS media_type TEXT; -- ex: 'image', 'pdf'
```

---

## 4. O Motor de Estados da Interface (4 Estados Principais)

O novo Painel Direito opera como uma "State Machine" reativa, baseada nas seguintes condições mutuamente exclusivas:

### ESTADO 1 — Contato Desconhecido (Prospecção Inicial)
- **Gatilho:** Contato novo ou sem vínculo histórico no CRM (`cliente_id` é nulo e sem lead ativo).
- **Estrutura Renderizada:**
  1. `InterestCard`: Exibe apenas o texto limpo ("Possível interesse: Newborn") + Botão grande "Criar Lead / Oportunidade". Sem exibir % de confiança ou explicações de IA.
  2. `MessageSuggestionsCard`: Sugere templates de "Primeiro Atendimento".
  3. `ContactContextCard`: Apenas 4 campos vitais (Status, Origem, Primeiro contato, Mensagens).
  4. `QuickActionsCard`: Botões "Criar Lead", "Abrir Agenda", "Enviar Orçamento", "Mais".
  5. `FooterNotes`: Sempre presente no rodapé.

### ESTADO 2 — Lead / Oportunidade
- **Gatilho:** Contato vinculado a um `Lead` em andamento (não fechado/perdido) e sem sessão confirmada no futuro próximo.
- **Estrutura Renderizada:**
  1. `LeadContextCard`: Título forte com serviço e estágio do lead. Mostra Valor, Data e indicativo visual de Follow-up (ex: "Follow-up em 3 dias"). Sem responsáveis e dados administrativos pesados.
  2. `MessageSuggestionsCard`: Sugere templates específicos da etapa (ex: Lembrete de orçamento, Tirar dúvidas, Reforçar disponibilidade).
  3. `QuickActionsCard`: Botões "Abrir Agenda", "Criar Tarefa", "Mais". Atalhos como "Abrir orçamento" e "Atualizar etapa" pertencem logicamente ao LeadContextCard.
  4. `FooterNotes`.

### ESTADO 3 — Cliente com Sessão
- **Gatilho:** Contato possui registro na tabela `clientes_sessoes` com status em andamento/ativo.
- **Estrutura Renderizada:**
  1. `WorkflowContextCard`: Exibe a thumbnail visual da sessão, pacote, data, horário, e botão "Abrir Workflow".
  2. `MessageSuggestionsCard`: Sugere templates operacionais (Confirmar sessão, Enviar guia de preparação, Reagendar, Orientações).
  3. `FinancialSummaryCard`: Destaque simples para Total, Recebido (Verde) e Pendente (Vermelho), com botão "Ver detalhes".
  4. `QuickActionsCard`: "Registrar pagamento", "Abrir Workflow", "Criar tarefa", "Mais". (Removido atalho "Enviar Gallery", que migrou estritamente para dentro do Módulo Workflow/Gallery).
  5. `FooterNotes`.

### ESTADO 4 — Pós-Venda / Cliente Recorrente
- **Gatilho:** Cliente oficial da casa, sem oportunidade no pipeline e sem sessão pendente na agenda (historicamente já realizou ensaios).
- **Estrutura Renderizada:**
  1. `HistoryCard`: Bloco visual destacando a última sessão realizada e botão "Ver histórico".
  2. `MessageSuggestionsCard`: Sugere templates de recorrência (Acompanhamento, Datas comemorativas, Promoções, Novidades).
  3. `QuickActionsCard`: "Abrir Workflow", "Criar Tarefa", "Mais". Sem incentivo desnecessário para enviar galerias novas sem sessão ativa.
  4. `FooterNotes`.

---

## 5. Plano de Execução Dividido em Fases

Para mitigar riscos no ambiente operacional da agência, o roadmap deve ser entregue nas fases independentes descritas abaixo:

### Fase 1: Limpeza do Cabeçalho e Infraestrutura Vertical Base
**Objetivo:** Adaptar o `ChatHeader.tsx`, criar a fundação do container vertical flexível (sem abas) e garantir UX do mobile.
- **Arquivos:** `ChatHeader.tsx`, `WhatsAppLayout.tsx`, `ContextPanelRoot.tsx` (Novo), `FooterNotes.tsx` (Novo).
- **Ações:**
  - Remover botões legados de aba do Header.
  - Implementar botão `✦ Lu` discreto (UI apenas).
  - Integrar Avatar/Nome/Telefone no painel central permanentemente.
  - Criar o container rolável com bloco flexível, garantindo que o input de notas sobreviva sempre fixo ao bottom.

### Fase 2: Motor de Resolução de Estados e Cards Core
**Objetivo:** Substituir componentes e condicionais antigas do `ChatContextPanel` pela State Machine e Cards de inteligência.
- **Arquivos:** `useChatStateResolver.ts` (Novo), `InterestCard.tsx`, `LeadContextCard.tsx`, `WorkflowContextCard.tsx`, `QuickActionsCard.tsx`.
- **Ações:**
  - Hook reativo processa a hierarquia de status do CRM e retorna Enum de `State [1, 2, 3, 4]`.
  - Construir os layouts rigorosamente seguindo os pesos visuais fornecidos na Referência (Nível 1, 2 e 3 de tipografia).

### Fase 3: Migration de Banco e Configuração de Templates 2.0
**Objetivo:** Evoluir os "Modelos" para suportar categorias, anexo de mídia e inserção dinâmica.
- **Arquivos:** `202609..._conversas_templates_v2.sql`, `/pages/settings/TemplatesWhatsApp.tsx`, `MessageSuggestionsCard.tsx`.
- **Ações:**
  - Criar interface simples nas configurações gerais para edição fora do fluxo da conversa.
  - O Card lateral renderiza barra de busca condensada e botões "Inserir" laterais, colocando as variáveis processadas (`{nome}`) diretamente no `MessageComposer`.

### Fase 4: O "Cérebro" Global de Follow-up
**Objetivo:** Automatizar regras de inatividade para impulsionar engajamento em orçamentos.
- **Arquivos:** `useFollowUpEngine.ts`, utilitários de contagem de tempo.
- **Ações:**
  - Avaliar carimbo de tempo da última mensagem enviada vs configuração `lead_follow_up_config`.
  - O painel exibe um aviso claro se o orçamento foi ignorado X dias pelo cliente, alterando os templates sugeridos para "Recuperação/Lembrete".

### Fase 5: IA "Lu" Integrada & Automação Preenchida (Assistida)
**Objetivo:** Integrar Cloudflare Workers existentes à UI de conversas para sugerir caminhos sem bypass do fotógrafo.
- **Arquivos:** `LuAssistantPopover.tsx`, modificações em `FastLeadModal.tsx`.
- **Ações:**
  - Lógica de backend: Quando `MESSAGES_UPSERT` chega para um contato inédito, dispara worker secundário de NLP que atualiza o status de "Possível Interesse" local.
  - Ao clicar em "Criar Lead" no Estado 1, o Modal é aberto com Categoria, Origem e Detalhes da Mensagem pré-preenchidos.
  - Botão `✦ Lu` recebe as funções contextuais definitivas (Resumir conversa longa, Sugerir resposta baseada no último parágrafo).

---

## 6. UX e Regras Visuais (Checklist Rigoroso)

1. **Ergonomia e Flexbox Fix:** Áreas roláveis como a listagem principal do painel não devem ter cortes inferiores ocultos pelo sistema. Aplicar padding elástico baseado na safe-area do iOS.
2. **Espaçamento e Grid (Design System):** Alturas dos cards, respiros internos (`p-3`, `p-4`), e divisões sutis com linhas `<hr>` translúcidas.
3. **Skeleton Loading Sem Layout Shift:** Ao trocar de chat, o Painel Direito não pode pular. Skeletons bloqueiam os tamanhos previstos até que o React Query devolva os relacionamentos e sessões.
4. **Interação Contida de Templates:** **NENHUM template dispara envio automático**. A regra de inserir a sugestão no composer para leitura humana é inquebrável.

---

## 7. Critérios de Validação e Encerramento

Ao fim da Fase 5, a equipe técnica deve aprovar as seguintes garantias antes do deploy de produção:
- [ ] Nenhum erro estático TypeScript reportado (`npm run typecheck:changed` exit 0).
- [ ] Todas as informações vitais do cliente estão visíveis no cabeçalho central. Nenhuma foto duplicada no painel direito foi inserida.
- [ ] O Card de Sugestões de Templates altera seu contexto baseado no estágio comercial.
- [ ] Criar Lead a partir do card "Possível interesse" abre modal preenchido por inteligência e comita os dados apenas se autorizado.
- [ ] Painel mobile renderiza todo o contexto dentro do "Drawer/Sheet", sem travar a navegação touch nativa.
- [ ] Mídias anexadas a templates (após migration) não corrompem o envio e seguem pelo Worker assíncrono corretamente via Cloudflare R2.
