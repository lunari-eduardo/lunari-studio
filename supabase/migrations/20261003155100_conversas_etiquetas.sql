-- Migration for Conversas Etiquetas

-- Create table for custom labels
CREATE TABLE IF NOT EXISTS public.conversas_etiquetas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cor VARCHAR(50) NOT NULL DEFAULT '#EF4444', -- Default red
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, nome)
);

-- RLS for conversas_etiquetas
ALTER TABLE public.conversas_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversas_etiquetas"
  ON public.conversas_etiquetas
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_conversas_etiquetas_updated_at
  BEFORE UPDATE ON public.conversas_etiquetas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add etiquetas array to conversas_chats
ALTER TABLE public.conversas_chats
  ADD COLUMN IF NOT EXISTS etiquetas UUID[] DEFAULT '{}'::uuid[];

-- Create an index to make filtering by label faster (GIN index for array)
CREATE INDEX IF NOT EXISTS idx_conversas_chats_etiquetas ON public.conversas_chats USING GIN (etiquetas);

-- Ensure Realtime will broadcast the new column
-- (Assuming conversas_chats is already in the supabase_realtime publication,
-- the new column will be included automatically if we are just altering the table).
