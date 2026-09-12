-- =====================================================================
-- RPC: conversas_increment_unread
-- ---------------------------------------------------------------------
-- Chamada pelo webhook (`conversas-webhook.ts`) sempre que chega uma
-- mensagem inbound. Soma 1 ao `unread_count` do chat. Foi adicionada
-- depois que o webhook já estava chamando o nome e o erro era engolido
-- por `.catch()` (silencioso). Criada em 2026-09-12.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.conversas_increment_unread(p_chat_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.conversas_chats
  SET unread_count = COALESCE(unread_count, 0) + 1,
      updated_at   = now()
  WHERE id = p_chat_id;
END;
$$;

-- Permitir que o service role chame diretamente (sem RLS context).
GRANT EXECUTE ON FUNCTION public.conversas_increment_unread(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.conversas_increment_unread(UUID) TO authenticated;
