-- 20260917170000_secure_integration_secrets.sql
-- 1. Revogar o SELECT das tabelas que contem tokens das roles do Supabase
REVOKE SELECT ON public.usuarios_integracoes FROM authenticated;
REVOKE SELECT ON public.usuarios_integracoes FROM anon;

-- 2. Conceder SELECT explicitamente apenas para as colunas no-sensveis
GRANT SELECT (id, user_id, provedor, mp_user_id, status, conectado_em, expira_em, dados_extras, is_default, mp_public_key, created_at, updated_at) 
ON public.usuarios_integracoes TO authenticated;

GRANT SELECT (id, user_id, provedor, mp_user_id, status, conectado_em, expira_em, dados_extras, is_default, mp_public_key, created_at, updated_at) 
ON public.usuarios_integracoes TO anon;

-- 3. Repetir o processo para meta_integrations
REVOKE SELECT ON public.meta_integrations FROM authenticated;
REVOKE SELECT ON public.meta_integrations FROM anon;

GRANT SELECT (id, user_id, app_id, phone_number_id, waba_id, active, created_at, updated_at) 
ON public.meta_integrations TO authenticated;

GRANT SELECT (id, user_id, app_id, phone_number_id, waba_id, active, created_at, updated_at) 
ON public.meta_integrations TO anon;

-- service_role continua com ALL PRIVILEGES em todas as colunas
GRANT SELECT ON public.usuarios_integracoes TO service_role;
GRANT SELECT ON public.meta_integrations TO service_role;
