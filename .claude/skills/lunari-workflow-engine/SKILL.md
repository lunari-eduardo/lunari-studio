# Skill: lunari-workflow-engine

**Propósito**: Guiar alterações no módulo de Workflow e Sessões, que é o coração da aplicação Lunari Studio. Engloba o estado das sessões, agendamentos (appointments), integração com Galerias e o controle financeiro por sessão.

## Responsabilidades
* Gestão de Sessões (`clientes_sessoes`).
* Sincronia de `appointments` -> `sessoes`.
* Produtos adicionais e Fotos Extras.
* Pagamentos associados à sessão (`clientes_transacoes`).
* Integração bidirecional com o Lunari Gallery.
* `WorkflowCacheContext` (Polling e Estado global de sessões).

## Regra de Ouro (Inquebrável)
**O frontend NÃO deve enviar `valor_pago` ou `valor_total` manual ou calculadamente em updates de sessão (PUT/PATCH).**
Esses valores são protegidos e calculados de forma reativa pelo banco de dados (via Postgres Triggers: `trigger_recompute_session_paid`, `trigger_recalculate_valor_total`). Tentar forçar esses valores via cliente causará bugs de concorrência ou será rejeitado/sobrescrito.

## IDs de Sessão
Diferente da maioria das entidades, o ID da sessão do Workflow (`session_id`) **é um formato de texto** (ex: `workflow-1771610846081-03ol8fqdrkbm`), e não um UUID padrão do Postgres. 

## Componentes Chave e Padrões
* **Sincronia de Estado**: A tela de Workflow usa `WorkflowCacheContext` que faz *polling* e compara modificações via campo `updated_at` para prevenir sobrescrita de dados concorrentes. Se for modificar a UI, utilize este contexto e não crie requisições de fetch isoladas que burlem o cache.
* **Componentes `WorkflowCardCollapsed` vs `WorkflowCardExpanded`**: Existe uma distinção arquitetural pesada na UI entre a visão colapsada (resumo no grid) e a visão expandida (detalhes financeiros, integração com galeria, congelamento de preços). Mantenha essa separação de responsabilidades.
* **Criação Atômica**: A criação de uma sessão a partir de um agendamento é feita via RPC (`create_session_from_appointment()`) para garantir segurança transacional.
* **Gallery Integration**: Status e seleções de fotos extras dependem do Lunari Gallery. Mudanças de fluxo devem preservar as chamadas cross-origin e redirecionamentos.
