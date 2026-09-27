-- Migration: 20260914000000_fix_vpkg_record_bug_in_appointments.sql
-- Description: Corrige o bug de "record v_pkg is not assigned yet" na trg_zz_sync_appointment_deposit -> ensure_workflow_session_on_confirm (appointments)

CREATE OR REPLACE FUNCTION public.ensure_workflow_session_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_session RECORD;
  v_pacote_nome TEXT;
  v_pacote_valor_base NUMERIC;
  v_pacote_valor_foto_extra NUMERIC;
  v_pacote_produtos_incluidos JSONB;
  v_pacote_categoria_nome TEXT;
  v_categoria TEXT;
  v_valor_base NUMERIC := 0;
BEGIN
  IF COALESCE(NEW.status, '') <> 'confirmado' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') = 'confirmado' THEN
    RETURN NEW;
  END IF;
  IF NEW.session_id IS NULL OR NEW.cliente_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.package_id IS NOT NULL AND NEW.package_id <> '' THEN
    BEGIN
      SELECT p.nome, p.valor_base, p.valor_foto_extra, p.produtos_incluidos, c.nome
        INTO v_pacote_nome, v_pacote_valor_base, v_pacote_valor_foto_extra, v_pacote_produtos_incluidos, v_pacote_categoria_nome
        FROM public.pacotes p
        LEFT JOIN public.categorias c ON c.id = p.categoria_id
       WHERE p.id::text = NEW.package_id
         AND p.user_id = NEW.user_id
       LIMIT 1;
    EXCEPTION WHEN others THEN
      -- Silently ignore bad package ids or missing records
    END;
  END IF;

  v_categoria := COALESCE(NULLIF(v_pacote_categoria_nome, ''), NULLIF(NEW.type, ''), 'Sessão');
  v_valor_base := COALESCE(v_pacote_valor_base, 0);

  SELECT * INTO v_session
    FROM public.clientes_sessoes
   WHERE user_id = NEW.user_id
     AND (appointment_id = NEW.id OR session_id = NEW.session_id)
   LIMIT 1;

  IF v_session.id IS NULL THEN
    INSERT INTO public.clientes_sessoes (
      user_id, cliente_id, session_id, appointment_id, data_sessao, hora_sessao,
      categoria, pacote, descricao, status, valor_total, valor_base_pacote,
      valor_pago, valor_foto_extra, produtos_incluidos, tipo_registro
    ) VALUES (
      NEW.user_id, NEW.cliente_id, NEW.session_id, NEW.id, NEW.date, NEW.time,
      v_categoria, v_pacote_nome, NEW.description, 'agendada',
      GREATEST(v_valor_base, COALESCE(NEW.paid_amount, 0)), v_valor_base,
      0, COALESCE(v_pacote_valor_foto_extra, 0), COALESCE(v_pacote_produtos_incluidos, '[]'::jsonb), 'workflow'
    );
  ELSE
    UPDATE public.clientes_sessoes s
       SET appointment_id = COALESCE(s.appointment_id, NEW.id),
           categoria = CASE WHEN COALESCE(s.categoria, '') IN ('', 'Sessão') THEN v_categoria ELSE s.categoria END,
           pacote = COALESCE(NULLIF(s.pacote, ''), v_pacote_nome),
           descricao = COALESCE(NULLIF(s.descricao, ''), NEW.description),
           status = CASE WHEN COALESCE(s.status, '') IN ('', 'stub') THEN 'agendada' ELSE s.status END,
           valor_base_pacote = CASE WHEN COALESCE(s.valor_base_pacote, 0) = 0 THEN v_valor_base ELSE s.valor_base_pacote END,
           valor_total = GREATEST(COALESCE(s.valor_total, 0), v_valor_base),
           valor_foto_extra = CASE WHEN COALESCE(s.valor_foto_extra, 0) = 0 THEN COALESCE(v_pacote_valor_foto_extra, 0) ELSE s.valor_foto_extra END,
           produtos_incluidos = CASE WHEN s.produtos_incluidos IS NULL OR s.produtos_incluidos = '[]'::jsonb
                                     THEN COALESCE(v_pacote_produtos_incluidos, '[]'::jsonb) ELSE s.produtos_incluidos END,
           updated_at = now()
     WHERE s.id = v_session.id;
  END IF;

  PERFORM public.recompute_session_paid(NEW.session_id);

  RETURN NEW;
END;
$function$;
