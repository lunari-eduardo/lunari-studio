-- 1. Sincroniza retroativamente os chats cujos contatos já estão vinculados a clientes
UPDATE public.conversas_chats c
SET cliente_id = cc.cliente_id,
    contato_nome = COALESCE(cc.nome, c.contato_nome),
    updated_at = NOW()
FROM public.conversas_contatos cc
WHERE cc.id = c.contato_id
  AND cc.cliente_id IS NOT NULL
  AND (c.cliente_id IS NULL OR c.cliente_id != cc.cliente_id);

-- 2. Atualiza tg_conversas_chats_link_contato_nome para também copiar cliente_id no INSERT/UPDATE de chats
CREATE OR REPLACE FUNCTION tg_conversas_chats_link_contato_nome()
RETURNS TRIGGER AS 
DECLARE
  v_contato RECORD;
BEGIN
  SELECT nome, cliente_id INTO v_contato
  FROM public.conversas_contatos
  WHERE id = NEW.contato_id;

  IF v_contato.nome IS NOT NULL AND v_contato.nome != '' THEN
    NEW.contato_nome = v_contato.nome;
  END IF;

  IF v_contato.cliente_id IS NOT NULL AND (NEW.cliente_id IS NULL OR NEW.cliente_id != v_contato.cliente_id) THEN
    NEW.cliente_id = v_contato.cliente_id;
  END IF;

  RETURN NEW;
END;
 LANGUAGE plpgsql;

-- 3. Trigger para quando o contato for vinculado a um cliente, propagar imediatamente para o(s) chat(s)
CREATE OR REPLACE FUNCTION tg_sync_contato_to_chats()
RETURNS TRIGGER AS 
BEGIN
  IF NEW.cliente_id IS DISTINCT FROM OLD.cliente_id OR NEW.nome IS DISTINCT FROM OLD.nome THEN
    UPDATE public.conversas_chats
    SET cliente_id = NEW.cliente_id,
        contato_nome = COALESCE(NEW.nome, contato_nome),
        updated_at = NOW()
    WHERE contato_id = NEW.id;
  END IF;
  RETURN NEW;
END;
 LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_contato_to_chats ON public.conversas_contatos;
CREATE TRIGGER trg_sync_contato_to_chats
AFTER UPDATE OF cliente_id, nome ON public.conversas_contatos
FOR EACH ROW
EXECUTE FUNCTION tg_sync_contato_to_chats();
