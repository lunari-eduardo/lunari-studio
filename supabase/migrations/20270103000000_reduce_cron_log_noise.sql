-- ====================================================================
-- Reduz ruído de logs/uso no plano Free do Supabase (ingestão de logs 3,37/1 GB).
--
-- 1. google-calendar-sync-worker: só invoca a Edge Function quando há item
--    pendente na fila (antes: 1.440 invocações/dia mesmo com a fila vazia).
-- 2. expire-galleries: de 1 min para 10 min (prazos são medidos em dias).
--    cleanup-expired-online-reservations permanece a cada 1 min de propósito:
--    o hold de 10 min do agendamento online é visível ao cliente final e o job
--    é SQL puro (não gera log de Edge/API).
-- 3. Retenção diária de cron.job_run_details (3 dias) e
--    conversas_webhook_events (7 dias) — nenhuma das duas era limpa.
-- ====================================================================

-- 1. Worker do Google Calendar: invoca somente com trabalho pendente
SELECT cron.unschedule('google-calendar-sync-worker')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'google-calendar-sync-worker');

SELECT cron.schedule(
  'google-calendar-sync-worker',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tlnjspsywycbudhewsfv.supabase.co/functions/v1/google-calendar-sync-worker',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsbmpzcHN5d3ljYnVkaGV3c2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NjU1MDEsImV4cCI6MjA3MzA0MTUwMX0.LR_nMBh8cVY1SQS1TsB7RrGQ1zmCRm_bDvyfI5Dn1QI'
    ),
    body := jsonb_build_object('source','cron','time', now()::text)
  )
  WHERE EXISTS (
    SELECT 1 FROM public.google_calendar_sync_queue
    WHERE processed_at IS NULL
      AND next_attempt_at <= now()
      AND attempts < 6
  );
  $$
);

-- 2. Expiração de galerias: a cada 10 min
SELECT cron.unschedule('expire-galleries-every-minute')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-galleries-every-minute');

SELECT cron.schedule(
  'expire-galleries-every-10-min',
  '*/10 * * * *',
  'SELECT public.expire_galleries();'
);

-- 3. Retenção
CREATE INDEX IF NOT EXISTS idx_conversas_webhook_events_received_at
  ON public.conversas_webhook_events (received_at);

CREATE OR REPLACE FUNCTION public.purge_noisy_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch     integer := 5000;
  v_cron      integer := 0;
  v_webhook   integer := 0;
  v_n         integer;
BEGIN
  DELETE FROM cron.job_run_details
  WHERE end_time < now() - interval '3 days';
  GET DIAGNOSTICS v_cron = ROW_COUNT;

  -- Em lotes (até 50k por execução) para não segurar lock em tabela grande
  LOOP
    DELETE FROM public.conversas_webhook_events
    WHERE id IN (
      SELECT id FROM public.conversas_webhook_events
      WHERE received_at < now() - interval '7 days'
      LIMIT v_batch
    );
    GET DIAGNOSTICS v_n = ROW_COUNT;
    v_webhook := v_webhook + v_n;
    EXIT WHEN v_n < v_batch OR v_webhook >= 50000;
  END LOOP;

  RETURN jsonb_build_object(
    'executed_at', now(),
    'cron_job_run_details', v_cron,
    'conversas_webhook_events', v_webhook
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_noisy_logs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_noisy_logs() TO service_role;

SELECT cron.unschedule('purge-noisy-logs-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-noisy-logs-daily');

SELECT cron.schedule(
  'purge-noisy-logs-daily',
  '40 3 * * *',
  $cron$ SELECT public.purge_noisy_logs(); $cron$
);
