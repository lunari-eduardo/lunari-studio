-- Migration: Adicionar suporte a capa personalizada em formulários e templates
ALTER TABLE public.formularios ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT NULL;
ALTER TABLE public.formulario_templates ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT NULL;
