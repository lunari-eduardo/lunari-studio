-- Migration: 20260913100000_fix_conversas_phone_normalization.sql
-- Description: Corrige a funcao normalize_br_phone para evitar duplicacao do nono digito,
--              padroniza phone_normalized para formato numerico puro E.164 (55DDDXXXXXXXX)
--              e higieniza os contatos e chats existentes.

-- 1. Redefinir funcao de normalizacao de telefone
CREATE OR REPLACE FUNCTION public.normalize_br_phone(phone_raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF phone_raw IS NULL OR TRIM(phone_raw) = '' THEN
    RETURN NULL;
  END IF;

  digits := regexp_replace(phone_raw, '[^0-9]', '', 'g');

  IF LEFT(digits, 1) = '0' THEN
    digits := SUBSTRING(digits FROM 2);
  END IF;

  -- Corrige números corrompidos pelo bug anterior (14 dígitos com 99 após o DDD)
  IF LENGTH(digits) = 14 AND LEFT(digits, 2) = '55' AND SUBSTRING(digits FROM 5 FOR 2) = '99' THEN
    digits := '55' || SUBSTRING(digits FROM 3 FOR 2) || SUBSTRING(digits FROM 6);
  END IF;

  -- Se tem 10 ou 11 dígitos (DDD + número local), adiciona 55
  IF LENGTH(digits) IN (10, 11) AND LEFT(digits, 2) != '55' THEN
    digits := '55' || digits;
  END IF;

  -- Se tem 12 ou 13 dígitos e começa com 55, é um número brasileiro válido
  IF (LENGTH(digits) = 12 OR LENGTH(digits) = 13) AND LEFT(digits, 2) = '55' THEN
    RETURN digits;
  END IF;

  RETURN digits;
END;
$$;

-- 2. Atualizar trigger para garantir normalizacao antes do insert/update
CREATE OR REPLACE FUNCTION public.tg_conversas_contatos_normalize()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.phone_raw IS NOT NULL AND NEW.phone_raw != '' THEN
    NEW.phone_normalized := public.normalize_br_phone(NEW.phone_raw);
  ELSIF NEW.phone_normalized IS NOT NULL AND NEW.phone_normalized != '' THEN
    NEW.phone_normalized := public.normalize_br_phone(NEW.phone_normalized);
  END IF;
  RETURN NEW;
END;$$;

-- 3. Higienizar os contatos existentes com a nova regra de normalizacao
UPDATE public.conversas_contatos
SET phone_normalized = public.normalize_br_phone(phone_raw),
    updated_at = now();

-- 4. Atualizar os chats existentes para sincronizar com phone_normalized do contato
UPDATE public.conversas_chats cc
SET contato_phone_normalized = ct.phone_normalized,
    updated_at = now()
FROM public.conversas_contatos ct
WHERE cc.contato_id = ct.id;
