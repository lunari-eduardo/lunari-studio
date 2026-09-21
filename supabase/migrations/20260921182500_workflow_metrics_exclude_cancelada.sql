-- Atualiza workflow_month_metrics para desconsiderar sessões canceladas dos cálculos do Workflow ativo
CREATE OR REPLACE FUNCTION public.workflow_month_metrics(
  p_user_id uuid,
  p_start date,
  p_end date
)
RETURNS TABLE (
  previsto numeric,
  receita numeric,
  pendente numeric,
  sessoes integer,
  creditos_gerados numeric,
  creditos_utilizados numeric,
  caixa_recebido numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sess AS (
    SELECT id, session_id,
            COALESCE(valor_total, 0) AS valor_total,
            COALESCE(valor_pago, 0)  AS valor_pago
      FROM public.clientes_sessoes
     WHERE user_id = p_user_id
       AND (tipo_registro IS NULL OR tipo_registro IN ('workflow', 'venda_avulsa'))
       AND (status IS NULL OR status NOT IN ('historico', 'cancelada'))
       AND data_sessao BETWEEN p_start AND p_end
  ),
  sess_agg AS (
    SELECT
      COALESCE(SUM(valor_total), 0)                              AS previsto,
      COALESCE(SUM(LEAST(valor_pago, valor_total)), 0)           AS receita,
      COALESCE(SUM(GREATEST(valor_total - valor_pago, 0)), 0)    AS pendente,
      COUNT(*)::int                                              AS sessoes
    FROM sess
  ),
  cred_ger AS (
    SELECT COALESCE(SUM(v_sess), 0) AS v
    FROM (
      SELECT GREATEST(SUM(l.valor), 0) AS v_sess
        FROM public.cliente_creditos_ledger l
        JOIN public.clientes_sessoes s
          ON s.session_id = l.session_id_origem
          OR s.id::text   = l.session_id_origem
       WHERE l.user_id = p_user_id
         AND s.data_sessao BETWEEN p_start AND p_end
         AND (s.status IS NULL OR s.status <> 'historico')
         AND l.origem IN ('overpay', 'reducao_escopo', 'reversao_grant', 'reconcile_sobra', 'estorno_para_credito')
       GROUP BY s.id
    ) sub
  ),
  cred_uso AS (
    SELECT COALESCE(SUM(v_sess), 0) AS v
    FROM (
      SELECT GREATEST(SUM(-l.valor), 0) AS v_sess
        FROM public.cliente_creditos_ledger l
        JOIN sess s
          ON s.session_id = l.session_id_consumo
          OR s.id::text   = l.session_id_consumo
       WHERE l.user_id = p_user_id
         AND l.origem IN ('consumo_desconto', 'reversao_consumo')
       GROUP BY s.id
    ) sub
  ),
  caixa_tx AS (
    SELECT
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
    SELECT gm.amount AS v
    FROM public.gateway_cash_movements gm
    JOIN public.cobrancas c ON c.id = gm.cobranca_id
    WHERE c.user_id = p_user_id
      AND gm.movement_date::date BETWEEN p_start AND p_end
  ),
  caixa_combined AS (
    SELECT v FROM caixa_tx
    UNION ALL
    SELECT v FROM caixa_gw
  ),
  caixa AS (
    SELECT COALESCE(SUM(v), 0) AS v FROM caixa_combined
  )
  SELECT sa.previsto, sa.receita, sa.pendente, sa.sessoes,
         cg.v, cu.v, cx.v
    FROM sess_agg sa, cred_ger cg, cred_uso cu, caixa cx;
$$;
