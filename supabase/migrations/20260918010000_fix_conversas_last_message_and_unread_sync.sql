-- =====================================================================
-- Migration: 20260918010000_fix_conversas_last_message_and_unread_sync.sql
-- Description: 
-- 1. Corrige o trigger `tg_conversas_update_chat_last_message` para que
--    a inserção de mensagens antigas/históricas (via sync de histórico/queue)
--    NÃO sobrescreva a última mensagem do chat com mensagens do passado e
--    NÃO infle indevidamente o `unread_count` com mensagens históricas.
-- 2. Recalcula `ultima_mensagem`, `ultima_mensagem_data`, `type` e `direction`
--    de todos os chats existentes com base na mensagem real mais recente.
-- 3. Reseta contadores de não lidas inflados por histórico quando a última
--    mensagem foi enviada pelo próprio usuário (outbound).
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
      -- Só incrementa unread_count para mensagens novas recebidas (inbound)
      unread_count = CASE
        WHEN NEW.direction = 'inbound' AND conversas_chats.status = 'active'
        THEN conversas_chats.unread_count + 1
        ELSE conversas_chats.unread_count
      END,
      updated_at = now()
    WHERE id = NEW.chat_id;
  END IF;

  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_conversas_update_chat_last_message ON public.conversas_mensagens;
CREATE TRIGGER trg_conversas_update_chat_last_message
  AFTER INSERT ON public.conversas_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversas_update_chat_last_message();

-- Reparação de chats desincronizados:
UPDATE public.conversas_chats c
SET 
  ultima_mensagem = m.content,
  ultima_mensagem_data = m.timestamp,
  ultima_mensagem_type = m.type,
  ultima_mensagem_direction = m.direction,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (chat_id) 
    chat_id, 
    content, 
    timestamp, 
    type, 
    direction
  FROM public.conversas_mensagens
  ORDER BY chat_id, timestamp DESC
) m
WHERE c.id = m.chat_id
  AND (
    c.ultima_mensagem_data IS DISTINCT FROM m.timestamp OR
    c.ultima_mensagem IS DISTINCT FROM m.content OR
    c.ultima_mensagem_type IS DISTINCT FROM m.type OR
    c.ultima_mensagem_direction IS DISTINCT FROM m.direction
  );

-- Limpeza de unread_count inflados por histórico em conversas cujo último envio foi do próprio usuário
UPDATE public.conversas_chats c
SET 
  unread_count = 0,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (chat_id) 
    chat_id, 
    direction
  FROM public.conversas_mensagens
  ORDER BY chat_id, timestamp DESC
) m
WHERE c.id = m.chat_id
  AND c.unread_count > 1
  AND m.direction = 'outbound';
