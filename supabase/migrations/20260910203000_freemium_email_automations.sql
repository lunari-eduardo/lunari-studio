-- Migration: 20260910203000_freemium_email_automations.sql
-- Description: Adiciona o entitlement email_automations e regras de seguranca para desativar automacoes de e-mail em contas free.

-- 1. Inserir o entitlement email_automations na tabela plan_entitlements
INSERT INTO public.plan_entitlements (entitlement_key, tier, enabled)
VALUES 
  ('email_automations', 'pro', true),
  ('email_automations', 'trial', true),
  ('email_automations', 'free', false)
ON CONFLICT (entitlement_key, tier) DO UPDATE SET enabled = EXCLUDED.enabled;

-- 2. Desativar automacoes de e-mails em contas existentes que ja estao no plano free
UPDATE public.gallery_settings gs
SET 
  email_sending_enabled = false,
  email_on_gallery_sent = false,
  email_on_gallery_reactivated = false,
  email_on_payment_confirmed = false,
  email_on_selection_reminder = false,
  email_on_selection_confirmed = false
WHERE public.get_user_tier(gs.user_id) = 'free';

-- 3. Funcao e trigger para garantir que usuarios free nao ativem automacoes de e-mail
CREATE OR REPLACE FUNCTION public.enforce_gallery_settings_freemium()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS 
DECLARE
  v_tier TEXT;
BEGIN
  v_tier := public.get_user_tier(NEW.user_id);
  IF v_tier = 'free' THEN
    NEW.email_sending_enabled := false;
    NEW.email_on_gallery_sent := false;
    NEW.email_on_gallery_reactivated := false;
    NEW.email_on_payment_confirmed := false;
    NEW.email_on_selection_reminder := false;
    NEW.email_on_selection_confirmed := false;
  END IF;
  RETURN NEW;
END;
;

DROP TRIGGER IF EXISTS trg_enforce_gallery_settings_freemium ON public.gallery_settings;
CREATE TRIGGER trg_enforce_gallery_settings_freemium
  BEFORE INSERT OR UPDATE ON public.gallery_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_gallery_settings_freemium();

-- 4. Atualizar expire_studio_trial_storage para desligar automacoes de e-mail no downgrade/fim de trial
CREATE OR REPLACE FUNCTION public.expire_studio_trial_storage(p_user_id UUID DEFAULT auth.uid())
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS 
DECLARE
  v_tier TEXT;
BEGIN
  v_tier := public.get_user_tier(p_user_id);
  
  IF v_tier = 'free' THEN
    UPDATE public.photographer_accounts
    SET free_transfer_bytes = 0
    WHERE user_id = p_user_id AND free_transfer_bytes > 0;

    UPDATE public.gallery_settings
    SET 
      email_sending_enabled = false,
      email_on_gallery_sent = false,
      email_on_gallery_reactivated = false,
      email_on_payment_confirmed = false,
      email_on_selection_reminder = false,
      email_on_selection_confirmed = false
    WHERE user_id = p_user_id;
  ELSIF v_tier IN ('pro', 'trial') THEN
    UPDATE public.photographer_accounts
    SET free_transfer_bytes = 536870912
    WHERE user_id = p_user_id AND free_transfer_bytes = 0;
  END IF;
END;
;
