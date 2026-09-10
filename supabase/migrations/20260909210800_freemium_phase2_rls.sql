-- Phase 2: RLS Policies for Entitlements

DO $$
DECLARE
  v_table text;
  v_tables_contracts text[] := ARRAY['contratos', 'contrato_templates', 'contrato_audit_logs'];
  v_tables_forms text[] := ARRAY['formularios', 'formulario_templates', 'formulario_respostas'];
  v_tables_tasks text[] := ARRAY['tasks', 'task_statuses', 'task_tags', 'task_people', 'task_attachments'];
  v_tables_integrations text[] := ARRAY['usuarios_integracoes', 'platform_integrations'];
BEGIN
  -- Contracts
  FOREACH v_table IN ARRAY v_tables_contracts LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Restrictive insert %1$s" ON public.%1$s;', v_table);
    EXECUTE format('DROP POLICY IF EXISTS "Restrictive update %1$s" ON public.%1$s;', v_table);
    EXECUTE format('CREATE POLICY "Restrictive insert %1$s" ON public.%1$s AS RESTRICTIVE FOR INSERT WITH CHECK (public.has_entitlement(auth.uid(), ''contracts''));', v_table);
    EXECUTE format('CREATE POLICY "Restrictive update %1$s" ON public.%1$s AS RESTRICTIVE FOR UPDATE USING (public.has_entitlement(auth.uid(), ''contracts''));', v_table);
  END LOOP;

  -- Forms
  FOREACH v_table IN ARRAY v_tables_forms LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Restrictive insert %1$s" ON public.%1$s;', v_table);
    EXECUTE format('DROP POLICY IF EXISTS "Restrictive update %1$s" ON public.%1$s;', v_table);
    EXECUTE format('CREATE POLICY "Restrictive insert %1$s" ON public.%1$s AS RESTRICTIVE FOR INSERT WITH CHECK (public.has_entitlement(auth.uid(), ''forms''));', v_table);
    EXECUTE format('CREATE POLICY "Restrictive update %1$s" ON public.%1$s AS RESTRICTIVE FOR UPDATE USING (public.has_entitlement(auth.uid(), ''forms''));', v_table);
  END LOOP;

  -- Tasks
  FOREACH v_table IN ARRAY v_tables_tasks LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Restrictive insert %1$s" ON public.%1$s;', v_table);
    EXECUTE format('DROP POLICY IF EXISTS "Restrictive update %1$s" ON public.%1$s;', v_table);
    EXECUTE format('CREATE POLICY "Restrictive insert %1$s" ON public.%1$s AS RESTRICTIVE FOR INSERT WITH CHECK (public.has_entitlement(auth.uid(), ''tasks''));', v_table);
    EXECUTE format('CREATE POLICY "Restrictive update %1$s" ON public.%1$s AS RESTRICTIVE FOR UPDATE USING (public.has_entitlement(auth.uid(), ''tasks''));', v_table);
  END LOOP;

  -- Agenda Availability
  FOREACH v_table IN ARRAY (ARRAY['availability_slots', 'availability_types']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Restrictive insert %1$s" ON public.%1$s;', v_table);
    EXECUTE format('DROP POLICY IF EXISTS "Restrictive update %1$s" ON public.%1$s;', v_table);
    EXECUTE format('CREATE POLICY "Restrictive insert %1$s" ON public.%1$s AS RESTRICTIVE FOR INSERT WITH CHECK (public.has_entitlement(auth.uid(), ''agenda_availability''));', v_table);
    EXECUTE format('CREATE POLICY "Restrictive update %1$s" ON public.%1$s AS RESTRICTIVE FOR UPDATE USING (public.has_entitlement(auth.uid(), ''agenda_availability''));', v_table);
  END LOOP;

  -- Agenda Online
  FOREACH v_table IN ARRAY (ARRAY['agenda_online_links', 'agenda_reservas_temp']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Restrictive insert %1$s" ON public.%1$s;', v_table);
    EXECUTE format('DROP POLICY IF EXISTS "Restrictive update %1$s" ON public.%1$s;', v_table);
    EXECUTE format('CREATE POLICY "Restrictive insert %1$s" ON public.%1$s AS RESTRICTIVE FOR INSERT WITH CHECK (public.has_entitlement(auth.uid(), ''agenda_online''));', v_table);
    EXECUTE format('CREATE POLICY "Restrictive update %1$s" ON public.%1$s AS RESTRICTIVE FOR UPDATE USING (public.has_entitlement(auth.uid(), ''agenda_online''));', v_table);
  END LOOP;

  -- Integrations
  FOREACH v_table IN ARRAY v_tables_integrations LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Restrictive insert %1$s" ON public.%1$s;', v_table);
    EXECUTE format('DROP POLICY IF EXISTS "Restrictive update %1$s" ON public.%1$s;', v_table);
    EXECUTE format('CREATE POLICY "Restrictive insert %1$s" ON public.%1$s AS RESTRICTIVE FOR INSERT WITH CHECK (public.has_entitlement(auth.uid(), ''integrations''));', v_table);
    EXECUTE format('CREATE POLICY "Restrictive update %1$s" ON public.%1$s AS RESTRICTIVE FOR UPDATE USING (public.has_entitlement(auth.uid(), ''integrations''));', v_table);
  END LOOP;
END;
$$;

-- Cobrancas
DROP POLICY IF EXISTS "Restrictive insert cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Restrictive update cobrancas" ON public.cobrancas;
CREATE POLICY "Restrictive insert cobrancas" ON public.cobrancas AS RESTRICTIVE FOR INSERT 
WITH CHECK (
  CASE WHEN (tipo_cobranca = 'link' OR finalidade = 'avulso') THEN public.has_entitlement(auth.uid(), 'charge_links') ELSE true END
);
CREATE POLICY "Restrictive update cobrancas" ON public.cobrancas AS RESTRICTIVE FOR UPDATE 
USING (
  CASE WHEN (tipo_cobranca = 'link' OR finalidade = 'avulso') THEN public.has_entitlement(auth.uid(), 'charge_links') ELSE true END
);

-- Cobranca_parcelas
DROP POLICY IF EXISTS "Restrictive insert cobranca_parcelas" ON public.cobranca_parcelas;
DROP POLICY IF EXISTS "Restrictive update cobranca_parcelas" ON public.cobranca_parcelas;
CREATE POLICY "Restrictive insert cobranca_parcelas" ON public.cobranca_parcelas AS RESTRICTIVE FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cobrancas c 
    WHERE c.id = cobranca_id 
    AND (c.tipo_cobranca != 'link' AND c.finalidade != 'avulso')
  ) OR public.has_entitlement(auth.uid(), 'charge_links')
);
CREATE POLICY "Restrictive update cobranca_parcelas" ON public.cobranca_parcelas AS RESTRICTIVE FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.cobrancas c 
    WHERE c.id = cobranca_id 
    AND (c.tipo_cobranca != 'link' AND c.finalidade != 'avulso')
  ) OR public.has_entitlement(auth.uid(), 'charge_links')
);
