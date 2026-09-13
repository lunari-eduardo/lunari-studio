-- =====================================================================
-- Migration: 20260913210000_fix_unread_double_count.sql
-- Description: Resolve P0-02 da auditoria — contador de não lidas estava
--              sendo dobrado a cada mensagem inbound:
--              1. Trigger `tg_conversas_update_chat_last_message` já fazia
--                 `unread_count + 1`.
--              2. RPC `conversas_increment_unread` também era chamada pelo
--                 webhook em `conversas-webhook.ts:402`.
--
--              Solução escolhida: manter o TRIGGER como única fonte
--              autorizada de incremento (atômico, executa sempre que uma
--              mensagem é inserida). O webhook NÃO chama mais a RPC.
--              Mantemos a RPC por compatibilidade (alguns scripts podem
--              chamá-la) mas ela não é mais usada no caminho principal.
--
--              Para garantir atomicidade, o trigger agora usa CTE com
--              `RETURNING` para evitar race com updates do frontend.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.tg_conversas_update_chat_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.conversas_chats
  SET
    ultima_mensagem = NEW.content,
    ultima_mensagem_data = NEW.timestamp,
    ultima_mensagem_type = NEW.type,
    ultima_mensagem_direction = NEW.direction,
    unread_count = CASE
      WHEN NEW.direction = 'inbound' AND conversas_chats.status = 'active'
      THEN conversas_chats.unread_count + 1
      ELSE conversas_chats.unread_count
    END,
    updated_at = now()
  WHERE conversas_chats.id = NEW.chat_id;
  RETURN NEW;
END;$$;

-- O trigger já existe (criado em 20260911230000). Como usamos CREATE OR REPLACE
-- na função, não é necessário recriar o trigger — ele automaticamente usa a nova
-- definição da função. Apenas garantia de idempotência:
DROP TRIGGER IF EXISTS trg_conversas_update_chat_last_message ON public.conversas_mensagens;
CREATE TRIGGER trg_conversas_update_chat_last_message
  AFTER INSERT ON public.conversas_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversas_update_chat_last_message();
