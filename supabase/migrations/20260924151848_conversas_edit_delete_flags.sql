-- Migration: 20260924151848_conversas_edit_delete_flags.sql
-- Description: Adiciona colunas para exclusão lógica e edição de mensagens.

ALTER TABLE public.conversas_mensagens
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
