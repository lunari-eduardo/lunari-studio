-- Migration: 20261001122000_conversas_ai_transcription.sql
-- Description: Adiciona coluna audio_transcript nas mensagens e cria tabela de logs de IA.

-- 1. Adicionar coluna na tabela de mensagens
ALTER TABLE public.conversas_mensagens ADD COLUMN IF NOT EXISTS audio_transcript TEXT;

-- 2. Tabela de logs de IA (métricas)
CREATE TABLE IF NOT EXISTS public.conversas_ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.conversas_mensagens(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'gemini',
  model_used TEXT NOT NULL,
  duration_sec NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.conversas_ai_logs ENABLE ROW LEVEL SECURITY;

-- Owner read
CREATE POLICY "Owner pode ver seus proprios logs de IA"
  ON public.conversas_ai_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Owner insert (e Edge Functions usando service_role bypassam RLS)
CREATE POLICY "Owner pode inserir logs de IA"
  ON public.conversas_ai_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_conversas_ai_logs_user_date 
  ON public.conversas_ai_logs(user_id, created_at DESC);
