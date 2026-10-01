-- Script para criar o cron job de follow-up dinâmico
-- Este script verifica leads na etapa "orcamento_enviado" cujo prazo expirou
-- (data do envio + dias definidos na configuração) e os move para "followup".
-- Também inclui instrução de como ativar via pg_cron.

CREATE OR REPLACE FUNCTION check_and_update_followups()
RETURNS void AS $$
DECLARE
    r RECORD;
    lead_hist JSONB;
BEGIN
    FOR r IN
        SELECT l.id, l.historico_status, l.user_id, f.dias_para_follow_up
        FROM leads l
        JOIN lead_follow_up_config f ON l.user_id = f.user_id
        WHERE l.status = 'orcamento_enviado'
          AND f.ativo = true
          AND (l.status_timestamp + (f.dias_para_follow_up || ' days')::interval) < now()
    LOOP
        -- Cria novo item de histórico
        lead_hist := r.historico_status;
        IF lead_hist IS NULL THEN
            lead_hist := '[]'::jsonb;
        END IF;

        lead_hist := lead_hist || jsonb_build_object(
            'status', 'followup',
            'data', (now() at time zone 'utc')::text
        );

        -- Atualiza o lead
        UPDATE leads
        SET 
            status = 'followup',
            status_timestamp = now(),
            historico_status = lead_hist,
            updated_at = now()
        WHERE id = r.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

/*
-- INSTRUÇÕES PARA ATIVAR O PG_CRON
-- Certifique-se de que a extensão pg_cron está instalada no Supabase
-- Habilitar a extensão (execute como superusuário ou via interface do Supabase):
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar para rodar todos os dias à meia-noite (00:00)
SELECT cron.schedule(
    'check_followups_daily',
    '0 0 * * *',
    'SELECT check_and_update_followups();'
);

-- Para listar jobs agendados:
-- SELECT * FROM cron.job;

-- Para remover o job:
-- SELECT cron.unschedule('check_followups_daily');
*/
