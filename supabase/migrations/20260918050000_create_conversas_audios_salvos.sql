-- Migration: conversas_audios_salvos
-- Criação da tabela de catálogo de áudios salvos por estúdio.

CREATE TABLE IF NOT EXISTS conversas_audios_salvos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL DEFAULT 'Áudio sem nome',
  duration      INTEGER NOT NULL CHECK (duration > 0 AND duration <= 600),
  file_size     BIGINT,
  media_url     TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uso_count     INTEGER NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE conversas_audios_salvos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proprietario_rw"
  ON conversas_audios_salvos
  FOR ALL
  USING (auth.uid() = user_id);

-- Index para listagem rápida por estúdio + ordenação
CREATE INDEX IF NOT EXISTS idx_audios_salvos_user_created
  ON conversas_audios_salvos(user_id, created_at DESC);

-- Index para ordenação por popularidade
CREATE INDEX IF NOT EXISTS idx_audios_salvos_user_usocount
  ON conversas_audios_salvos(user_id, uso_count DESC);
