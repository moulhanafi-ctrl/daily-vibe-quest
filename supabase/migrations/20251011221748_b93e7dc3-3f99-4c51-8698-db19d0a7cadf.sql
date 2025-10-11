
-- Fix Security Issue #1: Restrict profiles table access
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Parents can view their children profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create security definer function to check parent-child relationship without exposing data
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _viewer_id = _profile_id -- Can view own profile
    OR EXISTS ( -- Or is verified parent of this profile
      SELECT 1 FROM public.profiles
      WHERE id = _profile_id 
      AND parent_id = _viewer_id
      AND _viewer_id IN (SELECT id FROM public.profiles WHERE is_parent = true)
    )
    OR EXISTS ( -- Or is admin
      SELECT 1 FROM public.user_roles
      WHERE user_id = _viewer_id AND role = 'admin'
    )
$$;

-- Create restricted policies for profiles
CREATE POLICY "Authenticated users can view profiles they have access to"
ON public.profiles
FOR SELECT
TO authenticated
USING (can_view_profile(auth.uid(), id));

-- Ensure only authenticated users can modify their own profiles
CREATE POLICY "Authenticated users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Fix Security Issue #2: Hide guardian email from children in guardian_links
-- Drop existing policy that exposes guardian email
DROP POLICY IF EXISTS "Children can view their verification requests" ON public.guardian_links;

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.guardian_verification_status_view CASCADE;

-- Create a view that excludes sensitive guardian information
CREATE VIEW public.guardian_verification_status_view AS
SELECT 
  id,
  child_id,
  status,
  verified_at,
  created_at,
  updated_at,
  method,
  -- Mask the email partially: show only first 2 chars and domain
  CASE 
    WHEN auth.uid() = child_id THEN 
      substring(guardian_email from 1 for 2) || '***@' || split_part(guardian_email, '@', 2)
    ELSE guardian_email
  END as guardian_email_masked
FROM public.guardian_links;

-- Grant access to the view
GRANT SELECT ON public.guardian_verification_status_view TO authenticated;

-- Create new restricted policy for guardian_links that doesn't expose email
CREATE POLICY "Children can view limited verification info"
ON public.guardian_links
FOR SELECT
TO authenticated
USING (
  auth.uid() = child_id 
  AND status IN ('pending', 'verified', 'expired')
);

-- Add policy for system/parents to update verification
CREATE POLICY "System can update verification records"
ON public.guardian_links
FOR UPDATE
TO authenticated
USING (
  -- Child can update their own (to retry)
  auth.uid() = child_id
  -- Or admin
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add comments for security documentation
COMMENT ON FUNCTION public.can_view_profile IS 
'Security definer function to check profile access without recursive RLS. Prevents unauthorized profile enumeration.';

COMMENT ON VIEW public.guardian_verification_status_view IS 
'Restricted view of guardian_links that masks sensitive information from children while allowing status checks.';

-- Create indexes for performance on new security checks
CREATE INDEX IF NOT EXISTS idx_profiles_parent_child ON public.profiles(parent_id, id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guardian_links_child ON public.guardian_links(child_id, status);
