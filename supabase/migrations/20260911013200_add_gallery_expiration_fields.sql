-- Migration 1: Campos de expiração
ALTER TABLE public.galerias
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prazo_selecao TIMESTAMPTZ;

-- Comentários
COMMENT ON COLUMN galerias.expires_at IS 'Data/hora que o acesso à galeria expira. NULL = sem expiração.';
COMMENT ON COLUMN galerias.prazo_selecao IS 'Data/hora que o prazo de seleção expira. NULL = usa prazo_selecao_dias.';

-- Índice para queries de expiração
CREATE INDEX IF NOT EXISTS idx_galerias_expires_at
  ON public.galerias(expires_at) WHERE expires_at IS NOT NULL;

-- Atualizar constraint de status para permitir 'expirado', 'expirada', 'cancelada', 'publicada'
ALTER TABLE public.galerias DROP CONSTRAINT IF EXISTS galerias_status_check;
ALTER TABLE public.galerias ADD CONSTRAINT galerias_status_check 
  CHECK (status = ANY (ARRAY[
    'rascunho'::text, 
    'enviado'::text, 
    'selecao_iniciada'::text, 
    'selecao_completa'::text, 
    'expirado'::text, 
    'expirada'::text, 
    'cancelada'::text,
    'publicada'::text
  ]));

-- Migration 2: Função de expiração + Cron

-- Função para calcular status de expiração
CREATE OR REPLACE FUNCTION public.get_gallery_expiration_status(p_galeria_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_gallery RECORD;
  v_is_expired BOOLEAN := FALSE;
  v_expires_at TIMESTAMPTZ;
  v_reason TEXT := '';
BEGIN
  SELECT * INTO v_gallery FROM galerias WHERE id = p_galeria_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', FALSE,
      'is_expired', NULL,
      'expires_at', NULL,
      'reason', 'Galeria não encontrada'
    );
  END IF;

  -- Verificar status explícito
  IF v_gallery.status IN ('expirada', 'expirado', 'cancelada', 'cancelled') THEN
    v_is_expired := TRUE;
    v_reason := 'Status explícito: ' || v_gallery.status;
  END IF;

  -- Verificar prazo_selecao (apenas para SELECT cuja seleção ainda não foi concluída)
  IF NOT v_is_expired 
     AND v_gallery.tipo IS DISTINCT FROM 'entrega' 
     AND v_gallery.status_selecao IS DISTINCT FROM 'selecao_completa'
     AND v_gallery.finalized_at IS NULL THEN
    IF v_gallery.prazo_selecao IS NOT NULL AND v_gallery.prazo_selecao < now() THEN
      v_is_expired := TRUE;
      v_expires_at := v_gallery.prazo_selecao;
      v_reason := 'prazo_selecao expirado';
    END IF;
  END IF;

  -- Verificar expires_at (expiração geral do acesso à galeria)
  IF NOT v_is_expired AND v_gallery.expires_at IS NOT NULL AND v_gallery.expires_at < now() THEN
    v_is_expired := TRUE;
    v_expires_at := v_gallery.expires_at;
    v_reason := 'expires_at expirado';
  END IF;

  RETURN jsonb_build_object(
    'found', TRUE,
    'is_expired', v_is_expired,
    'expires_at', v_expires_at,
    'reason', v_reason,
    'status', v_gallery.status,
    'tipo', v_gallery.tipo
  );
END;
$$;

-- Função para marcar galerias expiradas
CREATE OR REPLACE FUNCTION public.expire_galleries()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_rows INTEGER := 0;
BEGIN
  -- 1. Marcar galerias SELECT cujo prazo_selecao expirou (apenas as que ainda estão ativas e NÃO foram finalizadas)
  UPDATE galerias
  SET status = 'expirado', updated_at = now()
  WHERE status IN ('enviado', 'selecao_iniciada')
    AND (finalized_at IS NULL)
    AND (status_selecao IS DISTINCT FROM 'selecao_completa')
    AND tipo IS DISTINCT FROM 'entrega'
    AND prazo_selecao IS NOT NULL
    AND prazo_selecao < now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- 2. Marcar galerias com expires_at expirado (expiração geral do acesso)
  UPDATE galerias
  SET status = 'expirado', updated_at = now()
  WHERE status NOT IN ('expirada', 'expirado', 'cancelada', 'cancelled')
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  RETURN v_count;
END;
$$;

-- Cron job (executar a cada 1 minuto)
SELECT cron.schedule(
  'expire-galleries-every-minute',
  '* * * * *',
  'SELECT public.expire_galleries();'
);

