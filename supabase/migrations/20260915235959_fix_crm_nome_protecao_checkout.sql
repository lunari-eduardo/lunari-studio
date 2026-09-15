-- ============================================================
-- PROTEÇÃO CRM NO CHECKOUT: não salvar nome do CRM como nome de checkout
-- Bug: gallery-create-payment usava hints.name (CRM nome) como fallback,
-- poluindo checkout_preferences com nome do CRM.
-- Fix: upsert_checkout_preferences agora verifica se nome recebido é igual
-- ao nome do CRM e ignora (NULL) nesse caso.
-- ============================================================

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
  v_crm_nome text;
BEGIN
  -- Buscar user_id e nome do CRM para manter integridade e proteção
  SELECT user_id, nome INTO v_user_id, v_crm_nome
  FROM public.clientes
  WHERE id = p_cliente_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  -- CRÍTICO: não salvar nome que veio do CRM como nome de checkout.
  -- O nome do checkout é independente do CRM. Se o nome recebido for igual
  -- ao nome do CRM, tratar como "não fornecido" (NULL) para não poluir
  -- checkout_preferences com dados do CRM.
  IF p_nome_preferido IS NOT NULL AND v_crm_nome IS NOT NULL
     AND btrim(lower(p_nome_preferido)) = btrim(lower(v_crm_nome)) THEN
    p_nome_preferido := NULL;
  END IF;

  -- Upsert: insere ou atualiza
  -- CRÍTICO: nome_preferido só é salvo se ainda NÃO existir (protege contra edições posteriores)
  -- O UI permite edição, mas o backend protege o valor original da primeira vez
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
    -- Nome: só salva se ainda não existir (proteção "primeira vez wins")
    nome_preferido = CASE
      WHEN cliente_checkout_preferences.nome_preferido IS NOT NULL
        THEN cliente_checkout_preferences.nome_preferido
      ELSE COALESCE(p_nome_preferido, cliente_checkout_preferences.nome_preferido)
    END,
    -- Outros campos: COALESCE padrão (preenche se vazio)
    email_preferido = COALESCE(p_email_preferido, cliente_checkout_preferences.email_preferido),
    telefone_preferido = COALESCE(p_telefone_preferido, cliente_checkout_preferences.telefone_preferido),
    cpf_preferido = COALESCE(p_cpf_preferido, cliente_checkout_preferences.cpf_preferido),
    updated_at = now()
  RETURNING id INTO v_prefs_id;

  RETURN v_prefs_id;
END;
$$;
