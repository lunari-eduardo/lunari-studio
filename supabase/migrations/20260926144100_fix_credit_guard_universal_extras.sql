-- =====================================================================
-- FIX: Guard universal no trigger de crédito automático (overpay)
--
-- PROBLEMA: O guard anterior dependia de `galeria_id IS NOT NULL` na
-- sessão para verificar se o "excedente" era na verdade pagamento de
-- extras legítimo. Mas em muitas sessões, `galeria_id` fica NULL
-- (vinculação via slug, não via FK) no momento em que o trigger
-- dispara, permitindo geração de crédito fantasma.
--
-- SOLUÇÃO: Resolver a galeria por slug quando FK é NULL, e buscar
-- cobranças de extras por `session_id OR galeria_id` para cobrir
-- ambos os caminhos de vinculação.
--
-- Ref: Bug Esther Carlos – Aurora Serena (24/09/2026)
-- =====================================================================

-- PARTE 1: Recriar a função com guard universal
CREATE OR REPLACE FUNCTION public.trg_auto_credit_overpay()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id text;
  v_session_uuid uuid;
  v_cliente_id uuid;
  v_user_id uuid;
  v_valor_total numeric;
  v_valor_pago_externo numeric;
  v_credito_atual numeric;
  v_delta_desejado numeric;
  v_ajuste numeric;
  v_galeria_id uuid;
  v_gallery_paid numeric;
BEGIN
  IF TG_TABLE_NAME = 'clientes_transacoes' THEN
    v_session_id := COALESCE(NEW.session_id, OLD.session_id);
  ELSIF TG_TABLE_NAME = 'clientes_sessoes' THEN
    v_session_id := NEW.session_id;
  END IF;

  IF v_session_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT id, cliente_id, user_id, COALESCE(valor_total, 0), galeria_id
    INTO v_session_uuid, v_cliente_id, v_user_id, v_valor_total, v_galeria_id
  FROM public.clientes_sessoes
  WHERE session_id = v_session_id;

  IF v_session_uuid IS NULL OR v_cliente_id IS NULL OR v_valor_total <= 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- ★ NOVO: Se galeria_id é NULL na sessão, tentar resolver via slug.
  -- Isso cobre sessões vinculadas à galeria por slug mas sem FK preenchida
  -- (comum quando finalize_gallery_payment ainda não executou o SET galeria_id).
  IF v_galeria_id IS NULL AND v_session_id IS NOT NULL THEN
    SELECT g.id INTO v_galeria_id
    FROM public.galerias g
    WHERE g.session_id = v_session_id
      AND g.user_id = v_user_id
    ORDER BY g.finalized_at DESC NULLS LAST, g.created_at DESC
    LIMIT 1;
  END IF;

  v_valor_pago_externo := public.compute_valor_pago_externo(v_session_id);
  v_delta_desejado := GREATEST(v_valor_pago_externo - v_valor_total, 0);

  -- ★ GUARD UNIVERSAL: Verificar cobranças de extras pagas vinculadas à
  -- sessão por QUALQUER caminho (session_id direto OU galeria_id resolvida).
  -- Antes, o guard só disparava quando galeria_id IS NOT NULL; agora busca
  -- cobranças diretamente pelo session_id da sessão, cobrindo todos os casos.
  IF v_delta_desejado > 0 THEN
    SELECT COALESCE(SUM(
             CASE
               WHEN finalidade = 'fotos_extras' THEN valor
               WHEN finalidade = 'sessao_e_extras' THEN COALESCE(valor_extras_componente, 0)
               ELSE 0
             END
           ), 0)::numeric
      INTO v_gallery_paid
      FROM public.cobrancas
     WHERE (
             session_id = v_session_id
             OR (v_galeria_id IS NOT NULL AND galeria_id = v_galeria_id)
           )
       AND finalidade IN ('fotos_extras','sessao_e_extras')
       AND status IN ('pago','pago_manual');

    -- Tolerância de R$ 0,02 para arredondamento. Se o excesso está coberto
    -- por cobranças de extras pagas, ignora a geração/reversão automática.
    IF v_delta_desejado <= v_gallery_paid + 0.02 THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;

  SELECT COALESCE(SUM(valor), 0) INTO v_credito_atual
  FROM public.cliente_creditos_ledger
  WHERE session_id_origem = v_session_id
    AND origem IN ('overpay', 'reducao_escopo', 'reversao_grant');

  v_ajuste := v_delta_desejado - v_credito_atual;

  IF v_ajuste = 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_ajuste > 0 THEN
    INSERT INTO public.cliente_creditos_ledger (
      user_id, cliente_id, data, valor, origem,
      session_id_origem, descricao, created_by
    ) VALUES (
      v_user_id, v_cliente_id, CURRENT_DATE, v_ajuste,
      CASE WHEN TG_TABLE_NAME = 'clientes_sessoes' THEN 'reducao_escopo' ELSE 'overpay' END,
      v_session_id,
      'Crédito automático (' || CASE WHEN TG_TABLE_NAME = 'clientes_sessoes' THEN 'redução de escopo' ELSE 'pagamento a maior' END || ')',
      v_user_id
    );
  ELSE
    IF v_credito_atual > 0 THEN
      INSERT INTO public.cliente_creditos_ledger (
        user_id, cliente_id, data, valor, origem,
        session_id_origem, descricao, created_by
      ) VALUES (
        v_user_id, v_cliente_id, CURRENT_DATE, GREATEST(v_ajuste, -v_credito_atual),
        'reversao_grant',
        v_session_id,
        'Ajuste automático de crédito (recomputo)',
        v_user_id
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- =====================================================================
-- PARTE 2: Reparo one-shot dos créditos fantasmas existentes
--
-- Reverte créditos automáticos (overpay/reducao_escopo) que são cobertos
-- por cobranças de extras pagas. Busca por session_id E galeria_id para
-- cobrir sessões vinculadas por ambos os caminhos.
-- =====================================================================
WITH candidatos AS (
  SELECT
    l.session_id_origem,
    s.cliente_id,
    s.user_id,
    SUM(l.valor) AS saldo_credito_auto
  FROM public.cliente_creditos_ledger l
  JOIN public.clientes_sessoes s ON s.session_id = l.session_id_origem
  WHERE l.origem IN ('overpay', 'reducao_escopo', 'reversao_grant')
  GROUP BY l.session_id_origem, s.cliente_id, s.user_id
  HAVING SUM(l.valor) > 0
),
cobertura AS (
  SELECT c.session_id_origem,
         c.cliente_id,
         c.user_id,
         c.saldo_credito_auto,
         COALESCE((
           SELECT SUM(CASE
                        WHEN cob.finalidade = 'fotos_extras' THEN cob.valor
                        WHEN cob.finalidade = 'sessao_e_extras' THEN COALESCE(cob.valor_extras_componente, 0)
                        ELSE 0
                      END)
             FROM public.cobrancas cob
            WHERE (
                    cob.session_id = c.session_id_origem
                    OR cob.galeria_id IN (
                      SELECT g.id FROM public.galerias g
                      WHERE g.session_id = c.session_id_origem
                    )
                  )
              AND cob.finalidade IN ('fotos_extras', 'sessao_e_extras')
              AND cob.status IN ('pago', 'pago_manual')
         ), 0) AS gallery_paid
  FROM candidatos c
)
INSERT INTO public.cliente_creditos_ledger (
  user_id, cliente_id, data, valor, origem,
  session_id_origem, descricao, created_by
)
SELECT
  user_id, cliente_id, CURRENT_DATE,
  -saldo_credito_auto,
  'reversao_grant',
  session_id_origem,
  'Reparo automático — crédito fantasma coberto por cobrança de extras (reparo_guard_universal_2026_09_26)',
  user_id
FROM cobertura
WHERE saldo_credito_auto > 0
  AND saldo_credito_auto <= gallery_paid + 0.02;
