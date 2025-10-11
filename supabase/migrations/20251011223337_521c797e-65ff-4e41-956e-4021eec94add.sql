-- Security Enhancement: Active Subscriptions View and RLS Updates (Fixed v2)
-- This migration creates infrastructure for proper subscription validation

-- 1. Create stable view for active subscriptions
CREATE OR REPLACE VIEW public.active_subscriptions_v1 AS
SELECT 
  p.id as user_id,
  p.subscription_status as status,
  p.subscription_expires_at as current_period_end
FROM public.profiles p
WHERE p.subscription_status IN ('active', 'trialing')
  AND p.subscription_expires_at > now();

COMMENT ON VIEW public.active_subscriptions_v1 IS 'Provides real-time view of users with valid, non-expired subscriptions';

-- 2. Create security definer function to check parent relationship
CREATE OR REPLACE FUNCTION public.is_parent(_child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _child_id
      AND parent_id = auth.uid()
      AND auth.uid() IN (
        SELECT id FROM public.profiles WHERE is_parent = true
      )
  )
$$;

COMMENT ON FUNCTION public.is_parent IS 'Security definer function to check if current user is parent of given child';

-- 3. Enable RLS on help_locations table (idempotent)
ALTER TABLE public.help_locations ENABLE ROW LEVEL SECURITY;

-- 4. Drop all existing policies on help_locations
DROP POLICY IF EXISTS "Anyone can view help locations" ON public.help_locations;
DROP POLICY IF EXISTS "Authenticated users can view help locations" ON public.help_locations;
DROP POLICY IF EXISTS "Admins can manage help locations" ON public.help_locations;
DROP POLICY IF EXISTS "Admins can view all help_locations" ON public.help_locations;

-- 5. Create authenticated-only policy for help_locations
CREATE POLICY "Authenticated users can view help locations"
ON public.help_locations
FOR SELECT
TO authenticated
USING (is_active = true);

-- 6. Create admin management policy for help_locations
CREATE POLICY "Admins can manage help locations"
ON public.help_locations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. Revoke direct anonymous access to help_locations
REVOKE ALL ON public.help_locations FROM anon;

COMMENT ON POLICY "Authenticated users can view help locations" ON public.help_locations IS 'Requires authentication to prevent scraping of provider directory';
COMMENT ON POLICY "Admins can manage help locations" ON public.help_locations IS 'Allows admins full CRUD access to help locations';

-- 8. Update journal_entries RLS to use is_parent function
DROP POLICY IF EXISTS "Parents can view shared entries" ON public.journal_entries;

CREATE POLICY "Parents can view shared entries"
ON public.journal_entries
FOR SELECT
TO authenticated
USING (
  shared_with_parent = true 
  AND is_parent(user_id)
);

COMMENT ON POLICY "Parents can view shared entries" ON public.journal_entries IS 'Uses security definer function to properly verify parent relationship';