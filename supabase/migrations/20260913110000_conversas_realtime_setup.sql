-- Migration: 20260913110000_conversas_realtime_setup.sql
-- Description: Adiciona as tabelas do módulo Conversas à publicação supabase_realtime
--              e define REPLICA IDENTITY FULL para suporte a RLS em eventos UPDATE/DELETE.

-- 1. Definir REPLICA IDENTITY FULL para que o Supabase Realtime consiga avaliar
--    filtros e políticas RLS em eventos de UPDATE e DELETE
ALTER TABLE public.conversas_instancias REPLICA IDENTITY FULL;
ALTER TABLE public.conversas_chats REPLICA IDENTITY FULL;
ALTER TABLE public.conversas_mensagens REPLICA IDENTITY FULL;
ALTER TABLE public.conversas_contatos REPLICA IDENTITY FULL;

-- 2. Adicionar as tabelas à publicação supabase_realtime se ainda não estiverem presentes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversas_instancias'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas_instancias;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversas_chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas_chats;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversas_mensagens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas_mensagens;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversas_contatos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversas_contatos;
  END IF;
END $$;
