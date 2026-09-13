-- =====================================================================
-- Migration: 20260913200000_conversas_sync_queue.sql
-- Description: Cria a tabela `conversas_sync_queue` referenciada pelo
--              Worker em `edge-workers/api/src/routes/conversas-sync-chats.ts`
--              para paginação de histórico de mensagens por chat.
--
--              SEM ESTA TABELA: o sync em background de histórico profundo
--              falha 100% em runtime (a referência `.from('conversas_sync_queue')`
--              não resolve para nenhuma tabela).
--
--              Resolve problema P0-01 da auditoria do módulo Conversas.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.conversas_sync_queue (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id   UUID         NOT NULL REFERENCES public.conversas_instancias(id) ON DELETE CASCADE,
  chat_id       UUID         NOT NULL REFERENCES public.conversas_chats(id) ON DELETE CASCADE,
  remote_jid    TEXT         NOT NULL,
  current_page  INTEGER      NOT NULL DEFAULT 1,
  total_pages   INTEGER      NOT NULL DEFAULT 1,
  status        TEXT         NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_msg     TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT conversas_sync_queue_unique_per_remote_jid
    UNIQUE (instance_id, remote_jid)
);

CREATE INDEX IF NOT EXISTS idx_conversas_sync_queue_pending
  ON public.conversas_sync_queue (status, updated_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_conversas_sync_queue_instance
  ON public.conversas_sync_queue (instance_id, status);

CREATE INDEX IF NOT EXISTS idx_conversas_sync_queue_chat
  ON public.conversas_sync_queue (chat_id);

CREATE INDEX IF NOT EXISTS idx_conversas_sync_queue_user
  ON public.conversas_sync_queue (user_id);

-- Trigger para manter updated_at consistente
CREATE OR REPLACE FUNCTION public.tg_conversas_sync_queue_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_conversas_sync_queue_updated_at ON public.conversas_sync_queue;
CREATE TRIGGER trg_conversas_sync_queue_updated_at
  BEFORE UPDATE ON public.conversas_sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversas_sync_queue_updated_at();

-- RLS — service_role bypassa; usuários autenticados só veem seus próprios itens
ALTER TABLE public.conversas_sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversas_sync_queue_select_own" ON public.conversas_sync_queue;
CREATE POLICY "conversas_sync_queue_select_own"
  ON public.conversas_sync_queue FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversas_sync_queue_modify_service_role" ON public.conversas_sync_queue;
CREATE POLICY "conversas_sync_queue_modify_service_role"
  ON public.conversas_sync_queue FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
