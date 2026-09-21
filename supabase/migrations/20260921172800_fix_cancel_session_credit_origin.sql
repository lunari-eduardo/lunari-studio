CREATE OR REPLACE FUNCTION public.delete_workflow_session_cascade(p_session_pk uuid, p_action text DEFAULT 'remove'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_session_text_id text;
  v_appointment_id uuid;
  v_appt_session_text text;
  v_texts text[];
  v_session_user_id uuid;
  v_session_status text;
  v_cliente_id uuid;
  v_deleted_transactions integer := 0;
  v_unlinked_transactions integer := 0;
  v_estornos_criados integer := 0;
  v_deleted_cobrancas integer := 0;
  v_unlinked_cobrancas integer := 0;
  v_deleted_session integer := 0;
  v_deleted_appointment integer := 0;
  v_total_paid numeric;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF p_action NOT IN ('preserve', 'refund', 'remove', 'cancel_credit', 'cancel_refund', 'cancel_preserve') THEN
    RAISE EXCEPTION 'Invalid action: %. Must be preserve, refund, remove, cancel_credit, cancel_refund, or cancel_preserve', p_action;
  END IF;

  SELECT session_id, appointment_id, user_id, status, cliente_id
  INTO v_session_text_id, v_appointment_id, v_session_user_id, v_session_status, v_cliente_id
  FROM clientes_sessoes
  WHERE id = p_session_pk;

  IF v_session_user_id IS NULL THEN
    RAISE EXCEPTION 'Session not found: %', p_session_pk;
  END IF;

  IF v_session_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Permission denied: session does not belong to current user';
  END IF;

  IF p_action IN ('cancel_credit', 'cancel_refund', 'cancel_preserve') THEN
    IF v_session_status = 'cancelada' THEN
      RAISE EXCEPTION 'SessÃ£o jÃ¡ se encontra cancelada.';
    END IF;
  END IF;

  -- session_id textual do appointment
  IF v_appointment_id IS NOT NULL THEN
    SELECT session_id INTO v_appt_session_text
    FROM appointments
    WHERE id = v_appointment_id AND user_id = v_user_id;
  END IF;

  v_texts := ARRAY(
    SELECT DISTINCT x FROM unnest(ARRAY[v_session_text_id, v_appt_session_text]) AS x
    WHERE x IS NOT NULL
  );

  -- ============================================================
  -- CANCELAMENTO DE SESSÃƒO
  -- ============================================================
  IF p_action IN ('cancel_credit', 'cancel_refund', 'cancel_preserve') THEN
    IF array_length(v_texts, 1) > 0 THEN
      -- Delete pending cobrancas
      DELETE FROM cobranca_parcelas
      WHERE cobranca_id IN (
        SELECT id FROM cobrancas
        WHERE session_id = ANY(v_texts) AND user_id = v_user_id AND status <> 'pago'
      );

      DELETE FROM cobrancas
      WHERE session_id = ANY(v_texts) AND user_id = v_user_id AND status <> 'pago';
      GET DIAGNOSTICS v_deleted_cobrancas = ROW_COUNT;

      IF p_action = 'cancel_credit' THEN
        SELECT COALESCE(SUM(valor), 0) INTO v_total_paid
        FROM clientes_transacoes
        WHERE session_id = ANY(v_texts) AND user_id = v_user_id AND tipo = 'pagamento';

        IF v_total_paid > 0 THEN
          INSERT INTO cliente_creditos_ledger (
            user_id, cliente_id, valor, data, origem, descricao, session_id_origem
          ) VALUES (
            v_user_id, v_cliente_id, v_total_paid, (now() AT TIME ZONE 'UTC')::date, 'estorno_para_credito', 'Crédito de cancelamento de sessão', p_session_pk
          );
        END IF;
      ELSIF p_action = 'cancel_refund' THEN
        WITH inserted_estornos AS (
          INSERT INTO clientes_transacoes
            (user_id, cliente_id, session_id, tipo, valor, data_transacao, descricao, updated_by)
          SELECT
            t.user_id,
            t.cliente_id,
            t.session_id,
            'estorno',
            t.valor,
            (now() AT TIME ZONE 'UTC')::date,
            'Estorno: ' || COALESCE(t.descricao, 'Pagamento') || ' (sessÃ£o cancelada)',
            v_user_id
          FROM clientes_transacoes t
          WHERE t.session_id = ANY(v_texts)
            AND t.user_id = v_user_id
            AND t.tipo = 'pagamento'
          RETURNING 1
        )
        SELECT COUNT(*) INTO v_estornos_criados FROM inserted_estornos;
      END IF;
    END IF;

    -- Update session status
    UPDATE clientes_sessoes
    SET status = 'cancelada', updated_at = now(), updated_by = v_user_id
    WHERE id = p_session_pk;

    -- Delete appointment to free slot
    IF v_appointment_id IS NOT NULL THEN
      DELETE FROM appointments WHERE id = v_appointment_id AND user_id = v_user_id;
      GET DIAGNOSTICS v_deleted_appointment = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'action', p_action,
      'session_pk', p_session_pk,
      'estornos_criados', v_estornos_criados,
      'deleted_cobrancas', v_deleted_cobrancas,
      'deleted_appointment', v_deleted_appointment,
      'soft_deleted', true
    );
  END IF;

  -- ============================================================
  -- LEGACY ACTIONS (preserve, refund, remove)
  -- ============================================================
  IF p_action = 'preserve' THEN
    UPDATE clientes_sessoes
    SET status = 'historico', updated_at = now(), updated_by = v_user_id
    WHERE id = p_session_pk;

    GET DIAGNOSTICS v_deleted_session = ROW_COUNT;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'preserve',
      'session_pk', p_session_pk,
      'soft_deleted', v_deleted_session > 0
    );
  END IF;

  IF p_action = 'refund' THEN
    IF array_length(v_texts, 1) > 0 THEN
      WITH inserted_estornos AS (
        INSERT INTO clientes_transacoes
          (user_id, cliente_id, session_id, tipo, valor, data_transacao, descricao, updated_by)
        SELECT
          t.user_id,
          t.cliente_id,
          t.session_id,
          'estorno',
          t.valor,
          CURRENT_DATE,
          'Estorno: ' || COALESCE(t.descricao, 'Pagamento') || ' (sessÃ£o excluÃ­da)',
          v_user_id
        FROM clientes_transacoes t
        WHERE t.session_id = ANY(v_texts)
          AND t.user_id = v_user_id
          AND t.tipo = 'pagamento'
        RETURNING 1
      )
      SELECT COUNT(*) INTO v_estornos_criados FROM inserted_estornos;

      UPDATE clientes_transacoes
      SET session_id = NULL, updated_at = now(), updated_by = v_user_id
      WHERE session_id = ANY(v_texts) AND user_id = v_user_id;
      GET DIAGNOSTICS v_unlinked_transactions = ROW_COUNT;

      DELETE FROM cobranca_parcelas
      WHERE cobranca_id IN (
        SELECT id FROM cobrancas
        WHERE session_id = ANY(v_texts) AND user_id = v_user_id AND status <> 'pago'
      );

      DELETE FROM cobrancas
      WHERE session_id = ANY(v_texts) AND user_id = v_user_id AND status <> 'pago';
      GET DIAGNOSTICS v_deleted_cobrancas = ROW_COUNT;

      UPDATE cobrancas
      SET session_id = NULL, updated_at = now()
      WHERE session_id = ANY(v_texts) AND user_id = v_user_id;
      GET DIAGNOSTICS v_unlinked_cobrancas = ROW_COUNT;
    END IF;

    DELETE FROM clientes_sessoes WHERE id = p_session_pk AND user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_session = ROW_COUNT;

    IF v_appointment_id IS NOT NULL THEN
      DELETE FROM appointments WHERE id = v_appointment_id AND user_id = v_user_id;
      GET DIAGNOSTICS v_deleted_appointment = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'refund',
      'session_pk', p_session_pk,
      'estornos_criados', v_estornos_criados,
      'unlinked_transactions', v_unlinked_transactions,
      'deleted_cobrancas', v_deleted_cobrancas,
      'unlinked_cobrancas', v_unlinked_cobrancas,
      'deleted_session', v_deleted_session,
      'deleted_appointment', v_deleted_appointment
    );
  END IF;

  IF p_action = 'remove' THEN
    IF array_length(v_texts, 1) > 0 THEN
      WITH cobrancas_da_sessao AS (
        SELECT id, status, mp_payment_id, ip_transaction_nsu, asaas_installment_id
        FROM cobrancas
        WHERE session_id = ANY(v_texts) AND user_id = v_user_id
      ),
      apagaveis AS (
        SELECT id FROM cobrancas_da_sessao
        WHERE NOT (status = 'pago'
          AND (mp_payment_id IS NOT NULL OR ip_transaction_nsu IS NOT NULL OR asaas_installment_id IS NOT NULL))
      ),
      parcelas_removidas AS (
        DELETE FROM cobranca_parcelas WHERE cobranca_id IN (SELECT id FROM apagaveis) RETURNING 1
      ),
      preservadas AS (
        UPDATE cobrancas
        SET session_id = NULL, updated_at = now()
        WHERE id IN (
          SELECT id FROM cobrancas_da_sessao
          WHERE status = 'pago'
            AND (mp_payment_id IS NOT NULL OR ip_transaction_nsu IS NOT NULL OR asaas_installment_id IS NOT NULL)
        )
        RETURNING 1
      ),
      excluidas AS (
        DELETE FROM cobrancas WHERE id IN (SELECT id FROM apagaveis) RETURNING 1
      )
      SELECT
        (SELECT COUNT(*) FROM preservadas),
        (SELECT COUNT(*) FROM excluidas)
      INTO v_unlinked_cobrancas, v_deleted_cobrancas;

      DELETE FROM clientes_transacoes
      WHERE session_id = ANY(v_texts) AND user_id = v_user_id;
      GET DIAGNOSTICS v_deleted_transactions = ROW_COUNT;
    END IF;

    DELETE FROM clientes_sessoes WHERE id = p_session_pk AND user_id = v_user_id;
    GET DIAGNOSTICS v_deleted_session = ROW_COUNT;

    IF v_appointment_id IS NOT NULL THEN
      DELETE FROM appointments WHERE id = v_appointment_id AND user_id = v_user_id;
      GET DIAGNOSTICS v_deleted_appointment = ROW_COUNT;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'remove',
      'session_pk', p_session_pk,
      'deleted_transactions', v_deleted_transactions,
      'deleted_cobrancas', v_deleted_cobrancas,
      'unlinked_cobrancas', v_unlinked_cobrancas,
      'deleted_session', v_deleted_session,
      'deleted_appointment', v_deleted_appointment
    );
  END IF;

  RAISE EXCEPTION 'Unhandled action path';
END;
$function$;
