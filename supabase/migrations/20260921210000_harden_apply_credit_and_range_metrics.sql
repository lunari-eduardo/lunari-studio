-- Migração: Bloqueia aplicação de crédito em sessões canceladas e garante exclusão de canceladas em range metrics e analytics summary

-- 1) apply_client_credit: validação de status da sessão
CREATE OR REPLACE FUNCTION public.apply_client_credit(
  p_cliente_id uuid,
  p_session_id text,
  p_valor numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_session_user uuid;
  v_session_cliente uuid;
  v_session_uuid uuid;
  v_session_status text;
  v_valor_total numeric;
  v_valor_pago numeric;
  v_restante numeric;
  v_saldo numeric;
  v_valor_aplicar numeric;
  v_transacao_id uuid;
  v_ledger_id uuid;
  v_ledger_first_id uuid;
  v_remaining numeric;
  v_lot RECORD;
  v_take numeric;
  v_existing_tx uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser positivo';
  END IF;

  -- Idempotência anti-double-click: transação de crédito idêntica nos últimos 5s
  SELECT id INTO v_existing_tx
  FROM public.clientes_transacoes
  WHERE cliente_id = p_cliente_id
    AND session_id = p_session_id
    AND valor = p_valor
    AND tipo = 'pagamento'
    AND descricao ILIKE '%[CREDIT:%'
    AND created_at > now() - interval '5 seconds'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'transacao_id', v_existing_tx,
      'ledger_id', NULL,
      'valor_aplicado', p_valor,
      'novo_saldo', (SELECT COALESCE(SUM(valor),0) FROM public.cliente_creditos_ledger WHERE cliente_id = p_cliente_id),
      'idempotent', true
    );
  END IF;

  -- Lock no ledger do cliente
  PERFORM 1 FROM public.cliente_creditos_ledger
   WHERE cliente_id = p_cliente_id
   FOR UPDATE;

  SELECT COALESCE(SUM(valor), 0) INTO v_saldo
  FROM public.cliente_creditos_ledger
  WHERE cliente_id = p_cliente_id;

  IF v_saldo < p_valor THEN
    RAISE EXCEPTION 'Saldo insuficiente (disponível: %, solicitado: %)', v_saldo, p_valor;
  END IF;

  SELECT id, user_id, cliente_id, status, COALESCE(valor_total, 0), COALESCE(valor_pago, 0)
    INTO v_session_uuid, v_session_user, v_session_cliente, v_session_status, v_valor_total, v_valor_pago
  FROM public.clientes_sessoes
  WHERE session_id = p_session_id
  FOR UPDATE;

  IF v_session_uuid IS NULL THEN
    RAISE EXCEPTION 'Sessão não encontrada';
  END IF;

  IF v_session_user <> v_user_id THEN
    RAISE EXCEPTION 'Sem permissão para esta sessão';
  END IF;

  IF v_session_cliente <> p_cliente_id THEN
    RAISE EXCEPTION 'Cliente não corresponde à sessão';
  END IF;

  IF v_session_status IN ('cancelada', 'cancelado', 'historico', 'stub') THEN
    RAISE EXCEPTION 'Não é possível aplicar crédito em uma sessão cancelada ou arquivada';
  END IF;

  v_restante := GREATEST(v_valor_total - v_valor_pago, 0);
  IF v_restante <= 0 THEN
    RAISE EXCEPTION 'Sessão já está quitada';
  END IF;

  v_valor_aplicar := LEAST(p_valor, v_restante);

  INSERT INTO public.clientes_transacoes (
    cliente_id, session_id, user_id, valor, data_transacao, tipo, descricao, updated_by
  ) VALUES (
    p_cliente_id, p_session_id, v_user_id, v_valor_aplicar, CURRENT_DATE,
    'pagamento',
    'Crédito do cliente aplicado',
    v_user_id
  )
  RETURNING id INTO v_transacao_id;

  v_remaining := v_valor_aplicar;
  FOR v_lot IN
    SELECT
      session_id_origem,
      SUM(valor) AS saldo_lote,
      MIN(created_at) AS ordem
    FROM public.cliente_creditos_ledger
    WHERE cliente_id = p_cliente_id
      AND session_id_origem IS NOT NULL
    GROUP BY session_id_origem
    HAVING SUM(valor) > 0
    ORDER BY MIN(created_at) ASC
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(v_remaining, v_lot.saldo_lote);

    INSERT INTO public.cliente_creditos_ledger (
      user_id, cliente_id, data, valor, origem,
      session_id_origem, session_id_consumo, transacao_id, descricao, created_by
    ) VALUES (
      v_user_id, p_cliente_id, CURRENT_DATE, -v_take, 'consumo_desconto',
      v_lot.session_id_origem, p_session_id, v_transacao_id,
      'Consumo em sessão ' || p_session_id, v_user_id
    )
    RETURNING id INTO v_ledger_id;

    IF v_ledger_first_id IS NULL THEN
      v_ledger_first_id := v_ledger_id;
    END IF;

    v_remaining := v_remaining - v_take;
  END LOOP;

  IF v_remaining > 0 THEN
    INSERT INTO public.cliente_creditos_ledger (
      user_id, cliente_id, data, valor, origem,
      session_id_consumo, transacao_id, descricao, created_by
    ) VALUES (
      v_user_id, p_cliente_id, CURRENT_DATE, -v_remaining, 'consumo_desconto',
      p_session_id, v_transacao_id,
      'Consumo em sessão ' || p_session_id, v_user_id
    )
    RETURNING id INTO v_ledger_id;

    IF v_ledger_first_id IS NULL THEN
      v_ledger_first_id := v_ledger_id;
    END IF;
  END IF;

  UPDATE public.clientes_transacoes
     SET descricao = 'Crédito do cliente aplicado [CREDIT:' || v_ledger_first_id::text || ']'
   WHERE id = v_transacao_id;

  RETURN jsonb_build_object(
    'success', true,
    'transacao_id', v_transacao_id,
    'ledger_id', v_ledger_first_id,
    'valor_aplicado', v_valor_aplicar,
    'novo_saldo', v_saldo - v_valor_aplicar
  );
END;
$function$;

-- 2) workflow_range_metrics: excluir cancelada de todas as agregações
CREATE OR REPLACE FUNCTION public.workflow_range_metrics(
  p_user_id uuid,
  p_start date,
  p_end date,
  p_granularity text DEFAULT 'month'::text,
  p_include_historico boolean DEFAULT false
)
 RETURNS TABLE(bucket_key text, bucket_start date, previsto numeric, receita numeric, pendente numeric, sessoes integer, creditos_gerados numeric, creditos_utilizados numeric, caixa_recebido numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_gran text := lower(coalesce(p_granularity, 'month'));
BEGIN
  IF p_end < p_start THEN
    RAISE EXCEPTION 'end date must be >= start date';
  END IF;
  IF (p_end - p_start) > 400 THEN
    RAISE EXCEPTION 'range too large: max 400 days';
  END IF;
  IF v_gran NOT IN ('day', 'month', 'quarter', 'year', 'total') THEN
    RAISE EXCEPTION 'invalid granularity: %', v_gran;
  END IF;

  RETURN QUERY
  WITH sess AS (
    SELECT id, session_id, data_sessao,
           COALESCE(valor_total, 0) AS valor_total,
           COALESCE(valor_pago, 0)  AS valor_pago
      FROM public.clientes_sessoes
     WHERE user_id = p_user_id
       AND (tipo_registro IS NULL OR tipo_registro IN ('workflow', 'venda_avulsa'))
       AND (status IS NULL OR (status NOT IN ('cancelada', 'cancelado', 'stub') AND (p_include_historico OR status <> 'historico')))
       AND data_sessao BETWEEN p_start AND p_end
  ),
  sess_bucketed AS (
    SELECT
      CASE
        WHEN v_gran = 'total' THEN 'total'
        WHEN v_gran = 'day'   THEN to_char(data_sessao, 'YYYY-MM-DD')
        WHEN v_gran = 'month' THEN to_char(date_trunc('month', data_sessao), 'YYYY-MM')
        WHEN v_gran = 'quarter' THEN to_char(date_trunc('quarter', data_sessao), 'YYYY') || '-Q' || extract(quarter FROM data_sessao)::text
        WHEN v_gran = 'year'  THEN to_char(date_trunc('year', data_sessao), 'YYYY')
      END AS bkey,
      CASE
        WHEN v_gran = 'total' THEN p_start
        WHEN v_gran = 'day'   THEN data_sessao
        WHEN v_gran = 'month' THEN date_trunc('month', data_sessao)::date
        WHEN v_gran = 'quarter' THEN date_trunc('quarter', data_sessao)::date
        WHEN v_gran = 'year'  THEN date_trunc('year', data_sessao)::date
      END AS bstart,
      valor_total, valor_pago, id, session_id
    FROM sess
  ),
  sess_agg AS (
    SELECT
      bkey, bstart,
      COALESCE(SUM(valor_total), 0)                              AS previsto,
      COALESCE(SUM(LEAST(valor_pago, valor_total)), 0)           AS receita,
      COALESCE(SUM(GREATEST(valor_total - valor_pago, 0)), 0)    AS pendente,
      COUNT(*)::int                                              AS sessoes
    FROM sess_bucketed
    GROUP BY bkey, bstart
  ),
  cred_ger AS (
    SELECT bkey, COALESCE(SUM(v_sess), 0) AS v
    FROM (
      SELECT sb.bkey, GREATEST(SUM(l.valor), 0) AS v_sess
        FROM public.cliente_creditos_ledger l
        JOIN sess_bucketed sb
          ON sb.session_id = l.session_id_origem
          OR sb.id::text   = l.session_id_origem
       WHERE l.user_id = p_user_id
         AND l.origem IN ('overpay', 'reducao_escopo', 'reversao_grant', 'reconcile_sobra', 'estorno_para_credito')
       GROUP BY sb.bkey, sb.id
    ) sub
    GROUP BY bkey
  ),
  cred_uso AS (
    SELECT bkey, COALESCE(SUM(v_sess), 0) AS v
    FROM (
      SELECT sb.bkey, GREATEST(SUM(-l.valor), 0) AS v_sess
        FROM public.cliente_creditos_ledger l
        JOIN sess_bucketed sb
          ON sb.session_id = l.session_id_consumo
          OR sb.id::text   = l.session_id_consumo
       WHERE l.user_id = p_user_id
         AND l.origem IN ('consumo_desconto', 'reversao_consumo')
       GROUP BY sb.bkey, sb.id
    ) sub
    GROUP BY bkey
  ),
  caixa_tx AS (
    SELECT
      CASE
        WHEN v_gran = 'total' THEN 'total'
        WHEN v_gran = 'day'   THEN to_char(t.data_transacao, 'YYYY-MM-DD')
        WHEN v_gran = 'month' THEN to_char(date_trunc('month', t.data_transacao), 'YYYY-MM')
        WHEN v_gran = 'quarter' THEN to_char(date_trunc('quarter', t.data_transacao), 'YYYY') || '-Q' || extract(quarter FROM t.data_transacao)::text
        WHEN v_gran = 'year'  THEN to_char(date_trunc('year', t.data_transacao), 'YYYY')
      END AS bkey,
      CASE
        WHEN t.tipo = 'pagamento' THEN t.valor
        WHEN t.tipo = 'estorno'   THEN -t.valor
        ELSE 0
      END AS v
    FROM public.clientes_transacoes t
    LEFT JOIN public.cobrancas c ON t.cobranca_id = c.id
    WHERE t.user_id = p_user_id
      AND (t.descricao IS NULL OR t.descricao NOT LIKE '[CREDIT:%')
      AND (c.provedor IS DISTINCT FROM 'asaas' OR c.id IS NULL)
      AND (t.dados_extras->>'migrado_para_gateway' IS NULL OR t.dados_extras->>'migrado_para_gateway' != 'true')
      AND t.data_transacao BETWEEN p_start AND p_end
  ),
  caixa_gw AS (
    SELECT
      CASE
        WHEN v_gran = 'total' THEN 'total'
        WHEN v_gran = 'day'   THEN to_char(gm.movement_date::date, 'YYYY-MM-DD')
        WHEN v_gran = 'month' THEN to_char(date_trunc('month', gm.movement_date::date), 'YYYY-MM')
        WHEN v_gran = 'quarter' THEN to_char(date_trunc('quarter', gm.movement_date::date), 'YYYY') || '-Q' || extract(quarter FROM gm.movement_date::date)::text
        WHEN v_gran = 'year'  THEN to_char(date_trunc('year', gm.movement_date::date), 'YYYY')
      END AS bkey,
      gm.amount AS v
    FROM public.gateway_cash_movements gm
    JOIN public.cobrancas c ON c.id = gm.cobranca_id
    WHERE c.user_id = p_user_id
      AND gm.movement_date::date BETWEEN p_start AND p_end
  ),
  caixa_combined AS (
    SELECT bkey, v FROM caixa_tx
    UNION ALL
    SELECT bkey, v FROM caixa_gw
  ),
  caixa AS (
    SELECT bkey, COALESCE(SUM(v), 0) AS v
    FROM caixa_combined
    GROUP BY bkey
  ),
  all_keys AS (
    SELECT bkey, bstart FROM sess_agg
    UNION
    SELECT bkey, NULL::date FROM cred_ger
    UNION
    SELECT bkey, NULL::date FROM cred_uso
    UNION
    SELECT bkey, NULL::date FROM caixa
  )
  SELECT
    k.bkey,
    COALESCE(
      sa.bstart,
      CASE
        WHEN v_gran = 'total' THEN p_start
        WHEN v_gran = 'day'   THEN to_date(k.bkey, 'YYYY-MM-DD')
        WHEN v_gran = 'month' THEN to_date(k.bkey || '-01', 'YYYY-MM-DD')
        WHEN v_gran = 'year'  THEN to_date(k.bkey || '-01-01', 'YYYY-MM-DD')
        ELSE p_start
      END
    ) AS bucket_start,
    COALESCE(sa.previsto, 0)           AS previsto,
    COALESCE(sa.receita, 0)            AS receita,
    COALESCE(sa.pendente, 0)           AS pendente,
    COALESCE(sa.sessoes, 0)::integer   AS sessoes,
    COALESCE(cg.v, 0)                  AS creditos_gerados,
    COALESCE(cu.v, 0)                  AS creditos_utilizados,
    COALESCE(cx.v, 0)                  AS caixa_recebido
  FROM all_keys k
  LEFT JOIN sess_agg sa ON sa.bkey = k.bkey
  LEFT JOIN cred_ger cg ON cg.bkey = k.bkey
  LEFT JOIN cred_uso cu ON cu.bkey = k.bkey
  LEFT JOIN caixa    cx ON cx.bkey = k.bkey
  ORDER BY bucket_start ASC;
END;
$function$;

-- 3) workflow_analytics_summary: excluir cancelada
CREATE OR REPLACE FUNCTION public.workflow_analytics_summary(
  p_user_id uuid,
  p_start date,
  p_end date,
  p_include_historico boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_end < p_start THEN
    RAISE EXCEPTION 'end date must be >= start date';
  END IF;
  IF (p_end - p_start) > 400 THEN
    RAISE EXCEPTION 'range too large: max 400 days';
  END IF;

  WITH sess AS (
    SELECT s.id, s.session_id, s.cliente_id, s.data_sessao,
           s.categoria, s.pacote, s.status,
           COALESCE(s.valor_total,0) AS valor_total,
           COALESCE(s.valor_pago,0)  AS valor_pago,
           c.nome AS cliente_nome
      FROM public.clientes_sessoes s
      LEFT JOIN public.clientes c ON c.id = s.cliente_id
     WHERE s.user_id = p_user_id
       AND (s.tipo_registro IS NULL OR s.tipo_registro = 'workflow')
       AND (s.status IS NULL OR (s.status NOT IN ('cancelada', 'cancelado', 'stub') AND (p_include_historico OR s.status <> 'historico')))
       AND s.data_sessao BETWEEN p_start AND p_end
  ),
  totals AS (
    SELECT
      COALESCE(SUM(valor_total),0)                              AS previsto,
      COALESCE(SUM(LEAST(valor_pago, valor_total)),0)           AS receita,
      COALESCE(SUM(GREATEST(valor_total - valor_pago, 0)),0)    AS pendente,
      COUNT(*)::int                                             AS sessoes,
      CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(valor_total),0)/COUNT(*) ELSE 0 END AS ticket_medio
    FROM sess
  ),
  por_mes AS (
    SELECT to_char(date_trunc('month', data_sessao), 'YYYY-MM') AS mes,
           COALESCE(SUM(valor_total),0)                           AS previsto,
           COALESCE(SUM(LEAST(valor_pago, valor_total)),0)        AS receita,
           COALESCE(SUM(GREATEST(valor_total - valor_pago, 0)),0) AS pendente,
           COUNT(*)::int                                          AS sessoes
      FROM sess
     GROUP BY 1
     ORDER BY 1
  ),
  por_categoria AS (
    SELECT COALESCE(categoria, 'Sem categoria') AS categoria,
           COUNT(*)::int                        AS total,
           COALESCE(SUM(valor_total),0)         AS valor_total
      FROM sess
     GROUP BY 1
     ORDER BY total DESC
  ),
  por_pacote AS (
    SELECT COALESCE(pacote, 'Sem pacote') AS pacote,
           COUNT(*)::int                  AS total,
           COALESCE(SUM(valor_total),0)   AS valor_total
      FROM sess
     GROUP BY 1
     ORDER BY total DESC
  ),
  top_clientes AS (
    SELECT cliente_id,
           COALESCE(cliente_nome, 'Cliente') AS nome,
           COUNT(*)::int                     AS sessoes,
           COALESCE(SUM(valor_total),0)      AS valor_total
      FROM sess
     WHERE cliente_id IS NOT NULL
     GROUP BY 1, 2
     ORDER BY valor_total DESC
     LIMIT 10
  )
  SELECT jsonb_build_object(
    'periodo', jsonb_build_object('start', p_start, 'end', p_end),
    'totals', (SELECT to_jsonb(t.*) FROM totals t),
    'por_mes', COALESCE((SELECT jsonb_agg(to_jsonb(m.*)) FROM por_mes m), '[]'::jsonb),
    'por_categoria', COALESCE((SELECT jsonb_agg(to_jsonb(c.*)) FROM por_categoria c), '[]'::jsonb),
    'por_pacote', COALESCE((SELECT jsonb_agg(to_jsonb(p.*)) FROM por_pacote p), '[]'::jsonb),
    'top_clientes', COALESCE((SELECT jsonb_agg(to_jsonb(tc.*)) FROM top_clientes tc), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
