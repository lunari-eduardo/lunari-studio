-- Fix expire_studio_trial_storage to correctly schedule deletion

CREATE OR REPLACE FUNCTION public.expire_studio_trial_storage(p_user_id UUID DEFAULT auth.uid())
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_used_bytes BIGINT;
  v_bonus_bytes BIGINT;
  v_limit_bytes BIGINT;
BEGIN
  v_tier := public.get_user_tier(p_user_id);
  
  IF v_tier = 'free' THEN
    -- Get used storage and bonus
    v_used_bytes := COALESCE(public.get_transfer_storage_bytes(p_user_id), 0);
    SELECT COALESCE(storage_bonus_bytes, 0) INTO v_bonus_bytes 
    FROM public.photographer_accounts WHERE user_id = p_user_id;

    v_limit_bytes := v_bonus_bytes + 0; -- 0 is free_transfer_bytes for free tier
    
    UPDATE public.photographer_accounts
    SET 
      free_transfer_bytes = 0,
      account_over_limit = (v_used_bytes > v_limit_bytes),
      over_limit_since = CASE WHEN (v_used_bytes > v_limit_bytes) THEN COALESCE(over_limit_since, now()) ELSE NULL END,
      deletion_scheduled_at = CASE WHEN (v_used_bytes > v_limit_bytes) THEN COALESCE(deletion_scheduled_at, now() + interval '30 days') ELSE NULL END
    WHERE user_id = p_user_id;

  ELSIF v_tier IN ('pro', 'trial') THEN
    UPDATE public.photographer_accounts
    SET 
      free_transfer_bytes = 536870912,
      account_over_limit = false,
      over_limit_since = NULL,
      deletion_scheduled_at = NULL
    WHERE user_id = p_user_id;
  END IF;
END;
$$;
