-- ============================================================================
-- SECURITY FIX: Complete Database Hardening Migration
-- Addresses: 2 Security Definer Views + 5 Functions Missing search_path
-- ============================================================================

-- ============================================================================
-- PART 1: Convert Security Definer Views to Functions
-- ============================================================================

-- Drop existing security definer views
DROP VIEW IF EXISTS public.my_chat_access CASCADE;
DROP VIEW IF EXISTS public.my_subscription_status CASCADE;

-- Replace my_chat_access view with secure function
CREATE OR REPLACE FUNCTION public.get_my_chat_access()
RETURNS TABLE(
  user_id uuid,
  role text,
  allowed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() AS user_id,
    jwt_role() AS role,
    has_chat_access(auth.uid()) AS allowed;
$$;

COMMENT ON FUNCTION public.get_my_chat_access() IS 
'Returns current user chat access status. Replaces my_chat_access view.';

-- Replace my_subscription_status view with secure function
CREATE OR REPLACE FUNCTION public.get_my_subscription_status()
RETURNS TABLE(
  user_id uuid,
  role text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() AS user_id,
    jwt_role() AS role,
    has_active_subscription(auth.uid()) AS is_active;
$$;

COMMENT ON FUNCTION public.get_my_subscription_status() IS 
'Returns current user subscription status. Replaces my_subscription_status view.';

-- ============================================================================
-- PART 2: Fix Functions Missing search_path
-- ============================================================================

-- Fix update_product_images_updated_at
CREATE OR REPLACE FUNCTION public.update_product_images_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_ai_generations_updated_at
CREATE OR REPLACE FUNCTION public.update_ai_generations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_daily_messages_updated_at
CREATE OR REPLACE FUNCTION public.update_daily_messages_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_push_subscriptions_updated_at (incorrect search_path)
CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix update_user_streak (SECURITY DEFINER missing search_path)
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id uuid)
RETURNS TABLE(current_streak integer, longest_streak integer, badge_earned boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_last_checkin DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_badge_earned BOOLEAN := FALSE;
BEGIN
  -- Get or create streak record
  SELECT last_checkin_date, current_streak, longest_streak
  INTO v_last_checkin, v_current_streak, v_longest_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_checkin_date)
    VALUES (p_user_id, 1, 1, CURRENT_DATE)
    RETURNING user_streaks.current_streak, user_streaks.longest_streak 
    INTO v_current_streak, v_longest_streak;
    
    v_badge_earned := TRUE;
    RETURN QUERY SELECT v_current_streak, v_longest_streak, v_badge_earned;
    RETURN;
  END IF;
  
  -- Check if checkin is today (already checked in)
  IF v_last_checkin = CURRENT_DATE THEN
    RETURN QUERY SELECT v_current_streak, v_longest_streak, FALSE;
    RETURN;
  END IF;
  
  -- Check if checkin was yesterday (continue streak)
  IF v_last_checkin = CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
  ELSE
    -- Streak broken, reset to 1
    v_current_streak := 1;
  END IF;
  
  -- Update longest streak if current is higher
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  -- Award badges for milestones
  IF v_current_streak IN (3, 7, 14, 30, 60, 100) THEN
    v_badge_earned := TRUE;
  END IF;
  
  -- Update streak record
  UPDATE public.user_streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_checkin_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_badge_earned;
END;
$function$;

-- ============================================================================
-- VERIFICATION: Check all functions now have search_path
-- ============================================================================
-- Run this query after migration to verify:
-- SELECT proname, prosecdef, proconfig 
-- FROM pg_proc 
-- WHERE pronamespace = 'public'::regnamespace 
--   AND proname IN (
--     'update_product_images_updated_at',
--     'update_ai_generations_updated_at', 
--     'update_daily_messages_updated_at',
--     'update_push_subscriptions_updated_at',
--     'update_user_streak'
--   );
