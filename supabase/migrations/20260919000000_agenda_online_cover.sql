-- Capa editorial para cada Agenda Online
-- Cada link pode ter sua própria imagem de capa (fotografia temática da experiência)
-- object-position salva o focal point escolhido pelo fotógrafo sem crop destrutivo
-- LQIP (Low Quality Image Placeholder) permite blur-up no carregamento

ALTER TABLE public.agenda_online_links
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS cover_image_position text DEFAULT '50% 50%',
ADD COLUMN IF NOT EXISTS cover_image_lqip text;

COMMENT ON COLUMN public.agenda_online_links.cover_image_url IS
  'URL da imagem de capa no R2 (CDN media.lunarihub.com). Quando nula, usa fallback gradient baseado no tema público.';
COMMENT ON COLUMN public.agenda_online_links.cover_image_position IS
  'Coordenadas CSS object-position para focal point (ex: "50% 30%" ou "top center"). Default: centro.';
COMMENT ON COLUMN public.agenda_online_links.cover_image_lqip IS
  'Base64 LQIP (Low Quality Image Placeholder) gerado client-side para blur-up progressivo.';

-- Nenhuma mudança em RLS: tabela já está protegida por auth.uid() = user_id.
-- Colunas novas são nullable para retrocompatibilidade total com links existentes.
