-- ====================================================================
-- Migration: Expiração automática e robusta de agendamentos online (10 minutos)
-- 1. Reformula cleanup_expired_online_reservations() com expiração de cobranças
-- 2. Configura job no pg_cron executando a cada 1 minuto (* * * * *)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_online_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Expirar cobranças de sinal pendentes vinculadas a reservas temporárias expiradas
    UPDATE public.cobrancas c
    SET status = 'expirado', updated_at = now()
    FROM public.agenda_reservas_temp r
    WHERE c.id = r.cobranca_id
      AND c.status = 'pendente'
      AND (r.expires_at < now() OR r.status = 'expirada');

    -- 2. Expirar cobranças de sinal de agendamento pendentes com mais de 10 minutos
    UPDATE public.cobrancas c
    SET status = 'expirado', updated_at = now()
    WHERE c.status = 'pendente'
      AND c.descricao ILIKE 'Sinal de Agendamento%'
      AND c.created_at < (now() - interval '10 minutes');

    -- 3. Excluir appointments pendentes de online_booking:
    -- Caso A: Existe reserva temporária que expirou
    -- Caso B: Ou o appointment foi criado há mais de 10 minutos e ainda está "a confirmar" com sinal não pago
    DELETE FROM public.appointments a
    WHERE a.origem = 'online_booking'
      AND a.status = 'a confirmar'
      AND (
          EXISTS (
              SELECT 1 FROM public.agenda_reservas_temp r
              WHERE r.date = a.date
                AND r.start_time = a.time
                AND r.user_id = a.user_id
                AND (r.expires_at < now() OR r.status = 'expirada')
          )
          OR
          (a.created_at < (now() - interval '10 minutes') AND (a.paid_amount IS NULL OR a.paid_amount = 0))
      );

    -- 4. Atualizar status de reservas temporárias pendentes que expiraram para 'expirada'
    UPDATE public.agenda_reservas_temp
    SET status = 'expirada', updated_at = now()
    WHERE status = 'pendente' AND expires_at < now();

    -- 5. Limpar histórico de reservas temporárias muito antigas (mais de 7 dias)
    DELETE FROM public.agenda_reservas_temp
    WHERE expires_at < (now() - interval '7 days');
END;
$$;

-- 2. Agendar job periódico no pg_cron a cada 1 minuto (se pg_cron estiver disponível)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Desagendar job prévio se já existir com este nome
        PERFORM cron.unschedule('cleanup-expired-online-reservations-every-minute')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-online-reservations-every-minute'
        );

        -- Registrar o agendamento a cada minuto
        PERFORM cron.schedule(
            'cleanup-expired-online-reservations-every-minute',
            '* * * * *',
            'SELECT public.cleanup_expired_online_reservations();'
        );
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
