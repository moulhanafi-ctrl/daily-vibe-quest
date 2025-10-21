
-- ============================================
-- HARDEN SECURITY DEFINER FUNCTIONS
-- ============================================
-- Add auth.uid() filtering and revoke public access

-- 1. Update get_active_subscriptions_v1 to filter by auth.uid()
CREATE OR REPLACE FUNCTION public.get_active_subscriptions_v1(_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(user_id uuid, status text, current_period_end timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id AS user_id,
    p.subscription_status AS status,
    p.subscription_expires_at AS current_period_end
  FROM public.profiles p
  WHERE p.id = COALESCE(_user_id, auth.uid())
    AND p.subscription_status IN ('active', 'trialing')
    AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > now())
    AND (p.id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
$$;

-- Revoke all default permissions
REVOKE ALL ON FUNCTION public.get_active_subscriptions_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_active_subscriptions_v1(uuid) FROM anon;
-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_subscriptions_v1(uuid) TO authenticated;

-- 2. Update get_family_members_view to filter by auth.uid()
CREATE OR REPLACE FUNCTION public.get_family_members_view(_family_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, family_id uuid, user_id uuid, role text, joined_at timestamp with time zone, age_group age_group, member_name text, relationship text, invitee_email text, status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(fm.id, fi.id) AS id,
    COALESCE(fm.family_id, fi.parent_id::uuid) AS family_id,
    fm.user_id,
    fm.role,
    fm.joined_at,
    p.age_group,
    p.username AS member_name,
    fi.relationship,
    fi.invitee_email,
    CASE 
      WHEN fm.id IS NOT NULL THEN 'active'
      WHEN fi.is_used THEN 'used'
      WHEN fi.expires_at < now() THEN 'expired'
      ELSE fi.status
    END AS status
  FROM public.family_members fm
  FULL OUTER JOIN public.family_invites fi ON fm.user_id = (
    SELECT id FROM auth.users WHERE email = fi.invitee_email LIMIT 1
  )
  LEFT JOIN public.profiles p ON fm.user_id = p.id
  WHERE (_family_id IS NULL OR fm.family_id = _family_id)
    AND (
      -- User is a member of this family
      EXISTS (
        SELECT 1 FROM public.family_members fm2
        WHERE fm2.family_id = COALESCE(fm.family_id, fi.parent_id::uuid)
          AND fm2.user_id = auth.uid()
      )
      -- Or user is the creator
      OR EXISTS (
        SELECT 1 FROM public.family_groups fg
        WHERE fg.id = COALESCE(fm.family_id, fi.parent_id::uuid)
          AND fg.created_by = auth.uid()
      )
      -- Or user is admin
      OR has_role(auth.uid(), 'admin'::app_role)
    );
$$;

-- Revoke all default permissions
REVOKE ALL ON FUNCTION public.get_family_members_view(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_family_members_view(uuid) FROM anon;
-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.get_family_members_view(uuid) TO authenticated;

-- 3. Update get_guardian_verification_status to filter by auth.uid()
CREATE OR REPLACE FUNCTION public.get_guardian_verification_status(_child_id uuid)
RETURNS TABLE(child_id uuid, status guardian_verification_status, verified_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    gl.child_id,
    gl.status,
    gl.verified_at,
    gl.created_at,
    gl.updated_at
  FROM public.guardian_links gl
  WHERE gl.child_id = _child_id
    AND (
      -- User is checking their own status
      gl.child_id = auth.uid()
      -- Or user is the guardian
      OR gl.guardian_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      -- Or user is admin
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  ORDER BY gl.created_at DESC
  LIMIT 1;
$$;

-- Revoke all default permissions
REVOKE ALL ON FUNCTION public.get_guardian_verification_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_guardian_verification_status(uuid) FROM anon;
-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.get_guardian_verification_status(uuid) TO authenticated;

-- ============================================
-- SECURITY VALIDATION
-- ============================================
-- After this migration:
-- ✅ All SECURITY DEFINER functions have search_path = public
-- ✅ All functions filter results to auth.uid() or permitted relations
-- ✅ Anonymous users cannot execute these functions
-- ✅ Only authenticated users can execute
-- ✅ Functions return only data user is authorized to see
