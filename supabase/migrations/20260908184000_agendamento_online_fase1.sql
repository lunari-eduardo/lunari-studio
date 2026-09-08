-- ====================================================================
-- FASE 1: Agendamento Online MVP
-- Tabelas base e atualizações estruturais
-- ====================================================================

-- 1. availability_types
CREATE TABLE IF NOT EXISTS public.availability_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    color text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
        END IF;

ALTER TABLE public.availability_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own availability types"
    ON public.availability_types
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
        END IF;

-- 2. pacotes - duracao_minutos
ALTER TABLE public.pacotes 
ADD COLUMN IF NOT EXISTS duracao_minutos integer DEFAULT 60 NOT NULL;

-- 3. availability_slots - availability_type_id
ALTER TABLE public.availability_slots
ADD COLUMN IF NOT EXISTS availability_type_id uuid REFERENCES public.availability_types(id) ON DELETE SET NULL;

-- 4. agenda_online_links
CREATE TABLE IF NOT EXISTS public.agenda_online_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    slug text UNIQUE NOT NULL,
    title text NOT NULL,
    description text,
    availability_type_id uuid REFERENCES public.availability_types(id) ON DELETE RESTRICT NOT NULL,
    categoria_id uuid REFERENCES public.categorias(id) ON DELETE RESTRICT NOT NULL,
    pacotes_permitidos jsonb DEFAULT '[]'::jsonb NOT NULL,
    require_deposit boolean DEFAULT false NOT NULL,
    deposit_type text CHECK (deposit_type IN ('fixed', 'percentage')),
    deposit_value numeric(10,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
        END IF;

ALTER TABLE public.agenda_online_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own online links"
    ON public.agenda_online_links
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
        END IF;

CREATE POLICY "Public can view active online links"
    ON public.agenda_online_links
    FOR SELECT
    USING (is_active = true);
        END IF;

-- 5. agenda_reservas_temp
CREATE TABLE IF NOT EXISTS public.agenda_reservas_temp (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    link_id uuid REFERENCES public.agenda_online_links(id) ON DELETE CASCADE NOT NULL,
    date date NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    status text DEFAULT 'pendente' NOT NULL CHECK (status IN ('pendente', 'convertida', 'expirada')),
    expires_at timestamp with time zone NOT NULL,
    cliente_data jsonb,
    pacote_id uuid REFERENCES public.pacotes(id) ON DELETE SET NULL,
    cobranca_id uuid REFERENCES public.cobrancas(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
        END IF;

ALTER TABLE public.agenda_reservas_temp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own temp reservations"
    ON public.agenda_reservas_temp
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
        END IF;

-- 6. RPC para Confirmação Automática do Agendamento via Webhook
CREATE OR REPLACE FUNCTION public.confirm_online_appointment(p_cobranca_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_appointment RECORD;
    v_pacote RECORD;
    v_session_id uuid;
    v_regras jsonb;
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

    -- Atualiza agendamento
    UPDATE public.appointments
    SET status = 'confirmado', updated_at = now()
    WHERE id = v_appointment.id;

    -- Busca dados do pacote
    SELECT p.*, cat.nome as categoria_nome INTO v_pacote
    FROM public.pacotes p
    LEFT JOIN public.categorias cat ON cat.id = p.categoria_id
    WHERE p.id = v_appointment.package_id;

    IF v_pacote.id IS NOT NULL THEN
        -- Constrói regras congeladas JSON equivalente ao serviço TS
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
        END IF;

        v_session_id := v_appointment.session_id;
        IF v_session_id IS NULL THEN
            v_session_id := gen_random_uuid();
        END IF;
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
            v_appointment.user_id, v_session_id, v_appointment.id, v_appointment.cliente_id,
            v_appointment.date, v_appointment.time, coalesce(v_pacote.categoria_nome, 'Sessão'),
            v_pacote.nome, coalesce(v_appointment.description, ''), coalesce(v_pacote.valor_base, 0),
            coalesce(v_pacote.valor_base, 0), v_appointment.paid_amount,
            coalesce(v_pacote.produtos_incluidos, '[]'::jsonb), coalesce(v_pacote.valor_foto_extra, 0),
            0, 0, v_regras, v_appointment.user_id
        );
        END IF;
        
        -- Atualiza reserva temporária
        UPDATE public.agenda_reservas_temp
        SET status = 'convertida', updated_at = now()
        WHERE cobranca_id = p_cobranca_id;
    END IF;
END;
$$;

-- 7. Trigger
CREATE OR REPLACE FUNCTION public.tg_cobranca_paid_online_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.status = 'pago' AND OLD.status != 'pago' THEN
        PERFORM public.confirm_online_appointment(NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_cobranca_paid_online_booking ON public.cobrancas;
CREATE TRIGGER tr_cobranca_paid_online_booking
AFTER UPDATE ON public.cobrancas
FOR EACH ROW
EXECUTE FUNCTION public.tg_cobranca_paid_online_booking();
        END IF;
