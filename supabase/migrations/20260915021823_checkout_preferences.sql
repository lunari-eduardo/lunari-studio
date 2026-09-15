-- ============================================================
-- CHECKOUT PREFERENCES: nome_checkout em clientes
-- Resolve: cliente atualiza nome no checkout → não afeta CRM
--
-- Estratégia: coluna dedicada em `clientes.nome_checkout`, separada
-- do nome do CRM. Regra "primeira vez wins": se já existe
-- nome_checkout, alterações posteriores são descartadas pelo backend.
-- ============================================================

-- Adicionar coluna nome_checkout se ainda não existir
-- (idempotente — pode ser rodada em bancos onde a coluna já foi criada manualmente)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS nome_checkout text;

COMMENT ON COLUMN public.clientes.nome_checkout IS
  'Nome preferido pelo cliente para uso em checkouts/pagamentos. '
  'Diferente do nome do CRM, não é alterado pelo fotógrafo. '
  'Backend aplica regra "primeira vez wins" — edições posteriores são descartadas.';

-- Índice parcial para acelerar buscas pelos clientes que já têm nome_checkout
CREATE INDEX IF NOT EXISTS idx_clientes_nome_checkout
  ON public.clientes(nome_checkout)
  WHERE nome_checkout IS NOT NULL;

-- ============================================================
-- LIMPEZA: remover tabela/função legadas da abordagem anterior
-- (tabela cliente_checkout_preferences + upsert_checkout_preferences)
-- Só remove se existirem — não falha em bancos já limpos.
-- ============================================================

DROP TABLE IF EXISTS public.cliente_checkout_preferences CASCADE;
DROP FUNCTION IF EXISTS public.upsert_checkout_preferences CASCADE;
DROP FUNCTION IF EXISTS public.update_checkout_prefs_updated_at CASCADE;
