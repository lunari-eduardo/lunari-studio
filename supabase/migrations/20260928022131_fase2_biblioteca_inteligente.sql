-- Migration para Fase 2: Biblioteca Inteligente
-- Evolui a tabela conversas_templates sem quebrar a base atual

ALTER TABLE public.conversas_templates
  ADD COLUMN categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  ADD COLUMN etapa TEXT CHECK (etapa IN ('primeiro_contato', 'orcamento', 'follow_up', 'pre_ensaio', 'financeiro', 'pos_venda', 'entrega')),
  ADD COLUMN palavras_chave JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN ordem INTEGER NOT NULL DEFAULT 0;

-- Adiciona índice para a busca por etapa e categoria que serão frequentes pela Lua
CREATE INDEX IF NOT EXISTS idx_conversas_templates_etapa ON public.conversas_templates(etapa);
CREATE INDEX IF NOT EXISTS idx_conversas_templates_categoria_id ON public.conversas_templates(categoria_id);
