-- Migração: Adiciona suporte a categorias manuais e inferidas por IA para Contatos
-- Data: 2026-09-29

ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS categoria_manual_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS categoria_ia_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL;

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS categoria_manual_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS categoria_ia_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL;
