-- Migration: 20260927041249_fase3_integracao_conversas.sql
-- Description: Implementa o Single Source of Truth para o relacionamento Cliente ↔ Contato (Fase 3).
--              Adiciona Triggers automáticas de vinculação e script de reconciliação histórica.

-- =========================================================================================
-- 1. RPC Base: Vincula um Cliente recém-criado/editado ao seu Contato do WhatsApp
-- =========================================================================================
CREATE OR REPLACE FUNCTION public.link_cliente_to_conversas_contact(p_cliente_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cliente RECORD;
  v_telefone_norm TEXT;
  v_whatsapp_norm TEXT;
  v_contato RECORD;
  v_match_id UUID;
BEGIN
  -- 1. Buscar o cliente e seus dados
  SELECT id, user_id, telefone, whatsapp INTO v_cliente
  FROM public.clientes
  WHERE id = p_cliente_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 2. Normalizar os telefones utilizando a função unificada
  v_telefone_norm := NULL;
  v_whatsapp_norm := NULL;
  
  IF v_cliente.telefone IS NOT NULL AND trim(v_cliente.telefone) <> '' THEN
    v_telefone_norm := public.normalize_br_phone(v_cliente.telefone);
  END IF;
  
  IF v_cliente.whatsapp IS NOT NULL AND trim(v_cliente.whatsapp) <> '' THEN
    v_whatsapp_norm := public.normalize_br_phone(v_cliente.whatsapp);
  END IF;

  -- Se não tem telefone válido para normalizar, não há com quem vincular
  IF v_telefone_norm IS NULL AND v_whatsapp_norm IS NULL THEN
    RETURN;
  END IF;

  -- 3. Buscar correspondência em `conversas_contatos`
  -- Prioridade 1: whatsapp normalizado
  IF v_whatsapp_norm IS NOT NULL THEN
    SELECT * INTO v_contato
    FROM public.conversas_contatos
    WHERE user_id = v_cliente.user_id 
      AND phone_normalized = v_whatsapp_norm
    LIMIT 1;
    
    IF FOUND THEN
      v_match_id := v_contato.id;
    END IF;
  END IF;
  
  -- Prioridade 2: telefone normalizado (se for diferente e ainda não encontrou)
  IF v_match_id IS NULL AND v_telefone_norm IS NOT NULL AND v_telefone_norm <> COALESCE(v_whatsapp_norm, '') THEN
    SELECT * INTO v_contato
    FROM public.conversas_contatos
    WHERE user_id = v_cliente.user_id 
      AND phone_normalized = v_telefone_norm
    LIMIT 1;
    
    IF FOUND THEN
      v_match_id := v_contato.id;
    END IF;
  END IF;

  -- 4. Efetuar o vínculo (se encontrou)
  IF v_match_id IS NOT NULL THEN
    -- Medida de segurança: só vincula se o contato for órfão ou já pertencer a este cliente.
    -- Nunca rouba o contato de outro cliente (ambiguidade).
    IF v_contato.cliente_id IS NULL OR v_contato.cliente_id = p_cliente_id THEN
      
      -- 4.1 Atualiza o registro principal do contato
      UPDATE public.conversas_contatos
      SET cliente_id = p_cliente_id,
          tipo = 'cliente',
          lead_id = NULL,
          updated_at = now()
      WHERE id = v_match_id
        AND (cliente_id IS NULL OR tipo <> 'cliente');

      -- 4.2 Atualiza o histórico de chats do contato de forma cascata
      UPDATE public.conversas_chats
      SET cliente_id = p_cliente_id,
          lead_id = NULL,
          updated_at = now()
      WHERE contato_id = v_match_id
        AND (cliente_id IS NULL OR cliente_id <> p_cliente_id);
    END IF;
  END IF;
END;
$$;

-- =========================================================================================
-- 2. Trigger Function: Escuta alterações de telefone no CRM
-- =========================================================================================
CREATE OR REPLACE FUNCTION public.tg_auto_link_cliente_to_contato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Avalia a mudança
  IF TG_OP = 'INSERT' THEN
    IF (NEW.telefone IS NOT NULL AND trim(NEW.telefone) <> '') OR 
       (NEW.whatsapp IS NOT NULL AND trim(NEW.whatsapp) <> '') THEN
       PERFORM public.link_cliente_to_conversas_contact(NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Apenas se os números realmente mudaram
    IF (COALESCE(NEW.telefone, '') <> COALESCE(OLD.telefone, '')) OR 
       (COALESCE(NEW.whatsapp, '') <> COALESCE(OLD.whatsapp, '')) THEN
       PERFORM public.link_cliente_to_conversas_contact(NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Aplica o trigger na tabela clientes
DROP TRIGGER IF EXISTS trg_auto_link_cliente_to_contato ON public.clientes;
CREATE TRIGGER trg_auto_link_cliente_to_contato
AFTER INSERT OR UPDATE OF telefone, whatsapp
ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.tg_auto_link_cliente_to_contato();

-- =========================================================================================
-- 3. Job de Saneamento: Reconciliação Histórica Sob Demanda
-- =========================================================================================
CREATE OR REPLACE FUNCTION public.reconcile_all_clientes_contacts(p_user_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cliente RECORD;
  v_contato RECORD;
  v_linked_count INT := 0;
  v_ambiguous_count INT := 0;
BEGIN
  -- Varredura 1: Contatos Órfãos buscando seus respectivos donos no CRM
  FOR v_contato IN 
    SELECT id, user_id, phone_normalized 
    FROM public.conversas_contatos 
    WHERE cliente_id IS NULL 
      AND (p_user_id IS NULL OR user_id = p_user_id)
  LOOP
    DECLARE
      v_match RECORD;
    BEGIN
      -- Aproveitamos a RPC já validada e testada da Fase 1/2 para detecção de duplicidades
      SELECT * INTO v_match FROM public.match_conversas_contact_to_crm(v_contato.phone_normalized, v_contato.user_id);
      
      IF v_match IS NOT NULL AND v_match.match_type = 'exact_cliente' AND v_match.cliente_id IS NOT NULL THEN
        -- Vínculo seguro e isolado
        UPDATE public.conversas_contatos
        SET cliente_id = v_match.cliente_id,
            tipo = 'cliente',
            updated_at = now()
        WHERE id = v_contato.id;
        
        UPDATE public.conversas_chats
        SET cliente_id = v_match.cliente_id,
            updated_at = now()
        WHERE contato_id = v_contato.id;
        
        v_linked_count := v_linked_count + 1;
      ELSIF v_match IS NOT NULL AND v_match.match_type = 'ambiguous' THEN
        -- Marca para auditoria se houver disputa entre dois clientes pelo mesmo telefone
        v_ambiguous_count := v_ambiguous_count + 1;
      END IF;
    END;
  END LOOP;

  -- Varredura 2: Sincronização Reversa Forçada (Clientes que foram preenchidos antes da Trigger)
  FOR v_cliente IN 
    SELECT id 
    FROM public.clientes 
    WHERE (telefone IS NOT NULL OR whatsapp IS NOT NULL)
      AND (p_user_id IS NULL OR user_id = p_user_id)
  LOOP
    -- Isso garante que as sessões e galerias do passado também se encontrem e se unam aos chats.
    PERFORM public.link_cliente_to_conversas_contact(v_cliente.id);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'linked_orphans', v_linked_count,
    'ambiguous_skipped', v_ambiguous_count,
    'forced_crm_sync', 'done',
    'timestamp', now()
  );
END;
$$;
