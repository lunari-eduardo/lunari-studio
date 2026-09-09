-- ====================================================================
-- Fix: Agendamento online sem cobrança de sinal
-- 1. reserve_online_slot: só gera cobrança e reserva com expiração se require_deposit for true e p_deposit_amount > 0
-- 2. appointments.paid_amount inicia em 0
-- 3. confirm_online_appointment: preenche paid_amount com valor real da cobrança após confirmação
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
    v_cliente_id uuid;
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
    
    IF v_cliente_nome IS NULL OR v_cliente_nome = '' THEN
        v_cliente_nome := 'Cliente Online';
    END IF;
    
    SELECT id INTO v_cliente_id FROM public.clientes 
    WHERE user_id = v_link.user_id AND (
        (v_cliente_telefone IS NOT NULL AND telefone = v_cliente_telefone) OR
        (v_cliente_email IS NOT NULL AND email = v_cliente_email)
    ) LIMIT 1;
    
    IF v_cliente_id IS NULL THEN
        INSERT INTO public.clientes (user_id, nome, telefone, email)
        VALUES (v_link.user_id, v_cliente_nome, v_cliente_telefone, v_cliente_email)
        RETURNING id INTO v_cliente_id;
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
        INSERT INTO public.cobrancas (
            user_id, session_id, valor, descricao, status, provedor, tipo_cobranca, dados_extras
        ) VALUES (
            v_link.user_id, v_session_id, p_deposit_amount, 'Sinal de Agendamento: ' || v_title, 
            'pendente', 'asaas', 'link', jsonb_build_object('absorverTaxa', true)
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
        'reservaId', v_reserva_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_online_appointment(p_cobranca_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_appointment RECORD;
    v_pacote RECORD;
    v_session_id uuid;
    v_regras jsonb;
    v_reserva RECORD;
    v_cliente_id uuid;
    v_cliente_nome text;
    v_cliente_telefone text;
    v_cliente_email text;
    v_cobranca_valor numeric;
BEGIN
    -- Localiza o agendamento pendente ligado a esta cobranca
    SELECT a.* INTO v_appointment
    FROM public.appointments a
    JOIN public.cobrancas c ON c.session_id = a.session_id
    WHERE c.id = p_cobranca_id
      AND a.status = 'a confirmar'
      AND a.origem = 'online_booking';

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Busca valor da cobrança
    SELECT valor INTO v_cobranca_valor
    FROM public.cobrancas
    WHERE id = p_cobranca_id;

    -- Localiza a reserva temporária
    SELECT * INTO v_reserva
    FROM public.agenda_reservas_temp
    WHERE cobranca_id = p_cobranca_id;

    -- Garantir cliente associado
    v_cliente_id := v_appointment.cliente_id;
    IF v_cliente_id IS NULL AND v_reserva.id IS NOT NULL AND v_reserva.cliente_data IS NOT NULL THEN
        v_cliente_nome := v_reserva.cliente_data->>'nome';
        v_cliente_telefone := v_reserva.cliente_data->>'telefone';
        v_cliente_email := v_reserva.cliente_data->>'email';
        
        SELECT id INTO v_cliente_id FROM public.clientes 
        WHERE user_id = v_appointment.user_id AND (
            (v_cliente_telefone IS NOT NULL AND telefone = v_cliente_telefone) OR
            (v_cliente_email IS NOT NULL AND email = v_cliente_email)
        ) LIMIT 1;
        
        IF v_cliente_id IS NULL THEN
            INSERT INTO public.clientes (user_id, nome, telefone, email)
            VALUES (v_appointment.user_id, COALESCE(v_cliente_nome, 'Cliente Online'), v_cliente_telefone, v_cliente_email)
            RETURNING id INTO v_cliente_id;
        END IF;
    END IF;

    -- Atualiza agendamento
    UPDATE public.appointments
    SET status = 'confirmado', 
        paid_amount = COALESCE(v_cobranca_valor, paid_amount, 0),
        updated_at = now(), 
        cliente_id = v_cliente_id
    WHERE id = v_appointment.id;

    -- Busca dados do pacote
    SELECT p.*, cat.nome as categoria_nome INTO v_pacote
    FROM public.pacotes p
    LEFT JOIN public.categorias cat ON cat.id = p.categoria_id
    WHERE p.id = v_appointment.package_id;

    IF v_pacote.id IS NOT NULL THEN
        v_regras := jsonb_build_object(
            'modelo', 'completo',
            'dataCongelamento', now(),
            'pacote', jsonb_build_object(
                'id', v_pacote.id,
                'nome', v_pacote.nome,
                'valorBase', coalesce(v_pacote.valor_base, 0),
                'valorFotoExtra', coalesce(v_pacote.valor_foto_extra, 0),
                'fotosIncluidas', coalesce(v_pacote.fotos_incluidas, 0),
                'categoria', coalesce(v_pacote.categoria_nome, 'Sessão'),
                'categoriaId', v_pacote.categoria_id,
                'produtosIncluidos', coalesce(v_pacote.produtos_incluidos, '[]'::jsonb)
            ),
            'precificacaoFotoExtra', jsonb_build_object(
                'modelo', 'fixo',
                'valorFixo', coalesce(v_pacote.valor_foto_extra, 0)
            )
        );
    ELSE
        v_regras := '{}'::jsonb;
    END IF;

    v_session_id := v_appointment.session_id;
    IF v_session_id IS NULL THEN
        v_session_id := gen_random_uuid();
        UPDATE public.appointments SET session_id = v_session_id WHERE id = v_appointment.id;
    END IF;

    -- Insere a sessão
    IF NOT EXISTS (SELECT 1 FROM public.clientes_sessoes WHERE appointment_id = v_appointment.id) THEN
        INSERT INTO public.clientes_sessoes (
            user_id, session_id, appointment_id, cliente_id, data_sessao, hora_sessao,
            categoria, pacote, descricao, valor_base_pacote, valor_total, valor_pago,
            produtos_incluidos, valor_foto_extra, qtd_fotos_extra, valor_total_foto_extra,
            regras_congeladas, updated_by
        ) VALUES (
            v_appointment.user_id, v_session_id, v_appointment.id, COALESCE(v_cliente_id, '00000000-0000-0000-0000-000000000000'::uuid),
            v_appointment.date, v_appointment.time, coalesce(v_pacote.categoria_nome, 'Sessão'),
            v_pacote.nome, coalesce(v_appointment.description, ''), coalesce(v_pacote.valor_base, 0),
            coalesce(v_pacote.valor_base, 0), COALESCE(v_cobranca_valor, v_appointment.paid_amount, 0),
            coalesce(v_pacote.produtos_incluidos, '[]'::jsonb), coalesce(v_pacote.valor_foto_extra, 0),
            0, 0, v_regras, v_appointment.user_id
        );
    END IF;
    
    -- Atualiza reserva temporária
    UPDATE public.agenda_reservas_temp
    SET status = 'convertida', updated_at = now()
    WHERE cobranca_id = p_cobranca_id;

END;
$$;
