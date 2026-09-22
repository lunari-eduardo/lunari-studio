---
trigger: always_on
description: Regras inquebráveis de segurança de banco de dados, PostgreSQL, RLS e integrações do Lunari Studio
---

# Regras de Segurança de Banco de Dados & Backend (Lunari Studio)

---

## 🔒 1. Row Level Security (RLS) Mandatório
- Toda tabela no Supabase que contenha dados de usuários DEVE ter RLS ativado.
- A política padrão para consultas e escritas deve sempre verificar:
  ```sql
  auth.uid() = user_id
  ```
- No frontend, nunca confie apenas em filtros de cliente; o RLS é a garantia final de isolamento entre fotógrafos.

---

## 💰 2. Triggers Financeiros & Valores Calculados
- **Valores de Sessão e Workflow**: O frontend **NUNCA** envia nem tenta calcular:
  - `valor_pago`
  - `valor_total`
  - `status_financeiro`
- Esses campos são atualizados e recalculados exclusivamente por **Triggers no PostgreSQL**. Qualquer envio manual desses campos pelo cliente pode sobrescrever o histórico financeiro e corromper o fluxo de caixa.

---

## ☁️ 3. Cloudflare R2 vs Supabase Storage
- O Supabase Storage é restrito a dados pequenos de sistema ou legados.
- **Mídias pesadas, fotos de galerias, previews e documentos contratuais** devem ser enviados para o Cloudflare R2 através do worker dedicado via hook `useR2Upload`.

---

## 🔄 4. Ecossistema Compartilhado (Lunari Gallery)
- O banco de dados PostgreSQL é compartilhado entre o **Lunari Studio** e o **Lunari Gallery**.
- Mudanças em tabelas de `clientes`, `clientes_sessoes`, `galerias` e `pagamentos` devem manter compatibilidade retroativa para não interromper os clientes finais que acessam as galerias de fotos.

---

## 🚫 5. Código Legado a Evitar
- **Stripe**: Estruturas de `plans` e `subscriptions` do Stripe são legadas. O provedor atual é o **Asaas**.
- **`infinitepay-create-link`**: Função legada. O padrão atual é `gestao-infinitepay-create-link` (baseado em JWT).
- **`financial_items`**: Tabela legada; a tabela em uso é `fin_items_master`.
