-- Migration: 20260921203000_secure_credit_revocation.sql
-- Blindagem de reversão e nova RPC de dedução segura de créditos

-- 1. Melhorar revoke_client_credit com proteções
CREATE OR REPLACE FUNCTION public.revoke_client_credit(
  p_ledger_id uuid,
  p_motivo text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_row public.cliente_creditos_ledger%ROWTYPE;
  v_current_saldo numeric;
  v_new_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_row FROM public.cliente_creditos_ledger WHERE id = p_ledger_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento não encontrado';
  END IF;

  IF v_row.user_id <> v_user_id THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF v_row.valor <= 0 THEN
    RAISE EXCEPTION 'Apenas lançamentos positivos de crédito podem ser revertidos';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cliente_creditos_ledger
    WHERE user_id = v_user_id
      AND cliente_id = v_row.cliente_id
      AND (
        descricao LIKE '%[REVOKE:' || p_ledger_id::text || ']%'
        OR descricao LIKE '%Reversão de lançamento ' || p_ledger_id::text || '%'
      )
  ) THEN
    RAISE EXCEPTION 'Este lançamento de crédito já foi revertido anteriormente.';
  END IF;

  SELECT COALESCE(saldo, 0) INTO v_current_saldo
  FROM public.v_cliente_saldo
  WHERE cliente_id = v_row.cliente_id;

  IF v_current_saldo < v_row.valor THEN
    RAISE EXCEPTION 'Saldo insuficiente para reverter o crédito integral. O cliente possui apenas R$ % de saldo disponível.', v_current_saldo;
  END IF;

  INSERT INTO public.cliente_creditos_ledger (
    user_id, cliente_id, data, valor, origem,
    session_id_origem, session_id_consumo, transacao_id, descricao, created_by
  ) VALUES (
    v_row.user_id, v_row.cliente_id, CURRENT_DATE, -v_row.valor,
    'reversao_grant',
    v_row.session_id_origem, v_row.session_id_consumo, v_row.transacao_id,
    COALESCE(NULLIF(trim(p_motivo), ''), 'Reversão de crédito') || ' [REVOKE:' || p_ledger_id::text || ']',
    v_user_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- 2. Criar deduct_client_credit para dedução direta de saldo
CREATE OR REPLACE FUNCTION public.deduct_client_credit(
  p_cliente_id uuid,
  p_valor numeric,
  p_motivo text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_cliente_user_id uuid;
  v_current_saldo numeric;
  v_new_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'O valor a deduzir deve ser maior que zero';
  END IF;

  SELECT user_id INTO v_cliente_user_id
  FROM public.clientes
  WHERE id = p_cliente_id;

  IF v_cliente_user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  IF v_cliente_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Sem permissão para este cliente';
  END IF;

  SELECT COALESCE(saldo, 0) INTO v_current_saldo
  FROM public.v_cliente_saldo
  WHERE cliente_id = p_cliente_id;

  IF v_current_saldo < p_valor THEN
    RAISE EXCEPTION 'Saldo insuficiente para dedução. O cliente possui apenas R$ % de saldo disponível.', v_current_saldo;
  END IF;

  INSERT INTO public.cliente_creditos_ledger (
    user_id, cliente_id, data, valor, origem,
    descricao, created_by
  ) VALUES (
    v_user_id, p_cliente_id, CURRENT_DATE, -p_valor,
    'reversao_grant',
    COALESCE(NULLIF(trim(p_motivo), ''), 'Remoção manual de crédito'),
    v_user_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_client_credit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_client_credit(uuid, numeric, text) TO authenticated;
