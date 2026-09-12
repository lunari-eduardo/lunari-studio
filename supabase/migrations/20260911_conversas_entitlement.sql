-- Migration: <timestamp>_conversas_entitlement.sql
-- Description: Registra o entitlement 'conversas' no plano Pro.
--              O acesso real dependera das fases 3/4 (Evolution API configurada).

-- Adiciona o entitlement conversas para planos Pro/Trial.
-- Contas free nao terão acesso ate que assinem upgrade.
INSERT INTO public.plan_entitlements (entitlement_key, tier, enabled)
VALUES
  ('conversas', 'pro', true),
  ('conversas', 'trial', true),
  ('conversas', 'free', false)
ON CONFLICT (entitlement_key, tier) DO UPDATE SET enabled = EXCLUDED.enabled;
