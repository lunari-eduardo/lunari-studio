-- ====================================================================
-- Migration: Vincular cliente_id na tabela cobrancas e salvar CPF se fornecido
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
SET search_path = public
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
    v_cliente_telefone text;
    v_cliente_email text;
    v_cliente_cpf text;
    v_cliente_id uuid;
    v_deposit_gateway text;
BEGIN
    -- 1. Buscar o Link
    SELECT * INTO v_link
    FROM public.agenda_online_links
    WHERE id = p_link_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Link não encontrado ou inativo');
    END IF;

    -- 2. Gerar Chave de Lock Transacional
    v_lock_key := hashtext(v_link.user_id::text || p_date::text || p_start_time);
    SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
    IF NOT v_lock_acquired THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este horário está sendo reservado por outra pessoa neste momento. Tente novamente.');
    END IF;

    -- 3. Validar se o slot realmente existe na grade do fotógrafo
    SELECT * INTO v_slot
    FROM public.availability_slots
    WHERE user_id = v_link.user_id 
      AND (availability_type_id = v_link.availability_type_id OR (v_link.availability_type_id IS NULL AND availability_type_id IS NULL))
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

    -- 5. Extrair e garantir cliente
    v_cliente_nome := p_cliente_data->>'nome';
    v_cliente_telefone := p_cliente_data->>'telefone';
    v_cliente_email := p_cliente_data->>'email';
    v_cliente_cpf := p_cliente_data->>'cpf_cnpj';
    
    IF v_cliente_nome IS NULL OR v_cliente_nome = '' THEN
        v_cliente_nome := 'Cliente Online';
    END IF;
    
    -- Tentar usar cliente_id_matched se passado e válido para este usuário
    IF p_cliente_data->>'cliente_id_matched' IS NOT NULL AND p_cliente_data->>'cliente_id_matched' <> '' THEN
        SELECT id INTO v_cliente_id FROM public.clientes
        WHERE id = (p_cliente_data->>'cliente_id_matched')::uuid AND user_id = v_link.user_id;
    END IF;

    IF v_cliente_id IS NULL THEN
        SELECT id INTO v_cliente_id FROM public.clientes 
        WHERE user_id = v_link.user_id AND (
            (v_cliente_telefone IS NOT NULL AND telefone = v_cliente_telefone) OR
            (v_cliente_email IS NOT NULL AND email = v_cliente_email)
        ) LIMIT 1;
    END IF;
    
    IF v_cliente_id IS NULL THEN
        INSERT INTO public.clientes (user_id, nome, telefone, email, cpf_cnpj)
        VALUES (v_link.user_id, v_cliente_nome, v_cliente_telefone, v_cliente_email, v_cliente_cpf)
        RETURNING id INTO v_cliente_id;
    ELSE
        -- Se já existia e foi passado CPF novo que não estava cadastrado, atualizar
        IF v_cliente_cpf IS NOT NULL AND v_cliente_cpf <> '' THEN
            UPDATE public.clientes
            SET cpf_cnpj = COALESCE(cpf_cnpj, v_cliente_cpf)
            WHERE id = v_cliente_id AND (cpf_cnpj IS NULL OR cpf_cnpj = '');
        END IF;
    END IF;

    v_title := v_cliente_nome || ' - Agendamento Online';
    v_session_id := gen_random_uuid();

    -- 6. Criar Appointment PENDENTE (a confirmar) com paid_amount = 0
    INSERT INTO public.appointments (
        user_id, session_id, title, date, time, type, status, 
        package_id, paid_amount, origem, cliente_id
    ) VALUES (
        v_link.user_id, v_session_id, v_title, p_date, p_start_time, 'Sessão', 'a confirmar',
        p_pacote_id, 0, 'online_booking', v_cliente_id
    ) RETURNING id INTO v_appointment_id;

    -- 7. Criar Cobrança e Reserva apenas se exigir sinal
    IF v_link.require_deposit AND p_deposit_amount > 0 THEN
        v_deposit_gateway := COALESCE(NULLIF(v_link.deposit_gateway, ''), 'asaas');
        IF v_deposit_gateway = 'mercadopago_link' THEN
            v_deposit_gateway := 'mercadopago';
        END IF;

        INSERT INTO public.cobrancas (
            user_id, session_id, valor, descricao, status, provedor, tipo_cobranca, dados_extras, cliente_id
        ) VALUES (
            v_link.user_id, v_session_id, p_deposit_amount, 'Sinal de Agendamento: ' || v_title, 
            'pendente', v_deposit_gateway, 'link', jsonb_build_object('absorverTaxa', true), v_cliente_id
        ) RETURNING id INTO v_cobranca_id;

        -- Reserva Temporária (10 minutos para pagamento)
        INSERT INTO public.agenda_reservas_temp (
            user_id, link_id, date, start_time, end_time, status, expires_at,
            cliente_data, pacote_id, cobranca_id
        ) VALUES (
            v_link.user_id, p_link_id, p_date, p_start_time, v_slot.end_time, 'pendente', now() + interval '10 minutes',
            p_cliente_data, p_pacote_id, v_cobranca_id
        ) RETURNING id INTO v_reserva_id;
    ELSE
        -- Sem cobrança de sinal: não cria cobrança no Asaas e não expira
        v_cobranca_id := NULL;

        INSERT INTO public.agenda_reservas_temp (
            user_id, link_id, date, start_time, end_time, status, expires_at,
            cliente_data, pacote_id, cobranca_id
        ) VALUES (
            v_link.user_id, p_link_id, p_date, p_start_time, v_slot.end_time, 'convertida', now() + interval '100 years',
            p_cliente_data, p_pacote_id, NULL
        ) RETURNING id INTO v_reserva_id;
    END IF;

    -- 8. Retornar Sucesso
    RETURN jsonb_build_object(
        'success', true, 
        'cobrancaId', v_cobranca_id,
        'reservaId', v_reserva_id,
        'clienteId', v_cliente_id
    );
END;
$$;

NOTIFY pgrst, 'reload schema';
