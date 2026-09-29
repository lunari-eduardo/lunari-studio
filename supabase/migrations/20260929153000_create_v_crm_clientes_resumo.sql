-- Migration: Criação de índices e da View agregada v_crm_clientes_resumo para CRM de Clientes
-- Performance otimizada para paginação server-side com RLS herdado das tabelas base

-- 1. Índices para performance instantânea
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes (user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_user_nome ON public.clientes (user_id, nome);
CREATE INDEX IF NOT EXISTS idx_clientes_sessoes_user_cliente ON public.clientes_sessoes (user_id, cliente_id);

-- 2. View agregada para Clientes CRM com Security Invoker (respeita RLS das tabelas base)
CREATE OR REPLACE VIEW public.v_crm_clientes_resumo
WITH (security_invoker = true)
AS
SELECT 
    c.id,
    c.user_id,
    c.nome,
    c.nome_checkout,
    c.email,
    c.telefone,
    c.whatsapp,
    c.origem,
    c.data_nascimento,
    c.created_at,
    c.updated_at,
    -- Avatar: prioriza foto de perfil do WhatsApp em conversas_contatos, senão c.avatar_url
    COALESCE(cc.avatar_url, c.avatar_url) AS avatar_url,
    cc.id AS conversas_contato_id,
    -- Dependente (primeiro cônjuge ou filho)
    cf.nome AS dependente_nome,
    cf.tipo AS dependente_tipo,
    -- Métricas de sessões (desconsiderando canceladas, histórico e stubs)
    COUNT(s.id) FILTER (WHERE s.status IS NULL OR s.status NOT IN ('historico', 'stub', 'cancelada', 'cancelado'))::integer AS sessoes_count,
    COALESCE(SUM(s.valor_total) FILTER (WHERE s.status IS NULL OR s.status NOT IN ('historico', 'stub', 'cancelada', 'cancelado')), 0)::numeric AS total_faturado,
    COALESCE(SUM(s.valor_pago) FILTER (WHERE s.status IS NULL OR s.status NOT IN ('historico', 'stub', 'cancelada', 'cancelado')), 0)::numeric AS total_pago,
    GREATEST(0, COALESCE(SUM(s.valor_total) FILTER (WHERE s.status IS NULL OR s.status NOT IN ('historico', 'stub', 'cancelada', 'cancelado')), 0) - COALESCE(SUM(s.valor_pago) FILTER (WHERE s.status IS NULL OR s.status NOT IN ('historico', 'stub', 'cancelada', 'cancelado')), 0))::numeric AS a_receber,
    MAX(s.data_sessao) FILTER (WHERE s.status IS NULL OR s.status NOT IN ('historico', 'stub', 'cancelada', 'cancelado')) AS ultima_sessao_data,
    -- Categoria da sessão mais recente
    (
        SELECT s_last.categoria 
        FROM public.clientes_sessoes s_last 
        WHERE s_last.cliente_id = c.id 
          AND s_last.user_id = c.user_id
          AND (s_last.status IS NULL OR s_last.status NOT IN ('historico', 'stub', 'cancelada', 'cancelado'))
          AND s_last.categoria IS NOT NULL AND s_last.categoria != ''
        ORDER BY s_last.data_sessao DESC NULLS LAST, s_last.created_at DESC NULLS LAST
        LIMIT 1
    ) AS categoria_recente
FROM public.clientes c
LEFT JOIN LATERAL (
    SELECT id, avatar_url 
    FROM public.conversas_contatos 
    WHERE conversas_contatos.cliente_id = c.id 
      AND conversas_contatos.user_id = c.user_id
      AND conversas_contatos.avatar_url IS NOT NULL 
      AND conversas_contatos.avatar_url != ''
    LIMIT 1
) cc ON true
LEFT JOIN LATERAL (
    SELECT nome, tipo 
    FROM public.clientes_familia 
    WHERE clientes_familia.cliente_id = c.id 
      AND clientes_familia.user_id = c.user_id
    ORDER BY created_at ASC 
    LIMIT 1
) cf ON true
LEFT JOIN public.clientes_sessoes s ON s.cliente_id = c.id AND s.user_id = c.user_id
GROUP BY c.id, c.user_id, c.nome, c.nome_checkout, c.email, c.telefone, c.whatsapp, c.origem, c.data_nascimento, c.created_at, c.updated_at, c.avatar_url, cc.avatar_url, cc.id, cf.nome, cf.tipo;

-- 3. Permissões
GRANT SELECT ON public.v_crm_clientes_resumo TO authenticated;
GRANT SELECT ON public.v_crm_clientes_resumo TO service_role;
