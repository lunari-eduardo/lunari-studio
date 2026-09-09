-- ====================================================================
-- Migration: Tornar a exibição do valor dos pacotes opcional na Agenda Online
-- ====================================================================

ALTER TABLE public.agenda_online_links
ADD COLUMN IF NOT EXISTS show_package_price boolean DEFAULT true NOT NULL;

NOTIFY pgrst, 'reload schema';
