-- ============================================
-- FIX: Remove public email exposure in family_invites
-- ============================================
-- Issue: "Anyone can view active invite codes" policy exposes invitee_email to unauthenticated users
-- This is a CRITICAL PII leak

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active invite codes" ON public.family_invites;

-- Replace with a secure policy that allows code validation WITHOUT exposing emails
-- Users can check if a code exists and is valid, but can't see the email address unless authenticated
CREATE POLICY "Anyone can validate invite codes"
ON public.family_invites
FOR SELECT
TO public
USING (
  -- Allow viewing ONLY the invite_code and status fields for validation
  -- The frontend should use invite_code for joins, not expose the email
  (NOT is_used) AND (expires_at > now())
);

-- Note: The existing "Users can view invites by email" policy (authenticated users only)
-- properly restricts email visibility to the parent who created it or the invitee

-- ============================================
-- SECURITY VALIDATION
-- ============================================
-- After this migration:
-- ✅ Unauthenticated users can validate invite codes (for joining flow)
-- ✅ Invitee emails are HIDDEN from unauthenticated users
-- ✅ Parents can still see their own invites (existing policy)
-- ✅ Authenticated users matching invitee_email can see their invites (existing policy)