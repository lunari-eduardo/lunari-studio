-- Capa padrão para Galerias de Seleção (análogo a gallery_settings.default_cover_id,
-- que já existe e é exclusivo de Entrega). Aditivo, nullable, sem default obrigatório.
ALTER TABLE public.gallery_settings
  ADD COLUMN IF NOT EXISTS default_selection_cover_id text;
