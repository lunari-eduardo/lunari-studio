-- ============================================================
-- CHECKOUT PREFERENCES: Nome preferido do checkout por cliente
-- Resolve: cliente atualiza nome no checkout → não afeta CRM
-- ============================================================

-- Tabela para armazenar preferências de checkout do cliente
-- separada do CRM (clientes) para evitar atualizações acidentais
CREATE TABLE public.cliente_checkout_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  -- Nome preferido para usar no checkout (pode ser diferente do CRM)
  -- Ex: CRM tem "Maria da Silva e João", checkout usa "Maria"
  nome_preferido text,
  -- Dados de contato preferidos para o checkout (separados do CRM)
  email_preferido text,
  telefone_preferido text,
  cpf_preferido text,
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Constraint: apenas um registro por cliente
  UNIQUE(cliente_id)
);

-- Index para buscas rápidas por cliente
CREATE INDEX idx_checkout_prefs_cliente_id ON public.cliente_checkout_preferences(cliente_id);
CREATE INDEX idx_checkout_prefs_user_id ON public.cliente_checkout_preferences(user_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE public.cliente_checkout_preferences ENABLE ROW LEVEL SECURITY;

-- Fotógrafo pode ver e gerenciar as preferences dos seus clientes
CREATE POLICY "Fotógrafo gerencia checkout preferences dos seus clientes"
ON public.cliente_checkout_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_checkout_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checkout_prefs_updated_at
  BEFORE UPDATE ON public.cliente_checkout_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_checkout_prefs_updated_at();

-- ============================================================
-- RPC: upsert_checkout_preferences
--============================================================
CREATE OR REPLACE FUNCTION public.upsert_checkout_preferences(
  p_cliente_id uuid,
  p_nome_preferido text DEFAULT NULL,
  p_email_preferido text DEFAULT NULL,
  p_telefone_preferido text DEFAULT NULL,
  p_cpf_preferido text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_prefs_id uuid;
BEGIN
  -- Buscar user_id do cliente para manter integridade
  SELECT user_id INTO v_user_id
  FROM public.clientes
  WHERE id = p_cliente_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  -- Upsert: insere ou atualiza
  INSERT INTO public.cliente_checkout_preferences (
    cliente_id,
    user_id,
    nome_preferido,
    email_preferido,
    telefone_preferido,
    cpf_preferido
  )
  VALUES (
    p_cliente_id,
    v_user_id,
    p_nome_preferido,
    p_email_preferido,
    p_telefone_preferido,
    p_cpf_preferido
  )
  ON CONFLICT (cliente_id) DO UPDATE SET
    nome_preferido = COALESCE(p_nome_preferido, cliente_checkout_preferences.nome_preferido),
    email_preferido = COALESCE(p_email_preferido, cliente_checkout_preferences.email_preferido),
    telefone_preferido = COALESCE(p_telefone_preferido, cliente_checkout_preferences.telefone_preferido),
    cpf_preferido = COALESCE(p_cpf_preferido, cliente_checkout_preferences.cpf_preferido),
    updated_at = now()
  RETURNING id INTO v_prefs_id;

  RETURN v_prefs_id;
END;
$$;

-- Permissão para service role (Edge Functions usam service key)
GRANT EXECUTE ON FUNCTION public.upsert_checkout_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cliente_checkout_preferences TO service_role;

-- Grant para anon também para leitura (checkout-get-data pode precisar)
GRANT SELECT ON TABLE public.cliente_checkout_preferences TO anon, authenticated;
