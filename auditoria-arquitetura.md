# Auditoria de Arquitetura — Painel do Contato & CRM

Este documento é a auditoria completa solicitada, contendo a investigação dos problemas atuais e a proposta arquitetural para transformar o Painel do Contato na fonte de verdade (Contexto Ativo) para a UI e para a IA (Lua).

---

## 1. Diagnóstico da Arquitetura Atual

Através da inspeção do código, identifiquei exatamente os pontos que causam os cenários relatados. O sistema atual trabalha com registros isolados e regras conflitantes espalhadas por três lugares diferentes (`useConversasContactContext`, `useChatStateResolver` e `ChatContextPanel`).

### Cenário 01: Cliente bloqueia novas oportunidades
**A Causa:** Na máquina de estados atual (`useChatStateResolver`), a validação segue uma ordem estrita "Top-Down". Se o contato possui um `client.id`, a máquina retorna o estado `CLIENT` imediatamente na etapa 3, **ignorando completamente a etapa 4** (onde verificaria se existe um `lead` ativo). 
**O Efeito:** Como a UI reage ao estado `CLIENT`, ela esconde o componente `ContactLeadOpportunityCard` (que exibe o botão "Criar Oportunidade"). Isso impede o fluxo de recorrência comercial, forçando o cliente a ficar "estático".

### Cenário 02: Competição visual de Sessões (Sessão de hoje vs Sessão de 2025)
**A Causa:** O frontend está tentando renderizar a "Sessão Agendada" e a "Sessão em Workflow" ao mesmo tempo, usando lógicas separadas que entram em colisão:
1. **O conceito de `nextSession`:** Filtra todas as sessões com `data >= hoje`. A sessão *Smash* (hoje) entra aqui, independente de já ter avançado no funil para "Fotografado", e é mostrada na UI como "Próxima sessão / Agendada".
2. **O conceito de `activeWorkflow`:** Filtra as sessões em pós-produção e as ordena da **mais antiga para a mais nova**. Isso significa que a sessão de 2025 (*Dia das Mães*) ganha a prioridade e bloqueia o ponteiro principal de Workflow.
**O Efeito:** O painel fica esquizofrênico, mostrando a sessão de hoje como "Agendada futura" e a de 2025 como "Em pós-produção ativa". 

---

## 2. Novo Modelo de Entidades e Relacionamentos

A solução exige abandonar a ideia de que "Lead" e "Cliente" são coisas mutuamente exclusivas (como se o Lead magicamente sumisse ao virar Cliente). 

O modelo deve ser:
* **Contato (`conversas_contatos`)**: A identidade base (WhatsApp/Insta). O Contato se relaciona com 1 Cliente no máximo.
* **Cliente (`clientes`)**: O cadastro do indivíduo (dados fiscais, telefone base).
* **Oportunidade (`leads`)**: Uma negociação. **Um cliente recorrente PODE (e deve) ter múltiplas oportunidades**. A tabela de `leads` já possui o campo `cliente_id` que deve ser populado para negócios recorrentes.
* **Sessão (`sessoes`)**: O produto da oportunidade ganha.

**Regra de Ouro:** A criação de uma oportunidade para um cliente existente **nunca** duplica o cliente, apenas gera uma nova linha na tabela de `leads` vinculada ao `cliente_id`.

---

## 3. Máquina de Estados e o Contexto Ativo (Active Context)

Proponho substituir o estado fragmentado atual por um objeto consolidado de **Contexto Ativo**. Em vez de a UI tentar adivinhar qual card mostrar baseada em variáveis soltas (`nextSession`, `lastSession`, `activeWorkflow`), o backend/hook retornará apenas **UM contexto principal** e o histórico.

### Prioridade Inegociável da Máquina de Estados (Contexto Ativo):
1. **`ACTIVE_SESSION`**: Existe uma sessão ativa (em pós-produção, ou agendada para HOJE).
   * *Regra anti-bloqueio:* Se houver múltiplas, a prioridade é a **mais recente** (Smash de hoje), rebaixando a de 2025 para "Atrasada/Histórico".
2. **`NEXT_SESSION`**: Existe uma sessão agendada para o futuro (amanhã em diante).
3. **`OPEN_OPPORTUNITY`**: Existe um lead aberto (novo negócio), independentemente de ser cliente recorrente ou não.
4. **`CLIENT`**: Cliente base, sem oportunidade aberta no momento e sem sessões. (Exibe botão para Nova Oportunidade).
5. **`NEW_CONTACT`**: Contato sem vínculo. (Exibe botão para Criar Cliente/Lead).

---

## 4. Nova Hierarquia do Painel Lateral (UI)

O painel será reestruturado para eliminar ruído e manter o foco na ação imediata.

1. **Card de Cabeçalho (Identidade)**: Nome, Foto, e se é (Cliente, Lead, Contato Novo).
2. **Card Principal do Contexto (Apenas 1 será exibido)**:
   * Se estado = `ACTIVE_SESSION`: Mostra card de Workflow + Financeiro acoplado.
   * Se estado = `OPEN_OPPORTUNITY`: Mostra card comercial com valores, origem e follow-up.
   * Se estado = `CLIENT`: Mostra CTA sutil "Iniciar nova negociação (Oportunidade)".
3. **Card de Sugestões / Ações Rápidas**: Dinâmico de acordo com o contexto principal.
4. **Acordeão de Histórico (Colapsável)**:
   * "Trabalhos Anteriores (2)" - Fica fechado por padrão. É aqui que a sessão de 2025 do Dia das Mães deve morar.

---

## 5. Triggers e Sincronização Necessária

Para garantir que o painel e a Lua não dependam de refresh da tela, precisamos das seguintes garantias reativas:

1. **Alteração de Etapa do Workflow**: Hoje a tabela `sessoes` não dispara evento claro para a tabela de `conversas_contatos`. A UI deve escutar as mudanças na tabela `sessoes` usando Supabase Realtime (já implementado no `WorkflowCacheContext` mas não consumido pelo Contexto de Conversas) para recalcular a máquina de estados.
2. **Nova Mensagem Recebida**: Dispara atualização na `ultima_interacao` do `conversas_contatos`. Se o estado for `OPEN_OPPORTUNITY`, o painel deve limpar a flag `needs_follow_up`.
3. **Recebimento de Pagamento**: A integração webhook do Asaas precisa emitir um sinal Realtime ou invalidar a query de sessão para que o card principal atualize o "Financeiro da Sessão" ao vivo.

---

## 6. Escalabilidade para a IA (Lua)

O maior benefício dessa refatoração é estrutural. A Lua não pode consumir as 5 entidades separadamente porque ela vai se confundir exatamente como a UI fez (achando que a sessão de 2025 é a prioridade).

O hook de Contexto Ativo produzirá um único JSON simplificado, por exemplo:
```json
{
  "contextType": "ACTIVE_SESSION",
  "activeItem": {
     "id": "uuid-da-sessao",
     "title": "Smash 26",
     "step": "fotografado",
     "pendingPayment": 280
  },
  "history": [...]
}
```
Isso será injetado no prompt de sistema da Lua, permitindo que ela saiba instantaneamente: "A cliente está na fase de fotos aguardando edição, e deve R$ 280".

---

## 7. Plano de Implementação (Fases)

Para evitar regressões, a implementação deve seguir as fases:

* **Fase 1 (Backend do Contexto)**: Reescrever `useChatStateResolver.ts` e `useConversasContactContext.ts` para adotar a nova máquina de estados estrita. Retornar um objeto de estado único que já decida quem ganha a prioridade (Sessão de Hoje > Sessão de 2025) e trate clientes com oportunidades.
* **Fase 2 (Casca da UI)**: Limpar `ChatContextPanel.tsx` para parar de forçar múltiplos cards baseados em variáveis soltas. Fazer o painel acionar um switch-case com base no estado consolidado.
* **Fase 3 (Sub-componentes)**: Refatorar o `ContactLeadOpportunityCard` para aparecer também quando o estado for `CLIENT`, habilitando o fluxo de criação de Oportunidade para base recorrente.
* **Fase 4 (Histórico)**: Empacotar todo o lixo e sessões antigas dentro de um componente secundário (Acordeão de Histórico).

Estou pronto para iniciar a implementação da Fase 1 assim que você aprovar a arquitetura proposta.
