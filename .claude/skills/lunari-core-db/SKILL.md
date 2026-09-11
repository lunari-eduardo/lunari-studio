# Skill: lunari-core-db

**Propósito**: Guiar interações, consultas e alterações relacionadas ao banco de dados Supabase (PostgreSQL), suas policies (RLS), Triggers, Views e RPCs.

## Contexto do Banco
O Lunari opera com cerca de 42 tabelas principais e 5 views. **O banco é compartilhado com o projeto Lunari Gallery**, o que significa que alterações estruturais ou de regras podem quebrar a aplicação vizinha.

## Responsabilidades
* Gerenciamento de Migrations (`supabase/migrations/`).
* Definição e alteração de tabelas.
* Row Level Security (RLS).
* Triggers Postgres.
* Remote Procedure Calls (RPCs).
* Integridade Relacional.

## Regras Inquebráveis

### 1. Políticas de Segurança (RLS)
* **Nunca** crie uma tabela contendo dados do cliente/usuário sem ativar o RLS.
* A regra padrão inquebrável para dados dos fotógrafos é restringir a leitura/escrita usando: `auth.uid() = user_id`.

### 2. Triggers e Regras de Negócio
O sistema confia cegamente em Triggers para manter a consistência financeira. **Não mova para o frontend cálculos que pertencem ao backend.**
* `trigger_recompute_session_paid`: Recalcula o `valor_pago` de uma sessão na tabela `clientes_sessoes`.
* `trigger_recalculate_valor_total`: Recalcula o `valor_total` de uma sessão na tabela `clientes_sessoes`.
* `sync_gallery_status_to_session`: Mantém o sincronismo vital com as escolhas feitas pelos clientes finais no Lunari Gallery.
* **Nunca** altere um trigger crítico sem analisar minuciosamente os consumidores no frontend e no Gallery.

### 3. RPCs Críticas
* `get_access_state()`: O motor central que valida permissões (Assinatura, Trial, Admin, VIP).
* `create_session_from_appointment()`: Cria a sessão atomicamente com lock transacional no banco.
* **Atenção**: Não crie novas RPCs que contornem a segurança (bypass de RLS) de forma indevida sem um bloqueio por `SECURITY DEFINER` rigorosamente testado.

### 4. Código Legado
O banco ainda contém tabelas legadas relacionadas ao Stripe (ex: `plans`, `subscriptions`) e antigas tabelas financeiras (`financial_items`). **Não as utilize** para novas implementações. A fonte de verdade financeira baseia-se em `unified_plans`, `subscriptions_asaas` e `fin_items_master`.
