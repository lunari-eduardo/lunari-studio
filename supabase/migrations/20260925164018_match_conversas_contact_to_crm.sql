-- =====================================================================
-- Migration: 20260925164018_match_conversas_contact_to_crm.sql
-- Description: RPC para matching determinístico de contatos WhatsApp 
--              com clientes e leads do CRM por telefone normalizado.
--
-- Regra: Vincula automaticamente apenas quando houver um único match 
--        determinístico. Ambiguidade → resolução manual pelo fotógrafo.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.match_conversas_contact_to_crm(
  p_phone_normalized TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  cliente_id UUID,
  lead_id UUID,
  match_type TEXT,
  match_count INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_phone_without_ddi TEXT;
  v_cliente_count INT := 0;
  v_lead_count INT := 0;
  v_found_cliente_id UUID;
  v_found_lead_id UUID;
  v_lead_cliente_id UUID;
BEGIN
  -- ─── Validação de entrada ──────────────────────────────────────────
  IF p_phone_normalized IS NULL OR LENGTH(p_phone_normalized) < 10 THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, 'none'::TEXT, 0;
    RETURN;
  END IF;

  -- ─── Preparação: extrair variante sem DDI ──────────────────────────
  -- phone_normalized vem como '5511987654321' (com DDI 55)
  -- clientes.telefone é armazenado como '11987654321' (sem DDI)
  IF LEFT(p_phone_normalized, 2) = '55' AND LENGTH(p_phone_normalized) >= 12 THEN
    v_phone_without_ddi := SUBSTRING(p_phone_normalized FROM 3);
  ELSE
    v_phone_without_ddi := p_phone_normalized;
  END IF;

  -- ─── Passo 1: Match exato em clientes ──────────────────────────────
  -- Compara dígitos limpos do CRM com ambas as variantes (com e sem DDI)
  SELECT COUNT(*) INTO v_cliente_count
  FROM public.clientes c
  WHERE c.user_id = p_user_id
    AND (
      regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g') = v_phone_without_ddi
      OR regexp_replace(COALESCE(c.whatsapp, ''), '\D', '', 'g') = v_phone_without_ddi
      OR regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g') = p_phone_normalized
      OR regexp_replace(COALESCE(c.whatsapp, ''), '\D', '', 'g') = p_phone_normalized
    );

  -- Match único de cliente → retorna imediatamente
  IF v_cliente_count = 1 THEN
    SELECT c.id INTO v_found_cliente_id
    FROM public.clientes c
    WHERE c.user_id = p_user_id
      AND (
        regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g') = v_phone_without_ddi
        OR regexp_replace(COALESCE(c.whatsapp, ''), '\D', '', 'g') = v_phone_without_ddi
        OR regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g') = p_phone_normalized
        OR regexp_replace(COALESCE(c.whatsapp, ''), '\D', '', 'g') = p_phone_normalized
      )
    LIMIT 1;

    RETURN QUERY SELECT v_found_cliente_id, NULL::UUID, 'exact_cliente'::TEXT, 1;
    RETURN;
  END IF;

  -- Ambiguidade de cliente → não vincula, sinaliza
  IF v_cliente_count > 1 THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, 'ambiguous'::TEXT, v_cliente_count;
    RETURN;
  END IF;

  -- ─── Passo 2: Match exato em leads ativos ──────────────────────────
  -- Busca leads não arquivados (inclui todos os status para cobertura)
  SELECT COUNT(*) INTO v_lead_count
  FROM public.leads l
  WHERE l.user_id = p_user_id
    AND l.arquivado = false
    AND (
      regexp_replace(COALESCE(l.telefone, ''), '\D', '', 'g') = v_phone_without_ddi
      OR regexp_replace(COALESCE(l.whatsapp, ''), '\D', '', 'g') = v_phone_without_ddi
      OR regexp_replace(COALESCE(l.telefone, ''), '\D', '', 'g') = p_phone_normalized
      OR regexp_replace(COALESCE(l.whatsapp, ''), '\D', '', 'g') = p_phone_normalized
    );

  IF v_lead_count = 1 THEN
    SELECT l.id, l.cliente_id INTO v_found_lead_id, v_lead_cliente_id
    FROM public.leads l
    WHERE l.user_id = p_user_id
      AND l.arquivado = false
      AND (
        regexp_replace(COALESCE(l.telefone, ''), '\D', '', 'g') = v_phone_without_ddi
        OR regexp_replace(COALESCE(l.whatsapp, ''), '\D', '', 'g') = v_phone_without_ddi
        OR regexp_replace(COALESCE(l.telefone, ''), '\D', '', 'g') = p_phone_normalized
        OR regexp_replace(COALESCE(l.whatsapp, ''), '\D', '', 'g') = p_phone_normalized
      )
    LIMIT 1;

    -- Se o lead tem cliente_id vinculado, retorna ambos
    RETURN QUERY SELECT v_lead_cliente_id, v_found_lead_id, 'exact_lead'::TEXT, 1;
    RETURN;
  END IF;

  IF v_lead_count > 1 THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, 'ambiguous'::TEXT, v_lead_count;
    RETURN;
  END IF;

  -- ─── Passo 3: Sem match ────────────────────────────────────────────
  RETURN QUERY SELECT NULL::UUID, NULL::UUID, 'none'::TEXT, 0;
END;
$$;

-- Permissão para o service role (usado pelo Worker Cloudflare)
GRANT EXECUTE ON FUNCTION public.match_conversas_contact_to_crm(TEXT, UUID) TO service_role;
