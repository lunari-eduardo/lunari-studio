-- Migration: 20260922150000_enable_realtime_galerias.sql
-- Description: Habilita publicação Realtime para a tabela galerias para sincronização instantânea de status de seleção e pagamentos entre múltiplos dispositivos

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'galerias'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.galerias;
  END IF;
END $$;
