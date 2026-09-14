-- Migration: Adicionar suporte a Quote / Reply em conversas_mensagens
ALTER TABLE conversas_mensagens 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES conversas_mensagens(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS quoted_content TEXT,
ADD COLUMN IF NOT EXISTS quoted_sender TEXT,
ADD COLUMN IF NOT EXISTS quoted_type TEXT;

CREATE INDEX IF NOT EXISTS idx_conversas_mensagens_reply_to_id ON conversas_mensagens(reply_to_id);
