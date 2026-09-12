-- Migration: 20260911230000_conversas_schema.sql
-- Description: Schema base do modulo Conversas (WhatsApp / Evolution API v2).
--              6 tabelas + RLS + indices + audit trail de webhooks.

-- ════════════════════════════════════════════════════════════════════════════
-- 0. Funcao helper: normalizar telefone brasileiro para E.164
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.normalize_br_phone(phone_raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
  normalized TEXT;
BEGIN
  -- Remove tudo que nao e digito
  digits := regexp_replace(phone_raw, '[^0-9]', '', 'g');

  -- Se comeca com 0, remove (discagem de longa distância)
  IF LEFT(digits, 1) = '0' THEN
    digits := SUBSTRING(digits FROM 2);
  END IF;

  -- Brasil: DDI 55
  IF LEFT(digits, 2) != '55' THEN
    digits := '55' || digits;
  END IF;

  -- Telefone brasileiro com 9 digitos: +55 DDD 9 XXXX-XXXX
  -- Se o 4o digito (apos 55) nao for 9, insere o 9
  -- Ex: 554199999999 -> ja tem 9 | 55419999999 -> falta o 9
  IF LENGTH(digits) = 12 AND SUBSTRING(digits, 3, 1) != '9' THEN
    -- DDD de 2 dig sem o 9: insere 9 apos o DDD
    digits := '55' || SUBSTRING(digits, 3, 2) || '9' || SUBSTRING(digits FROM 5);
  ELSIF LENGTH(digits) = 13 AND SUBSTRING(digits, 3, 1) != '9' THEN
    digits := '55' || SUBSTRING(digits, 3, 2) || '9' || SUBSTRING(digits FROM 5);
  END IF;

  normalized := '+' || digits;
  RETURN normalized;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. conversas_instancias — Instancias WhatsApp (Evolution API)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.conversas_instancias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  instance_id TEXT NOT NULL,             -- ID gerado pela Evolution API
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
  phone TEXT,                            -- Numero da instancia (opcional)
  webhook_url TEXT,                      -- WebhookURL configurado na Evolution
  evolution_token TEXT,                  -- Token de instancia (criptografado futuramente)
  qrcode_data TEXT,                      -- QRCode base64 (apenas quando connecting)
  qrcode_expires_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',           -- Configuracoes da instancia
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, instance_name)
);

ALTER TABLE public.conversas_instancias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner gerencia instancias"
  ON public.conversas_instancias
  FOR ALL
  USING (auth.uid() = user_id);

-- Helper: auto-update updated_at
CREATE OR REPLACE FUNCTION public.tg_conversas_instancias_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;
CREATE TRIGGER trg_conversas_instancias_updated_at
  BEFORE UPDATE ON public.conversas_instancias
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversas_instancias_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- 2. conversas_contatos — Contatos normalizados
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.conversas_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_raw TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  nome TEXT,
  avatar_url TEXT,
  tipo TEXT NOT NULL DEFAULT 'unknown'
    CHECK (tipo IN ('cliente', 'lead', 'unknown')),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  lead_id UUID,                          -- TODO: referenciar tabela leads quando existir
  total_conversas INT NOT NULL DEFAULT 0,
  ultima_mensagem TEXT,
  ultima_mensagem_data TIMESTAMPTZ,
  unread_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, phone_normalized)
);

ALTER TABLE public.conversas_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner gerencia contatos"
  ON public.conversas_contatos
  FOR ALL
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_conversas_contatos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;
CREATE TRIGGER trg_conversas_contatos_updated_at
  BEFORE UPDATE ON public.conversas_contatos
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversas_contatos_updated_at();

-- Auto-normalizar phone_normalized na inserção
CREATE OR REPLACE FUNCTION public.tg_conversas_contatos_normalize()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.phone_normalized := public.normalize_br_phone(NEW.phone_raw);
  RETURN NEW;
END;$$;
CREATE TRIGGER trg_conversas_contatos_normalize
  BEFORE INSERT OR UPDATE ON public.conversas_contatos
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversas_contatos_normalize();

-- ════════════════════════════════════════════════════════════════════════════
-- 3. conversas_chats — Threads de conversa
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.conversas_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contato_id UUID NOT NULL REFERENCES public.conversas_contatos(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.conversas_instancias(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'blocked')),
  pin TEXT NOT NULL DEFAULT 'unpinned'
    CHECK (pin IN ('pinned', 'unpinned')),
  mute BOOLEAN NOT NULL DEFAULT false,
  unread_count INT NOT NULL DEFAULT 0,
  -- Dados denormalizados do contato (display sem JOIN)
  contato_nome TEXT,
  contato_avatar TEXT,
  contato_phone_normalized TEXT,
  -- Ultima mensagem (atualizado por trigger)
  ultima_mensagem TEXT,
  ultima_mensagem_data TIMESTAMPTZ,
  ultima_mensagem_type TEXT
    CHECK (ultima_mensagem_type IS NULL OR ultima_mensagem_type IN (
      'text','image','audio','video','document','sticker','location','contact','template'
    )),
  ultima_mensagem_direction TEXT
    CHECK (ultima_mensagem_direction IS NULL OR ultima_mensagem_direction IN ('inbound', 'outbound')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(contato_id, instance_id)
);

ALTER TABLE public.conversas_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner gerencia chats"
  ON public.conversas_chats
  FOR ALL
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_conversas_chats_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;
CREATE TRIGGER trg_conversas_chats_updated_at
  BEFORE UPDATE ON public.conversas_chats
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversas_chats_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- 4. conversas_mensagens — Mensagens
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.conversas_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.conversas_chats(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.conversas_instancias(id) ON DELETE CASCADE,
  evolution_msg_id TEXT,                 -- ID da Evolution API (idempotencia)
  direction TEXT NOT NULL
    CHECK (direction IN ('inbound', 'outbound')),
  type TEXT NOT NULL DEFAULT 'text'
    CHECK (type IN (
      'text','image','audio','video','document','sticker','location','contact','template'
    )),
  content TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  media_mime_type TEXT,
  media_size_bytes BIGINT,
  media_filename TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  is_forwarded BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),   -- data/hora real da msg
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Idempotência: uma mesma mensagem da Evolution não insere duplicata
  UNIQUE(user_id, evolution_msg_id)
    -- Importante: evolução_msg_id pode ser NULL para msgs locais (pending)
);

ALTER TABLE public.conversas_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner gerencia mensagens"
  ON public.conversas_mensagens
  FOR ALL
  USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 5. conversas_notas — Notas internas de chat
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.conversas_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.conversas_chats(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversas_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner gerencia notas"
  ON public.conversas_notas
  FOR ALL
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_conversas_notas_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;
CREATE TRIGGER trg_conversas_notas_updated_at
  BEFORE UPDATE ON public.conversas_notas
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversas_notas_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- 6. conversas_templates — Templates de mensagem
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.conversas_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  variaveis JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversas_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner gerencia templates"
  ON public.conversas_templates
  FOR ALL
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_conversas_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;
CREATE TRIGGER trg_conversas_templates_updated_at
  BEFORE UPDATE ON public.conversas_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversas_templates_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- 7. conversas_webhook_events — Audit trail dos webhooks recebidos
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.conversas_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversas_webhook_events ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode inserir (webhook do Evolution API)
CREATE POLICY "Webhook insere eventos"
  ON public.conversas_webhook_events
  FOR INSERT
  WITH CHECK (true);

-- Owner pode ler e atualizar
CREATE POLICY "Owner le e processa eventos"
  ON public.conversas_webhook_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversas_instancias ci
      WHERE ci.instance_id = conversas_webhook_events.instance_id
        AND ci.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner atualiza eventos"
  ON public.conversas_webhook_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversas_instancias ci
      WHERE ci.instance_id = conversas_webhook_events.instance_id
        AND ci.user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 8. Trigger: atualizar ultima_mensagem do chat ao inserir mensagem
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.tg_conversas_update_chat_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.conversas_chats
  SET
    ultima_mensagem = CASE WHEN NEW.direction = 'inbound' THEN NEW.content ELSE ultima_mensagem END,
    ultima_mensagem_data = NEW.timestamp,
    ultima_mensagem_type = NEW.type,
    ultima_mensagem_direction = NEW.direction,
    unread_count = CASE
      WHEN NEW.direction = 'inbound' AND conversas_chats.status = 'active'
      THEN unread_count + 1
      ELSE unread_count
    END
  WHERE conversas_chats.id = NEW.chat_id;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_conversas_update_chat_last_message
  AFTER INSERT ON public.conversas_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversas_update_chat_last_message();

-- ════════════════════════════════════════════════════════════════════════════
-- 9. Trigger: atualizar total_conversas e ultima_mensagem do contato
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.tg_conversas_update_contato_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.conversas_contatos
  SET
    total_conversas = total_conversas + 1,
    ultima_mensagem = CASE WHEN NEW.direction = 'inbound' THEN NEW.content ELSE ultima_mensagem END,
    ultima_mensagem_data = NEW.timestamp
  WHERE conversas_contatos.id = (
    SELECT contato_id FROM public.conversas_chats WHERE id = NEW.chat_id
  );
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_conversas_update_contato_stats
  AFTER INSERT ON public.conversas_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.tg_conversas_update_contato_stats();

-- ════════════════════════════════════════════════════════════════════════════
-- 10. Índices de performance
-- ════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_conversas_mensagens_chat_id
  ON public.conversas_mensagens(chat_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_conversas_mensagens_idempotencia
  ON public.conversas_mensagens(user_id, evolution_msg_id)
  WHERE evolution_msg_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversas_chats_user_status
  ON public.conversas_chats(user_id, status, pin, ultima_mensagem_data DESC);

CREATE INDEX IF NOT EXISTS idx_conversas_contatos_phone
  ON public.conversas_contatos(user_id, phone_normalized);

CREATE INDEX IF NOT EXISTS idx_conversas_contatos_cliente
  ON public.conversas_contatos(cliente_id)
  WHERE cliente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversas_webhook_events_instance
  ON public.conversas_webhook_events(instance_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversas_notas_chat_id
  ON public.conversas_notas(chat_id);

CREATE INDEX IF NOT EXISTS idx_conversas_mensagens_status
  ON public.conversas_mensagens(user_id, status)
  WHERE status IN ('pending', 'failed');
