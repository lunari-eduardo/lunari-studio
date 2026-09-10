-- Phase 1: Fundação de permissões (Banco)

-- 1. Create plan_entitlements table
CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  entitlement_key TEXT NOT NULL,
  tier TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (entitlement_key, tier)
);

ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica" ON public.plan_entitlements FOR SELECT USING (true);
GRANT SELECT ON public.plan_entitlements TO authenticated, anon;

-- 2. Populate plan_entitlements
INSERT INTO public.plan_entitlements (entitlement_key, tier, enabled)
VALUES 
  ('tasks', 'pro', true), ('charge_links', 'pro', true), ('agenda_availability', 'pro', true), 
  ('agenda_online', 'pro', true), ('contracts', 'pro', true), ('forms', 'pro', true), 
  ('client_documents', 'pro', true), ('integrations', 'pro', true), ('payments', 'pro', true), 
  ('finance', 'pro', true), ('pricing', 'pro', true), ('sales_analysis', 'pro', true), 
  ('leads', 'pro', true), ('commercial', 'pro', true), ('transfer_upload', 'pro', true), 
  ('select_credits_renewal', 'pro', true),
  
  ('tasks', 'trial', true), ('charge_links', 'trial', true), ('agenda_availability', 'trial', true), 
  ('agenda_online', 'trial', true), ('contracts', 'trial', true), ('forms', 'trial', true), 
  ('client_documents', 'trial', true), ('integrations', 'trial', true), ('payments', 'trial', true), 
  ('finance', 'trial', true), ('pricing', 'trial', true), ('sales_analysis', 'trial', true), 
  ('leads', 'trial', true), ('commercial', 'trial', true), ('transfer_upload', 'trial', true), 
  ('select_credits_renewal', 'trial', true),

  ('tasks', 'free', false), ('charge_links', 'free', false), ('agenda_availability', 'free', false), 
  ('agenda_online', 'free', false), ('contracts', 'free', false), ('forms', 'free', false), 
  ('client_documents', 'free', false), ('integrations', 'free', false), ('payments', 'free', false), 
  ('finance', 'free', false), ('pricing', 'free', false), ('sales_analysis', 'free', false), 
  ('leads', 'free', false), ('commercial', 'free', false), ('transfer_upload', 'free', false), 
  ('select_credits_renewal', 'free', false)
ON CONFLICT (entitlement_key, tier) DO UPDATE SET enabled = EXCLUDED.enabled;

-- 3. Create helper function to get user tier
CREATE OR REPLACE FUNCTION public.get_user_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_is_admin BOOLEAN;
  v_is_vip BOOLEAN;
  v_is_authorized BOOLEAN;
  v_has_studio_subscription BOOLEAN;
  v_trial_ends_at TIMESTAMPTZ;
BEGIN
  -- Admin
  IF public.has_role(p_user_id, 'admin') THEN
    RETURN 'pro';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;

  -- Authorized emails
  SELECT EXISTS(
    SELECT 1 FROM public.allowed_emails WHERE email = v_user_email
  ) INTO v_is_authorized;
  IF v_is_authorized THEN
    RETURN 'pro';
  END IF;

  -- VIP
  SELECT EXISTS(
    SELECT 1 FROM public.vip_users 
    WHERE user_id = p_user_id 
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_is_vip;
  IF v_is_vip THEN
    RETURN 'pro';
  END IF;

  -- Active Subscription
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions_asaas sa
    LEFT JOIN public.unified_plans up ON up.code = sa.plan_type
    WHERE sa.user_id = p_user_id 
      AND sa.status IN ('ACTIVE', 'PENDING')
      AND (
        COALESCE(up.includes_studio, false) = true
        OR sa.plan_type LIKE 'studio_%'
        OR sa.plan_type LIKE 'combo_%'
      )
  ) INTO v_has_studio_subscription;
  IF v_has_studio_subscription THEN
    RETURN 'pro';
  END IF;

  -- Trial
  SELECT studio_trial_ends_at INTO v_trial_ends_at
  FROM public.profiles WHERE user_id = p_user_id;
  
  IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at > now() THEN
    RETURN 'trial';
  END IF;

  -- Free
  RETURN 'free';
END;
$$;

-- 4. Create has_entitlement
CREATE OR REPLACE FUNCTION public.has_entitlement(_user_id UUID, _key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_enabled BOOLEAN;
BEGIN
  v_tier := public.get_user_tier(_user_id);
  
  SELECT enabled INTO v_enabled
  FROM public.plan_entitlements
  WHERE entitlement_key = _key AND tier = v_tier;
  
  RETURN COALESCE(v_enabled, false);
END;
$$;

-- 5. Create expire_studio_trial_storage
CREATE OR REPLACE FUNCTION public.expire_studio_trial_storage(p_user_id UUID DEFAULT auth.uid())
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  v_tier := public.get_user_tier(p_user_id);
  
  IF v_tier = 'free' THEN
    UPDATE public.photographer_accounts
    SET free_transfer_bytes = 0
    WHERE user_id = p_user_id AND free_transfer_bytes > 0;
  ELSIF v_tier IN ('pro', 'trial') THEN
    UPDATE public.photographer_accounts
    SET free_transfer_bytes = 536870912
    WHERE user_id = p_user_id AND free_transfer_bytes = 0;
  END IF;
END;
$$;

-- 6. Modify get_access_state
CREATE OR REPLACE FUNCTION public.get_access_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_sub RECORD;
  v_is_admin BOOLEAN;
  v_is_vip BOOLEAN;
  v_authorized_plan_code TEXT;
  v_days_remaining INTEGER;
  v_has_galery_access BOOLEAN;
  v_trial_started_at TIMESTAMPTZ;
  v_trial_ends_at TIMESTAMPTZ;
  v_tier TEXT;
  v_entitlements JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_authenticated', 'reason', 'User not authenticated');
  END IF;

  v_tier := public.get_user_tier(v_user_id);

  SELECT COALESCE(jsonb_object_agg(entitlement_key, enabled), '{}'::jsonb)
  INTO v_entitlements
  FROM public.plan_entitlements
  WHERE tier = v_tier;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  v_is_admin := public.has_role(v_user_id, 'admin');

  SELECT plan_code INTO v_authorized_plan_code FROM public.allowed_emails WHERE email = v_user_email;

  SELECT EXISTS(
    SELECT 1 FROM public.vip_users WHERE user_id = v_user_id AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_is_vip;

  SELECT sa.*, up.code as plan_code, up.name as plan_name,
         up.includes_studio, up.includes_select, up.includes_transfer
  INTO v_sub
  FROM public.subscriptions_asaas sa
  LEFT JOIN public.unified_plans up ON up.code = sa.plan_type
  WHERE sa.user_id = v_user_id AND sa.status IN ('ACTIVE', 'PENDING')
  ORDER BY sa.value_cents DESC, sa.created_at DESC
  LIMIT 1;

  SELECT studio_trial_started_at, studio_trial_ends_at
  INTO v_trial_started_at, v_trial_ends_at
  FROM public.profiles
  WHERE user_id = v_user_id;

  v_days_remaining := 0;
  IF v_tier = 'trial' AND v_trial_ends_at IS NOT NULL THEN
     v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_trial_ends_at - now()))::INTEGER);
  ELSIF v_tier = 'pro' AND v_sub.next_due_date IS NOT NULL THEN
     v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_sub.next_due_date::timestamp - now()))::INTEGER);
  END IF;

  v_has_galery_access := true;

  -- Ensure storage is synced on demand
  PERFORM public.expire_studio_trial_storage(v_user_id);

  RETURN jsonb_build_object(
    'status', 'ok',
    'tier', v_tier,
    'entitlements', v_entitlements,
    'reason', 'Access granted',
    'isAdmin', v_is_admin,
    'isVip', v_is_vip,
    'isTrial', (v_tier = 'trial'),
    'isAuthorized', (v_authorized_plan_code IS NOT NULL),
    'subscriptionId', v_sub.id,
    'planCode', COALESCE(v_sub.plan_code, v_sub.plan_type, v_authorized_plan_code, 'studio_pro'),
    'planName', COALESCE(v_sub.plan_name, 'Studio Pro'),
    'currentPeriodEnd', v_sub.next_due_date,
    'daysRemaining', v_days_remaining,
    'cancelAtPeriodEnd', v_sub.pending_downgrade_plan IS NOT NULL,
    'hasGaleryAccess', v_has_galery_access,
    'billingCycle', v_sub.billing_cycle,
    'trialEndsAt', v_trial_ends_at,
    'trialExpired', (v_trial_ends_at < now())
  );
END;
$$;


-- 7. Modify start_studio_trial
CREATE OR REPLACE FUNCTION public.start_studio_trial()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_trial TIMESTAMPTZ;
  v_tier TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Not authenticated');
  END IF;

  SELECT studio_trial_ends_at INTO v_existing_trial
  FROM public.profiles WHERE user_id = v_user_id;

  IF v_existing_trial IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'reason', 'Trial already exists', 'trial_ends_at', v_existing_trial);
  END IF;

  v_tier := public.get_user_tier(v_user_id);
  IF v_tier = 'pro' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Already has pro access');
  END IF;

  -- Start 30-day trial
  UPDATE public.profiles
  SET studio_trial_started_at = now(),
      studio_trial_ends_at = now() + INTERVAL '30 days',
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Initial credits and storage
  UPDATE public.photographer_accounts
  SET free_transfer_bytes = 536870912
  WHERE user_id = v_user_id;

  IF NOT EXISTS(SELECT 1 FROM public.credit_ledger WHERE user_id = v_user_id AND operation_type = 'trial_start') THEN
    INSERT INTO public.credit_ledger (user_id, amount, operation_type, description)
    VALUES (v_user_id, 500, 'trial_start', 'Créditos iniciais do Trial 30 dias');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reason', 'Trial started',
    'trial_ends_at', (now() + INTERVAL '30 days')::text
  );
END;
$$;

-- 8. Backfill existing expired trials
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT p.user_id 
    FROM public.profiles p
    WHERE p.studio_trial_ends_at < now()
  ) LOOP
    PERFORM public.expire_studio_trial_storage(r.user_id);
  END LOOP;
END;
$$;
