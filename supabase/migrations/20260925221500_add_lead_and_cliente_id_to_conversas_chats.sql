-- Migração: Adiciona cliente_id e lead_id à tabela conversas_chats para vinculação direta e performática
-- Data: 2026-09-25

ALTER TABLE public.conversas_chats 
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversas_chats_cliente_id ON public.conversas_chats(cliente_id);
CREATE INDEX IF NOT EXISTS idx_conversas_chats_lead_id ON public.conversas_chats(lead_id);
