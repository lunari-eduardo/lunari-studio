-- =====================================================================
-- Migration: 20260924000000_conversas_phase1_cursors.sql
-- Description:
-- 1. Adds `last_read_at`, `last_inbound_at`, `cliente_id`, `lead_id` to `conversas_chats`.
-- 2. Updates `tg_conversas_update_chat_last_message` to manage the new cursors
--    and zero out `unread_count` on outbound messages.
-- =====================================================================

ALTER TABLE public.conversas_chats 
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lead_id UUID; -- TODO: referenciar tabela leads quando existir

-- Migra dados existentes de contatos para chats
UPDATE public.conversas_chats c
SET 
  cliente_id = ct.cliente_id,
  lead_id = ct.lead_id
FROM public.conversas_contatos ct
WHERE c.contato_id = ct.id
  AND (c.cliente_id IS NULL OR c.lead_id IS NULL);

-- Atualiza trigger
CREATE OR REPLACE FUNCTION public.tg_conversas_update_chat_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_current_last_date TIMESTAMPTZ;
BEGIN
  SELECT ultima_mensagem_data INTO v_current_last_date
  FROM public.conversas_chats
  WHERE id = NEW.chat_id;

  -- Só atualiza a última mensagem do chat se:
  -- 1) O chat ainda não tem data de última mensagem (v_current_last_date IS NULL); OU
  -- 2) A mensagem inserida é mais recente ou igual à data atual (NEW.timestamp >= v_current_last_date).
  IF v_current_last_date IS NULL OR NEW.timestamp >= v_current_last_date THEN
    UPDATE public.conversas_chats
    SET
      ultima_mensagem = NEW.content,
      ultima_mensagem_data = NEW.timestamp,
      ultima_mensagem_type = NEW.type,
      ultima_mensagem_direction = NEW.direction,
      
      -- Atualiza cursor de recebimento
      last_inbound_at = CASE 
        WHEN NEW.direction = 'inbound' THEN NEW.timestamp
        ELSE last_inbound_at
      END,

      -- Se fomos nós que enviamos (outbound), implicitamente a conversa foi lida
      last_read_at = CASE 
        WHEN NEW.direction = 'outbound' THEN NEW.timestamp
        ELSE last_read_at
      END,

      -- Só incrementa unread_count para mensagens novas recebidas (inbound)
      -- E zera se for outbound
      unread_count = CASE
        WHEN NEW.direction = 'outbound' THEN 0
        WHEN NEW.direction = 'inbound' AND conversas_chats.status = 'active'
        THEN conversas_chats.unread_count + 1
        ELSE conversas_chats.unread_count
      END,
      updated_at = now()
    WHERE id = NEW.chat_id;
  END IF;

  RETURN NEW;
END;$$;

-- Inicializa last_inbound_at e last_read_at para conversas existentes de forma retroativa e aproximada
UPDATE public.conversas_chats
SET
  last_inbound_at = (
    SELECT MAX(timestamp) 
    FROM public.conversas_mensagens 
    WHERE chat_id = conversas_chats.id AND direction = 'inbound'
  ),
  last_read_at = CASE
    WHEN unread_count = 0 THEN (
      SELECT MAX(timestamp) 
      FROM public.conversas_mensagens 
      WHERE chat_id = conversas_chats.id
    )
    ELSE NULL
  END;
