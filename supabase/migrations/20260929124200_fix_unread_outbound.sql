-- =====================================================================
-- Migration: 20260929124200_fix_unread_outbound.sql
-- Description:
-- Corrige o trigger para zerar o unread_count automaticamente quando o
-- usuario enviar uma mensagem outbound (ex: respondendo pelo celular no WhatsApp).
-- =====================================================================

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
      unread_count = CASE
        WHEN NEW.direction = 'inbound' AND conversas_chats.status = 'active'
        THEN conversas_chats.unread_count + 1
        WHEN NEW.direction = 'outbound'
        THEN 0
        ELSE conversas_chats.unread_count
      END,
      updated_at = now()
    WHERE id = NEW.chat_id;
  END IF;

  RETURN NEW;
END;$$;
