-- ==============================================================================
-- Migration: 20260917113000_fix_workflow_financials_extras_slug.sql
-- FASE 1: Hotfixes para resolver o bug ativo de fotos extras pendentes.
-- 1. Atualiza `recompute_session_paid` para fazer o matching flexível de 
--    session_id (aceitando UUID ou Slug), garantindo que transações originadas
--    em Webhooks (que injetam slug) sejam somadas.
-- 2. Adiciona o consumo de créditos (cliente_creditos_ledger) no `valor_pago` global.
-- 3. Atualiza `workflow_session_financials` para embutir explicitamente os
--    créditos (`v_cred_util`) no abatimento do montante da sessão.
-- 4. Remove a zeragem prematura de `v_extras_pago` caso a galeria fosse reativada
--    (v_pre_selecao), garantindo que o que já foi pago não seja omitido.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.recompute_session_paid(p_session_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_soma_tx NUMERIC := 0;
  v_soma_parcelas NUMERIC := 0;
  v_soma_creditos NUMERIC := 0;
  v_uuid TEXT;
  v_slug TEXT;
BEGIN
  -- Resolve UUID e Slug da sessão para matching universal
  SELECT id::text, session_id INTO v_uuid, v_slug
  FROM public.clientes_sessoes
  WHERE id::text = p_session_id OR session_id = p_session_id
  LIMIT 1;

  IF v_uuid IS NULL THEN
    v_uuid := p_session_id;
    v_slug := p_session_id;
  END IF;

  -- 1) Soma das transacoes manuais e de outros gateways (Mercado Pago, InfinitePay, Pix manual)
  -- Nota: ct.valor armazena estritamente o valor comercial da venda (sem repasses de taxa)
  SELECT COALESCE(SUM(CASE WHEN ct.tipo = 'estorno' THEN -ct.valor ELSE ct.valor END), 0)
  INTO v_soma_tx
  FROM public.clientes_transacoes ct
  LEFT JOIN public.cobrancas c ON ct.cobranca_id = c.id
  WHERE (ct.session_id = v_uuid OR ct.session_id = v_slug OR ct.session_id = p_session_id)
    AND ct.tipo IN ('pagamento', 'estorno')
    AND (c.provedor IS DISTINCT FROM 'asaas' OR ct.dados_extras->>'migrado_para_gateway' IS NULL);

  -- 2) Soma do valor da venda (nominal/comercial) quitado nas parcelas do Asaas
  SELECT COALESCE(SUM(
    CASE 
      WHEN COALESCE(cp.valor_repassado_cliente, 0) > 0 THEN 
        cp.valor_cobrado_cliente - cp.valor_repassado_cliente
      WHEN COALESCE(c.valor_repassado_cliente, 0) > 0 AND COALESCE(c.total_parcelas, 1) > 0 THEN 
        ROUND(COALESCE(c.valor_principal, (c.dados_extras->>'valorBase')::numeric, c.valor) / c.total_parcelas, 2)
      WHEN cp.valor_principal IS NOT NULL AND cp.valor_principal > 0 THEN 
        cp.valor_principal
      WHEN c.valor_principal IS NOT NULL AND c.valor_principal > 0 AND COALESCE(c.total_parcelas, 1) > 0 THEN 
        ROUND(c.valor_principal / c.total_parcelas, 2)
      WHEN (c.dados_extras->>'valorBase') IS NOT NULL AND COALESCE(c.total_parcelas, 1) > 0 THEN 
        ROUND((c.dados_extras->>'valorBase')::numeric / c.total_parcelas, 2)
      ELSE 
        COALESCE(cp.valor_bruto, ROUND(c.valor / GREATEST(COALESCE(c.total_parcelas, 1), 1), 2))
    END
  ), 0)
  INTO v_soma_parcelas
  FROM public.cobranca_parcelas cp
  JOIN public.cobrancas c ON c.id = cp.cobranca_id
  WHERE (c.session_id = v_uuid OR c.session_id = v_slug OR c.session_id = p_session_id 
         OR c.galeria_id IN (SELECT id FROM public.galerias WHERE session_id = v_uuid OR session_id = v_slug OR session_id = p_session_id))
    AND c.provedor = 'asaas'
    AND cp.status IN ('confirmado', 'recebido', 'antecipado');

  -- 3) Soma dos créditos utilizados na sessão como pagamento
  SELECT COALESCE(SUM(-l.valor), 0)
  INTO v_soma_creditos
  FROM public.cliente_creditos_ledger l
  WHERE (l.session_id_consumo = v_uuid OR l.session_id_consumo = v_slug OR l.session_id_consumo = p_session_id)
    AND l.origem IN ('consumo_desconto', 'reversao_consumo');

  UPDATE public.clientes_sessoes
  SET 
    valor_pago = v_soma_tx + v_soma_parcelas + v_soma_creditos,
    updated_at = NOW()
  WHERE id::text = v_uuid OR session_id = v_slug;
  
  RAISE NOTICE 'Recalculado valor_pago para session_id: %, total=% (tx=%, parcelas=%, creditos=%)', p_session_id, (v_soma_tx + v_soma_parcelas + v_soma_creditos), v_soma_tx, v_soma_parcelas, v_soma_creditos;
END;
$function$;

-- Update workflow_session_financials
CREATE OR REPLACE FUNCTION public.workflow_session_financials(p_session_id uuid)
 RETURNS TABLE(
   session_id uuid,
   valor_base_pacote numeric,
   valor_produtos numeric,
   valor_extras_bruto numeric,
   valor_extras_com_desconto numeric,
   desconto_progressivo numeric,
   desconto_manual numeric,
   valor_adicional numeric,
   valor_total numeric,
   valor_pago numeric,
   valor_pendente numeric,
   qtd_fotos_extra integer,
   qtd_extras_galeria integer,
   credito_gerado numeric,
   credito_utilizado numeric,
   credito_liquido numeric,
   extras_pago numeric,
   extras_pendente numeric,
   extras_liquido numeric,
   desconto_aplicado_extras numeric
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_s              RECORD;
  v_gal            RECORD;
  v_regras         jsonb;
  v_produtos       numeric := 0;
  v_qtd            integer := 0;
  v_gal_qtd        integer := 0;
  v_unit_bruto     numeric := 0;
  v_unit_c_desc    numeric := 0;
  v_extras_bruto   numeric := 0;
  v_extras_c_desc  numeric := 0;
  v_base           numeric := 0;
  v_desconto       numeric := 0;
  v_adicional      numeric := 0;
  v_total          numeric := 0;
  v_pago           numeric := 0;
  v_sess_text      text;
  v_extras_pago    numeric := 0;
  v_extras_pago_componentes numeric := 0;
  v_extras_pago_manual_fotos numeric := 0;
  v_manual_combinado_extras_explicit numeric := 0;
  v_pago_direto_extras numeric := 0;
  v_sessao_liq     numeric := 0;
  v_cred_ger       numeric := 0;
  v_cred_util      numeric := 0;
  v_excedente      numeric := 0;
  v_extras_liq     numeric := 0;
  v_pre_selecao    boolean := false;
  v_resolved_gal_id uuid;
  v_override       boolean := false;
  v_mode           text;
  v_gal_res_qtd    integer := 0;
BEGIN
  SELECT s.id, s.user_id, s.session_id AS session_slug,
         s.valor_base_pacote, s.valor_foto_extra,
         s.valor_total_foto_extra, s.qtd_fotos_extra, s.valor_adicional,
         s.desconto, s.produtos_incluidos, s.valor_pago,
         s.galeria_id, s.regras_congeladas, s.extras_overridden
    INTO v_s
    FROM public.clientes_sessoes s
   WHERE s.id = p_session_id;

  IF NOT FOUND THEN RETURN; END IF;

  v_override := COALESCE(v_s.extras_overridden, false);

  IF v_s.galeria_id IS NULL AND v_s.session_slug IS NOT NULL THEN
    SELECT g.id, COALESCE(g.total_fotos_extras_vendidas, 0)
      INTO v_resolved_gal_id, v_gal_res_qtd
      FROM public.galerias g
     WHERE g.user_id    = v_s.user_id
       AND g.session_id = v_s.session_slug
     ORDER BY g.finalized_at DESC NULLS LAST, g.created_at DESC
     LIMIT 1;

    IF v_resolved_gal_id IS NOT NULL
       AND NOT v_override
       AND (
         COALESCE(v_s.qtd_fotos_extra, 0) = 0
         OR COALESCE(v_s.qtd_fotos_extra, 0) = v_gal_res_qtd
       )
    THEN
      v_s.galeria_id := v_resolved_gal_id;
    END IF;
  END IF;

  IF v_s.galeria_id IS NOT NULL AND NOT v_override THEN
    v_mode := 'gallery';
  ELSIF v_override THEN
    v_mode := 'override';
  ELSIF COALESCE(v_s.qtd_fotos_extra, 0) > 0 THEN
    v_mode := 'manual';
  ELSE
    v_mode := 'empty';
  END IF;

  IF v_s.produtos_incluidos IS NOT NULL
     AND jsonb_typeof(v_s.produtos_incluidos) = 'array' THEN
    SELECT COALESCE(SUM(
             CASE WHEN p->>'tipo' = 'manual'
                  THEN COALESCE((p->>'quantidade')::numeric,0)
                       * COALESCE((p->>'valorUnitario')::numeric,0)
                  ELSE 0 END
           ), 0)
      INTO v_produtos
      FROM jsonb_array_elements(v_s.produtos_incluidos) p;
  END IF;

  IF v_mode = 'gallery' THEN
    SELECT g.total_fotos_extras_vendidas, g.valor_foto_extra, g.regras_congeladas,
           g.status, g.fotos_selecionadas, g.fotos_incluidas
      INTO v_gal
      FROM public.galerias g
     WHERE g.id = v_s.galeria_id;

    v_gal_qtd := COALESCE(v_gal.total_fotos_extras_vendidas, 0);

    IF v_gal.status = 'selecao_completa' THEN
      v_gal_qtd := GREATEST(
        v_gal_qtd,
        COALESCE(v_gal.fotos_selecionadas, 0) - COALESCE(v_gal.fotos_incluidas, 0)
      );
    END IF;

    v_qtd        := COALESCE(NULLIF(v_gal_qtd, 0), COALESCE(v_s.qtd_fotos_extra, 0));
    v_unit_bruto := COALESCE(NULLIF(v_gal.valor_foto_extra, 0), COALESCE(v_s.valor_foto_extra, 0));
    v_regras     := COALESCE(v_gal.regras_congeladas, v_s.regras_congeladas);

    IF v_gal.status IS NOT NULL AND v_gal.status NOT IN ('selecao_completa','entregue','concluida','concluída') THEN
      v_pre_selecao := true;
    END IF;

    IF v_gal_qtd = 0 AND v_pre_selecao THEN
      v_qtd := 0;
    END IF;

    IF v_qtd = 0 THEN
      SELECT g.valor_foto_extra, g.regras_congeladas
        INTO v_gal
        FROM public.galerias g WHERE g.id = v_s.galeria_id;
    END IF;

  ELSIF v_mode IN ('manual', 'override') THEN
    v_qtd        := COALESCE(v_s.qtd_fotos_extra, 0);
    v_unit_bruto := COALESCE(v_s.valor_foto_extra, 0);
    v_regras     := v_s.regras_congeladas;
    v_gal_qtd    := 0;

  ELSE
    v_qtd        := 0;
    v_unit_bruto := COALESCE(v_s.valor_foto_extra, 0);
    v_regras     := v_s.regras_congeladas;
    v_gal_qtd    := 0;
  END IF;

  v_extras_bruto := ROUND((v_qtd * v_unit_bruto)::numeric, 2);

  IF v_mode IN ('override', 'manual') THEN
    v_unit_c_desc   := v_unit_bruto;
    v_extras_c_desc := v_extras_bruto;
  ELSE
    v_unit_c_desc := public._extra_unit_price_for_quantity(v_regras, v_unit_bruto, v_qtd);
    IF v_unit_c_desc IS NULL OR v_unit_c_desc = 0 THEN
      v_unit_c_desc := v_unit_bruto;
    END IF;
    v_unit_c_desc   := LEAST(v_unit_c_desc, v_unit_bruto);
    v_extras_c_desc := ROUND((v_qtd * v_unit_c_desc)::numeric, 2);
  END IF;

  v_base      := COALESCE(v_s.valor_base_pacote, 0);
  v_desconto  := COALESCE(v_s.desconto, 0);
  v_adicional := COALESCE(v_s.valor_adicional, 0);

  v_total := GREATEST(0, v_base + v_extras_c_desc + v_produtos + v_adicional - v_desconto);
  v_pago  := COALESCE(v_s.valor_pago, 0);
  
  v_sess_text := v_s.id::text;

  SELECT
    GREATEST(COALESCE(SUM(CASE WHEN l.origem IN ('overpay', 'reducao_escopo', 'reversao_grant', 'reconcile_sobra', 'estorno_para_credito') 
                                 AND (l.session_id_origem = v_sess_text OR (v_s.session_slug IS NOT NULL AND l.session_id_origem = v_s.session_slug))
                                THEN l.valor ELSE 0 END), 0), 0),
    GREATEST(COALESCE(SUM(CASE WHEN l.origem IN ('consumo_desconto', 'reversao_consumo')
                                 AND (l.session_id_consumo = v_sess_text OR (v_s.session_slug IS NOT NULL AND l.session_id_consumo = v_s.session_slug))
                                THEN -l.valor ELSE 0 END), 0), 0)
    INTO v_cred_ger, v_cred_util
  FROM public.cliente_creditos_ledger l
  WHERE l.user_id = v_s.user_id
    AND (
      l.session_id_origem = v_sess_text
      OR l.session_id_consumo = v_sess_text
      OR (v_s.session_slug IS NOT NULL AND l.session_id_origem = v_s.session_slug)
      OR (v_s.session_slug IS NOT NULL AND l.session_id_consumo = v_s.session_slug)
    );

  v_pago := v_pago + v_cred_util;

  v_excedente  := GREATEST(0, v_desconto - (v_base + v_adicional + v_produtos));
  v_excedente  := LEAST(v_excedente, v_extras_c_desc);
  v_extras_liq := GREATEST(0, v_extras_c_desc - v_excedente);
  v_sessao_liq := GREATEST(0, v_total - v_extras_liq);

  session_id                := v_s.id;
  valor_base_pacote         := v_base;
  valor_produtos            := v_produtos;
  valor_extras_bruto        := v_extras_bruto;
  valor_extras_com_desconto := v_extras_c_desc;
  desconto_progressivo      := GREATEST(0, v_extras_bruto - v_extras_c_desc);
  desconto_manual           := v_desconto;
  valor_adicional           := v_adicional;
  valor_total               := v_total;
  valor_pago                := LEAST(v_pago, v_total);
  valor_pendente            := GREATEST(0, v_total - v_pago);
  qtd_fotos_extra           := v_qtd;
  qtd_extras_galeria        := v_gal_qtd;

  credito_gerado    := v_cred_ger;
  credito_utilizado := v_cred_util;
  credito_liquido   := v_cred_ger - v_cred_util;

  DECLARE
    v_pago_transacoes NUMERIC;
    v_pago_parcelas NUMERIC;
  BEGIN
    -- Pagamentos de cobranças (Asaas / Gateway / Presencial com cobranca_id)
    SELECT COALESCE(SUM(
      CASE
        WHEN c.finalidade = 'fotos_extras' THEN t.valor
        WHEN c.finalidade = 'sessao_e_extras'
             AND COALESCE(c.valor_sessao_componente, 0) + COALESCE(c.valor_extras_componente, 0) > 0
          THEN t.valor
               * (COALESCE(c.valor_extras_componente, 0)
                  / (COALESCE(c.valor_sessao_componente, 0) + COALESCE(c.valor_extras_componente, 0)))
        ELSE 0
      END
    ), 0)
      INTO v_pago_transacoes
      FROM public.clientes_transacoes t
      LEFT JOIN public.cobrancas c ON c.id = t.cobranca_id
     WHERE t.user_id = v_s.user_id
       AND t.tipo = 'pagamento'
       AND c.id IS NOT NULL
       AND (t.dados_extras->>'migrado_para_gateway' IS NULL OR t.dados_extras->>'migrado_para_gateway' != 'true')
       AND (
         t.session_id = v_sess_text
         OR (v_s.session_slug IS NOT NULL AND t.session_id = v_s.session_slug)
         OR c.galeria_id IN (SELECT g.id FROM public.galerias g WHERE g.session_id = v_s.session_slug OR g.session_id = v_sess_text)
       );

    SELECT COALESCE(SUM(
      CASE
        WHEN c.finalidade = 'fotos_extras' THEN COALESCE(p.valor_principal, p.valor_bruto)
        WHEN c.finalidade = 'sessao_e_extras'
             AND COALESCE(c.valor_sessao_componente, 0) + COALESCE(c.valor_extras_componente, 0) > 0
          THEN COALESCE(p.valor_principal, p.valor_bruto)
               * (COALESCE(c.valor_extras_componente, 0)
                  / (COALESCE(c.valor_sessao_componente, 0) + COALESCE(c.valor_extras_componente, 0)))
        ELSE 0
      END
    ), 0)
      INTO v_pago_parcelas
      FROM public.cobranca_parcelas p
      INNER JOIN public.cobrancas c ON c.id = p.cobranca_id
     WHERE c.user_id = v_s.user_id
       AND c.provedor = 'asaas' 
       AND p.status IN ('confirmado', 'recebido', 'antecipado')
       AND (
         c.session_id = v_sess_text
         OR (v_s.session_slug IS NOT NULL AND c.session_id = v_s.session_slug)
         OR c.galeria_id IN (SELECT g.id FROM public.galerias g WHERE g.session_id = v_s.session_slug OR g.session_id = v_sess_text)
       );

    v_extras_pago_componentes := v_pago_transacoes + v_pago_parcelas;
  END;

  -- Pagamentos manuais sem cobrança diretamente rotulados como fotos extras
  SELECT COALESCE(SUM(t.valor), 0)
    INTO v_extras_pago_manual_fotos
    FROM public.clientes_transacoes t
   WHERE t.user_id = v_s.user_id
     AND t.tipo = 'pagamento'
     AND t.cobranca_id IS NULL
     AND (
       t.session_id = v_sess_text
       OR (v_s.session_slug IS NOT NULL AND t.session_id = v_s.session_slug)
     )
     AND t.descricao ILIKE '%:fotos_extras]%';

  -- Pagamentos manuais combinados (sessao_e_extras) com componente de extras explícito
  SELECT COALESCE(SUM(
    CASE
      WHEN t.dados_extras->>'valor_extras_componente' IS NOT NULL
           AND (t.dados_extras->>'valor_extras_componente')::numeric >= 0
        THEN (t.dados_extras->>'valor_extras_componente')::numeric
      WHEN t.descricao ~ '\[EXTRAS_VALOR:([0-9.]+)\]'
        THEN (regexp_match(t.descricao, '\[EXTRAS_VALOR:([0-9.]+)\]'))[1]::numeric
      ELSE 0
    END
  ), 0)
    INTO v_manual_combinado_extras_explicit
    FROM public.clientes_transacoes t
   WHERE t.user_id = v_s.user_id
     AND t.tipo = 'pagamento'
     AND t.cobranca_id IS NULL
     AND (
       t.session_id = v_sess_text
       OR (v_s.session_slug IS NOT NULL AND t.session_id = v_s.session_slug)
     )
     AND t.descricao ILIKE '%:sessao_e_extras]%';

  -- Total de pagamentos direta e inequivocamente vinculados a fotos extras
  v_pago_direto_extras := v_extras_pago_componentes
                        + v_extras_pago_manual_fotos
                        + v_manual_combinado_extras_explicit;

  -- Regra canônica contábil do estúdio ("sessão primeiro, extras depois"):
  DECLARE
    v_pago_outros numeric := GREATEST(0, v_pago - v_pago_direto_extras);
    v_spillover_para_extras numeric := GREATEST(0, v_pago_outros - v_sessao_liq);
  BEGIN
    v_extras_pago := v_pago_direto_extras + v_spillover_para_extras;
    v_extras_pago := LEAST(v_extras_liq, GREATEST(0, v_extras_pago));
  END;

  extras_pago              := ROUND(v_extras_pago::numeric, 2);
  extras_liquido           := ROUND(v_extras_liq::numeric, 2);
  desconto_aplicado_extras := ROUND(v_excedente::numeric, 2);
  extras_pendente          := GREATEST(0, ROUND((v_extras_liq - v_extras_pago)::numeric, 2));

  RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.workflow_session_financials(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recompute_session_paid(text) TO authenticated, service_role;
