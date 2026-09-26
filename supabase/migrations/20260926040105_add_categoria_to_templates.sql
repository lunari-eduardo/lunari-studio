-- Adiciona a coluna 'categoria' na tabela 'conversas_templates' para habilitar as Sugestões Inteligentes no módulo Conversas
ALTER TABLE conversas_templates ADD COLUMN IF NOT EXISTS categoria text;

-- Cria um índice na nova coluna para otimizar queries por categoria no Painel Direito
CREATE INDEX IF NOT EXISTS idx_conversas_templates_categoria ON conversas_templates(categoria);

-- Comentários para documentação do schema
COMMENT ON COLUMN conversas_templates.categoria IS 'Categoria ou contexto sugerido pela IA (ex: Newborn, Gestante, Casamento) para este modelo';
