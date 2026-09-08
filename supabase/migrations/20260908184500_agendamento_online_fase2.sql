-- ====================================================================
-- FASE 2: RPC de Reserva para Cloudflare Worker
-- ====================================================================

CREATE OR REPLACE FUNCTION public.reserve_online_slot(
    p_link_id uuid,
    p_date date,
    p_start_time text,
    p_pacote_id uuid,
    p_cliente_data jsonb,
    p_deposit_amount numeric,
    p_total_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_link RECORD;
    v_slot RECORD;
    v_lock_key bigint;
    v_lock_acquired boolean;
    v_is_occupied boolean;
    v_reserva_id uuid;
    v_cobranca_id uuid;
    v_appointment_id uuid;
    v_session_id uuid;
    v_title text;
    v_cliente_nome text;
BEGIN
    -- 1. Buscar o Link
    SELECT * INTO v_link
    FROM public.agenda_online_links
    WHERE id = p_link_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Link não encontrado ou inativo');
    END IF;

    -- 2. Gerar Chave de Lock Transacional
    -- pg_advisory_xact_lock libera o lock automaticamente no final da transação
    -- Hashing the user_id, date and start_time into a bigint
    v_lock_key := hashtext(v_link.user_id::text || p_date::text || p_start_time);
    
    SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
    IF NOT v_lock_acquired THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este horário está sendo reservado por outra pessoa neste momento. Tente novamente.');
    END IF;

    -- 3. Validar se o slot realmente existe na grade do fotógrafo (availability_slots)
    SELECT * INTO v_slot
    FROM public.availability_slots
    WHERE user_id = v_link.user_id 
      AND availability_type_id = v_link.availability_type_id
      AND date = p_date 
      AND start_time = p_start_time;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Horário não disponibilizado pelo fotógrafo');
    END IF;

    -- 4. Validar Conflitos (Appointments e Reservas Temporárias)
    SELECT EXISTS (
        SELECT 1 FROM public.appointments
        WHERE user_id = v_link.user_id
          AND date = p_date
          AND time = p_start_time
          AND status IN ('a confirmar', 'confirmado')
    ) INTO v_is_occupied;

    IF v_is_occupied THEN
        RETURN jsonb_build_object('success', false, 'error', 'Horário já ocupado');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.agenda_reservas_temp
        WHERE user_id = v_link.user_id
          AND date = p_date
          AND start_time = p_start_time
          AND status = 'pendente'
          AND expires_at > now()
    ) INTO v_is_occupied;

    IF v_is_occupied THEN
        RETURN jsonb_build_object('success', false, 'error', 'Horário temporariamente reservado. Tente daqui a 10 minutos.');
    END IF;

    -- 5. Extrair nome do cliente para título
    v_cliente_nome := p_cliente_data->>'nome';
    IF v_cliente_nome IS NULL OR v_cliente_nome = '' THEN
        v_cliente_nome := 'Cliente Online';
    END IF;
    
    v_title := v_cliente_nome || ' - Agendamento Online';
    v_session_id := gen_random_uuid();

    -- 6. Criar Appointment PENDENTE (a confirmar)
    INSERT INTO public.appointments (
        user_id, session_id, title, date, time, type, status, 
        package_id, paid_amount, origem
    ) VALUES (
        v_link.user_id, v_session_id, v_title, p_date, p_start_time, 'Sessão', 'a confirmar',
        p_pacote_id, p_deposit_amount, 'online_booking'
    ) RETURNING id INTO v_appointment_id;

    -- 7. Criar Cobrança
    INSERT INTO public.cobrancas (
        user_id, session_id, valor, descricao, status, provedor, tipo_cobranca, dados_extras
    ) VALUES (
        v_link.user_id, v_session_id, p_deposit_amount, 'Sinal de Agendamento: ' || v_title, 
        'pendente', 'asaas', 'unica', jsonb_build_object('absorverTaxa', true)
    ) RETURNING id INTO v_cobranca_id;

    -- 8. Criar Reserva Temporária (10 minutos)
    INSERT INTO public.agenda_reservas_temp (
        user_id, link_id, date, start_time, end_time, status, expires_at,
        cliente_data, pacote_id, cobranca_id
    ) VALUES (
        v_link.user_id, p_link_id, p_date, p_start_time, v_slot.end_time, 'pendente', now() + interval '10 minutes',
        p_cliente_data, p_pacote_id, v_cobranca_id
    ) RETURNING id INTO v_reserva_id;

    -- 9. Retornar Sucesso com cobranca_id para checkout
    RETURN jsonb_build_object(
        'success', true, 
        'cobrancaId', v_cobranca_id,
        'reservaId', v_reserva_id
    );
END;
$$;
