-- ============================================
-- FIX: Remove ALL public access to family_invites
-- ============================================
-- Issue: Previous migration still allowed public SELECT access
-- Now restricting to ONLY authenticated inviter or invitee

-- Drop the policy that still allowed public access
DROP POLICY IF EXISTS "Anyone can validate invite codes" ON public.family_invites;

-- Keep existing secure policies (these are already correct):
-- ✅ "Parents can view their invite codes" - creator can view
-- ✅ "Users can view invites by email" - invitee can view after signup

-- Ensure the remaining policies properly restrict access
-- Policy 1: Creator (parent) can view their own invites
-- (Already exists: "Parents can view their invite codes")

-- Policy 2: Invited user can view invites matching their email
-- (Already exists: "Users can view invites by email")

-- Policy 3: Only creator can create invites
-- (Already exists: "Parents can create invite codes")

-- Policy 4: Only invitee can accept/update their invite
-- (Already exists: "Users can accept invites")

-- ============================================
-- SECURITY VALIDATION
-- ============================================
-- After this migration:
-- ✅ NO public/unauthenticated access to family_invites
-- ✅ Only authenticated creator (parent_id) can view their invites
-- ✅ Only authenticated invitee (matching invitee_email) can view/accept their invites
-- ✅ All email addresses are HIDDEN from public
-- ✅ Invite codes can only be discovered by intended recipients