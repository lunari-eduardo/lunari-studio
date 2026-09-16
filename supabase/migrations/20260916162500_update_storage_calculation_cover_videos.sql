-- A migration to include gallery cover videos (which are stored outside of galeria_fotos) in the studio storage total.

CREATE OR REPLACE FUNCTION public.get_transfer_storage_bytes(_user_id uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 
    (
      -- SOMA 1: Tamanho das fotos na tabela galeria_fotos
      COALESCE(
        (SELECT SUM(
          CASE 
            WHEN gf.original_file_size IS NOT NULL THEN gf.original_file_size
            ELSE gf.file_size
          END
        )
        FROM public.galeria_fotos gf
        INNER JOIN public.galerias g ON g.id = gf.galeria_id
        WHERE g.user_id = _user_id
          AND g.tipo = 'entrega'
          AND g.status NOT IN ('excluida')), 
        0
      )
      +
      -- SOMA 2: Tamanho dos vídeos de capa na coluna configuracoes (JSON)
      COALESCE(
        (SELECT SUM(
          COALESCE((g.configuracoes->'coverVideo'->>'desktopSize')::numeric, 0) +
          COALESCE((g.configuracoes->'coverVideo'->>'mobileSize')::numeric, 0)
        )
        FROM public.galerias g
        WHERE g.user_id = _user_id
          AND g.tipo = 'entrega'
          AND g.status NOT IN ('excluida')),
        0
      )
    )::BIGINT;
$function$;
