-- ============================================
-- CRITICAL SECURITY FIX #1: Profiles RLS Policy
-- ============================================
-- Issue: profiles table is publicly readable with sensitive PII
-- Fix: Restrict access to owner, parents, and admins only

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles to start fresh
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Create secure policies

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Parents can view their children's profiles
CREATE POLICY "Parents can view children profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_parent_of(auth.uid(), id));

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- CRITICAL SECURITY FIX #2: Function Hardening
-- ============================================
-- Issue: Functions missing search_path parameter (SQL injection risk)
-- Fix: Add SET search_path = public to all affected functions

ALTER FUNCTION public.generate_trivia_room_code() SET search_path = public;
ALTER FUNCTION public.generate_invite_code() SET search_path = public;
ALTER FUNCTION public.generate_family_invite_code() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.jwt_role() SET search_path = public;
ALTER FUNCTION public.assign_age_group(integer) SET search_path = public;
ALTER FUNCTION public.update_product_images_updated_at() SET search_path = public;
ALTER FUNCTION public.update_orders_updated_at() SET search_path = public;
ALTER FUNCTION public.update_daily_messages_updated_at() SET search_path = public;
ALTER FUNCTION public.update_ai_generations_updated_at() SET search_path = public;
ALTER FUNCTION public.update_push_subscriptions_updated_at() SET search_path = public;
ALTER FUNCTION public.ensure_family_invite_code() SET search_path = public;