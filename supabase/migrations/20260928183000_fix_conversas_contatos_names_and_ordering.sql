-- =====================================================================
-- Migration: Correção de Nomes, Ordenação e Limpeza de Contatos do WhatsApp
-- =====================================================================

-- 1. Excluir registros órfãos ou inválidos de IDs internos do WhatsApp (@lid ou próprios) sem mensagens
DELETE FROM public.conversas_contatos
WHERE length(phone_raw) > 13 
   OR length(phone_normalized) > 13 
   OR phone_raw LIKE '%lid%' 
   OR nome = 'Você';

-- 2. Sincronizar retroativamente os nomes dos contatos a partir de conversas_chats
-- Quando o contato não tem nome ou está em branco, mas o chat possui contato_nome
UPDATE public.conversas_contatos cc
SET nome = ch.contato_nome,
    updated_at = NOW()
FROM public.conversas_chats ch
WHERE ch.contato_id = cc.id
  AND (cc.nome IS NULL OR trim(cc.nome) = '')
  AND ch.contato_nome IS NOT NULL
  AND trim(ch.contato_nome) <> '';

-- 3. Sincronizar retroativamente ultima_mensagem_data de conversas_chats para conversas_contatos
UPDATE public.conversas_contatos cc
SET ultima_mensagem_data = ch.ultima_mensagem_data,
    ultima_mensagem = COALESCE(ch.ultima_mensagem, cc.ultima_mensagem),
    updated_at = NOW()
FROM public.conversas_chats ch
WHERE ch.contato_id = cc.id
  AND ch.ultima_mensagem_data IS NOT NULL
  AND (cc.ultima_mensagem_data IS NULL OR ch.ultima_mensagem_data > cc.ultima_mensagem_data);

-- 4. Aprimorar função tg_conversas_chats_link_contato_nome para sincronização bidirecional de nomes
CREATE OR REPLACE FUNCTION tg_conversas_chats_link_contato_nome()
RETURNS TRIGGER AS $$
DECLARE
  v_contato RECORD;
BEGIN
  SELECT nome, cliente_id INTO v_contato
  FROM public.conversas_contatos
  WHERE id = NEW.contato_id;

  -- Se o contato tem nome, propaga para o chat
  IF v_contato.nome IS NOT NULL AND v_contato.nome != '' THEN
    NEW.contato_nome = v_contato.nome;
  -- Se o contato NÃO tem nome, mas o chat tem contato_nome, propaga para o contato
  ELSIF NEW.contato_nome IS NOT NULL AND NEW.contato_nome != '' THEN
    UPDATE public.conversas_contatos
    SET nome = NEW.contato_nome,
        updated_at = NOW()
    WHERE id = NEW.contato_id;
  END IF;

  IF v_contato.cliente_id IS NOT NULL AND (NEW.cliente_id IS NULL OR NEW.cliente_id != v_contato.cliente_id) THEN
    NEW.cliente_id = v_contato.cliente_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger em conversas_chats para atualizar ultima_mensagem_data e nome no contato correspondente
CREATE OR REPLACE FUNCTION tg_conversas_chats_sync_to_contato()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ultima_mensagem_data IS DISTINCT FROM OLD.ultima_mensagem_data 
     OR (NEW.contato_nome IS DISTINCT FROM OLD.contato_nome AND NEW.contato_nome IS NOT NULL AND NEW.contato_nome <> '') THEN
    UPDATE public.conversas_contatos
    SET ultima_mensagem_data = COALESCE(NEW.ultima_mensagem_data, ultima_mensagem_data),
        ultima_mensagem = COALESCE(NEW.ultima_mensagem, ultima_mensagem),
        nome = COALESCE(NULLIF(nome, ''), NEW.contato_nome),
        updated_at = NOW()
    WHERE id = NEW.contato_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversas_chats_sync_to_contato ON public.conversas_chats;
CREATE TRIGGER trg_conversas_chats_sync_to_contato
AFTER UPDATE OF ultima_mensagem_data, contato_nome ON public.conversas_chats
FOR EACH ROW
EXECUTE FUNCTION tg_conversas_chats_sync_to_contato();
