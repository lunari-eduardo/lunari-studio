-- Migration: Adicionar coluna pin_origin e limite de 5 chats fixados

-- 1. Adicionar coluna pin_origin
ALTER TABLE public.conversas_chats
ADD COLUMN pin_origin TEXT CHECK (pin_origin IN ('lunari', 'whatsapp')) DEFAULT 'lunari';

-- 2. Criar função de validação de limite de pin (máx 5)
CREATE OR REPLACE FUNCTION tg_check_pin_limit()
RETURNS TRIGGER AS $$
DECLARE
  pinned_count INT;
BEGIN
  -- Se estamos inserindo um chat já pino ou atualizando para pinado
  IF NEW.pin = 'pinned' AND (TG_OP = 'INSERT' OR OLD.pin != 'pinned') THEN
    SELECT COUNT(*) INTO pinned_count
    FROM public.conversas_chats
    WHERE user_id = NEW.user_id 
      AND instance_id = NEW.instance_id
      AND pin = 'pinned'
      AND id != NEW.id;

    IF pinned_count >= 5 THEN
      RAISE EXCEPTION 'Limite de 5 conversas fixadas atingido.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger
DROP TRIGGER IF EXISTS trg_conversas_check_pin_limit ON public.conversas_chats;
CREATE TRIGGER trg_conversas_check_pin_limit
BEFORE INSERT OR UPDATE OF pin ON public.conversas_chats
FOR EACH ROW
EXECUTE FUNCTION tg_check_pin_limit();
