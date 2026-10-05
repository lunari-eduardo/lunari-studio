-- ==============================================================================
-- Migration: Auto Close Lead on Session Creation
-- Description: Trigger that automatically closes active leads when a new
-- session is scheduled/created for the same client. Includes intelligent
-- matching by client ID, WhatsApp conversation, phone, and email.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.auto_close_lead_on_session_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_converted_status_key TEXT;
  v_cliente_email TEXT;
  v_cliente_telefone TEXT;
BEGIN
  -- 0. Ignorar se a sessão não estiver vinculada a um cliente
  IF NEW.cliente_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Try to find the user's default 'converted' status (Ganho/Fechado)
  SELECT key INTO v_converted_status_key
  FROM public.lead_statuses
  WHERE user_id = NEW.user_id AND is_converted = true
  ORDER BY sort_order ASC
  LIMIT 1;

  -- 2. Fallback if not explicitly found
  IF v_converted_status_key IS NULL THEN
    SELECT key INTO v_converted_status_key
    FROM public.lead_statuses
    WHERE user_id = NEW.user_id AND (key = 'fechado' OR key = 'ganho' OR key = 'won' OR name ILIKE '%fechado%')
    LIMIT 1;
  END IF;

  -- 3. If still no status found, use hardcoded fallback 'fechado' just in case 
  IF v_converted_status_key IS NULL THEN
    v_converted_status_key := 'fechado';
  END IF;

  -- 4. Obter dados do cliente recém agendado para o cruzamento inteligente
  SELECT email, telefone INTO v_cliente_email, v_cliente_telefone
  FROM public.clientes
  WHERE id = NEW.cliente_id AND user_id = NEW.user_id;

  -- 5. Update any active lead for this client to the converted status
  -- This covers leads linked explicitly, via WhatsApp, or intelligently by phone/email
  UPDATE public.leads
  SET 
    status = v_converted_status_key
  WHERE 
    user_id = NEW.user_id
    AND status NOT IN (
      SELECT key FROM public.lead_statuses WHERE user_id = NEW.user_id AND (is_converted = true OR is_lost = true)
    )
    AND (arquivado = false OR arquivado IS NULL)
    AND (
      cliente_id = NEW.cliente_id 
      OR id IN (
        SELECT lead_id FROM public.conversas_contatos WHERE cliente_id = NEW.cliente_id AND lead_id IS NOT NULL
      )
      OR id IN (
        SELECT lead_id FROM public.conversas_chats WHERE cliente_id = NEW.cliente_id AND lead_id IS NOT NULL
      )
      -- Intelligent matching
      OR (v_cliente_email IS NOT NULL AND email = v_cliente_email)
      OR (
        v_cliente_telefone IS NOT NULL 
        AND telefone IS NOT NULL
        AND regexp_replace(telefone, '\D', '', 'g') <> '' 
        AND regexp_replace(telefone, '\D', '', 'g') = regexp_replace(v_cliente_telefone, '\D', '', 'g')
      )
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_close_lead_on_session ON public.clientes_sessoes;
CREATE TRIGGER trg_auto_close_lead_on_session
  AFTER INSERT ON public.clientes_sessoes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_close_lead_on_session_creation();
