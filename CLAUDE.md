# Lunari Studio - Regras Globais de Desenvolvimento

Este arquivo define o contrato geral de desenvolvimento do Lunari Studio. Para tarefas complexas, utilize a arquitetura de **Skills** localizada em `.claude/skills/`.

## Arquitetura
* **Stack Principal**: React 18 + TypeScript + Vite.
* **Estilização**: Tailwind CSS.
* **Componentes Base**: shadcn/ui e Radix UI.
* **BaaS (Backend)**: Supabase (Auth, PostgreSQL, Edge Functions, Storage).
* **Camada Distribuída**: Cloudflare Workers (quando aplicável para integrações e APIs otimizadas).
* **PWA**: Vite-plugin-pwa gerenciado com Workbox.
* **Estado e Contexto**: Uso extensivo de Context Providers e custom hooks que **devem ser respeitados**.

## Organização do Frontend (`src/`)
A aplicação segue uma forte separação por domínio de negócio na pasta `src/components/` (ex: `admin/`, `agenda/`, `clientes/`, `financas/`, `workflow/`). Os contextos globais ficam em `src/contexts/` e a lógica reaproveitável em `src/hooks/`.

## Regras Inquebráveis
* **Cálculos Financeiros Backend**: O frontend **NUNCA** deve enviar `valor_pago` ou `valor_total` nos updates de sessão. Esses valores são responsabilidade exclusiva de triggers no banco de dados.
* **Ordem de Proteção de Rotas**: O onboarding deve ser verificado **antes** da assinatura/paywall dentro do fluxo protegido.
* **PWA Caching Segura**: Bibliotecas pesadas como `mermaid`, `wasm` e `shiki` **não devem** entrar no precache do Service Worker (`vite.config.ts`).
* **Segurança de Dados**: Toda nova tabela com dados de usuários deve obrigatoriamente possuir RLS (Row Level Security) apropriado (`auth.uid() = user_id`).
* **Ecossistema Compartilhado**: O banco de dados é compartilhado com o projeto **Lunari Gallery**. Alterações em recursos compartilhados (clientes, sessões, cobranças) devem considerar o impacto no Gallery.
* **Ciclo de Vida de Estado**: É vital preservar a limpeza de estado dos Context Providers no evento de logout.
* **Acesso**: A lógica atual de autorização e planos (`useAccessControl`, `get_access_state()`) não deve ser contornada.
* **IDs de Sessão**: IDs de sessão do workflow possuem formato textual longo e devem ser tratados como texto, não como UUID.
* **Cache Busting**: O mecanismo atual injetado via `__BUILD_COMMIT__` deve ser preservado.

## Código Legado (Atenção)
* **Assinaturas**: Stripe possui estruturas legadas no banco e código (`plans`, `subscriptions`) que **não devem ser reutilizadas** como fonte atual de billing. O **Asaas** é o provedor definitivo e atual.
* **Integrações de Pagamento**: A função `infinitepay-create-link` é legada. A implementação recomendada e atual é baseada em JWT (`gestao-infinitepay-create-link`).
* **Finanças**: A tabela `financial_items` é legada e foi substituída por `fin_items_master`.
* Não utilize estruturas legadas como base para implementar novas funcionalidades.

## Regras de Segurança e Mudança
**Princípio de Menor Mudança**: Quando uma tarefa puder ser resolvida com uma alteração localizada, **não refatore** ou reestruture partes não solicitadas do sistema.
Antes de modificar código crítico, busque a implementação existente e entenda as dependências em vez de reescrever do zero.

## Skills Disponíveis
Para tarefas específicas, consulte as instruções em `.claude/skills/`:
* `lunari-change-safety`: **Leitura Obrigatória** para orientações de como alterar código sem gerar regressões sistêmicas.
* `lunari-core-db`: Regras e contexto sobre o Postgres, tabelas, RLS e RPCs (Supabase).
* `lunari-billing-access`: Regras sobre autenticação, onboarding, planos (Asaas) e paywall.
* `lunari-workflow-engine`: Regras cruciais do módulo central de Sessões, Agenda e cálculos do Workflow.
* `lunari-ui-pwa`: Instruções sobre Tailwind, shadcn/ui, perfomance e Service Workers.
* `lunari-edge-integrations`: Contexto sobre os Cloudflare Workers (APIs, R2, propostas IA, previews).
