-- =====================================================================
-- Migration: Sincronização Bidirecional e Blindagem de Nomes (CRM -> Conversas)
-- =====================================================================

-- 1. Função de Blindagem de Nome
-- Impede que o Webhook do WhatsApp (ou edições) sobrescreva o nome do CRM
CREATE OR REPLACE FUNCTION public.tg_enforce_crm_name()
RETURNS trigger AS $$
DECLARE
  v_crm_name TEXT;
BEGIN
  -- Se o contato tem um cliente_id vinculado
  IF NEW.cliente_id IS NOT NULL THEN
    -- Busca o nome real do cliente no CRM
    SELECT nome INTO v_crm_name FROM public.clientes WHERE id = NEW.cliente_id;
    
    IF v_crm_name IS NOT NULL AND trim(v_crm_name) <> '' THEN
      -- Se a tabela for contatos, altera a coluna 'nome'
      IF TG_TABLE_NAME = 'conversas_contatos' THEN
        NEW.nome := v_crm_name;
      -- Se a tabela for chats, altera a coluna 'contato_nome'
      ELSIF TG_TABLE_NAME = 'conversas_chats' THEN
        NEW.contato_nome := v_crm_name;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove triggers antigos caso existam para evitar duplicidade
DROP TRIGGER IF EXISTS trg_enforce_crm_name_contatos ON public.conversas_contatos;
DROP TRIGGER IF EXISTS trg_enforce_crm_name_chats ON public.conversas_chats;

-- Cria gatilhos que rodam ANTES da inserção ou atualização
CREATE TRIGGER trg_enforce_crm_name_contatos
BEFORE INSERT OR UPDATE OF nome, cliente_id ON public.conversas_contatos
FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_crm_name();

CREATE TRIGGER trg_enforce_crm_name_chats
BEFORE INSERT OR UPDATE OF contato_nome, cliente_id ON public.conversas_chats
FOR EACH ROW EXECUTE FUNCTION public.tg_enforce_crm_name();


-- 2. Sincronização Reversa (Quando o CRM é editado)
-- Atualiza instantaneamente todos os chats e contatos vinculados se o nome do cliente mudar
CREATE OR REPLACE FUNCTION public.tg_sync_crm_name_to_conversas()
RETURNS trigger AS $$
BEGIN
  IF COALESCE(NEW.nome, '') <> COALESCE(OLD.nome, '') THEN
    
    -- Atualiza todos os contatos do WhatsApp vinculados a este cliente
    UPDATE public.conversas_contatos 
    SET nome = NEW.nome 
    WHERE cliente_id = NEW.id;
    
    -- Atualiza todos os chats vinculados a este cliente
    UPDATE public.conversas_chats 
    SET contato_nome = NEW.nome 
    WHERE cliente_id = NEW.id;
    
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS trg_sync_crm_name_to_conversas ON public.clientes;

-- Cria gatilho que roda DEPOIS de uma atualização no CRM
CREATE TRIGGER trg_sync_crm_name_to_conversas
AFTER UPDATE OF nome ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_crm_name_to_conversas();

-- 3. Carga Inicial Retroativa
-- Força a atualização de todos os contatos e chats que já estão vinculados 
-- para garantir que peguem o nome do CRM imediatamente.
UPDATE public.conversas_contatos cc
SET nome = c.nome
FROM public.clientes c
WHERE cc.cliente_id = c.id AND COALESCE(cc.nome, '') <> COALESCE(c.nome, '');

UPDATE public.conversas_chats ch
SET contato_nome = c.nome
FROM public.clientes c
WHERE ch.cliente_id = c.id AND COALESCE(ch.contato_nome, '') <> COALESCE(c.nome, '');
