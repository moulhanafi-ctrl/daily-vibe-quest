-- Extend family_invites for email-based invitations with relationship tracking
ALTER TABLE public.family_invites
ADD COLUMN IF NOT EXISTS invitee_email TEXT,
ADD COLUMN IF NOT EXISTS invitee_name TEXT,
ADD COLUMN IF NOT EXISTS relationship TEXT CHECK (relationship IN ('parent', 'sibling', 'child', 'partner', 'friend', 'other')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired'));

-- Add expiry tracking
ALTER TABLE public.family_invites
ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_family_invites_email ON public.family_invites(invitee_email);
CREATE INDEX IF NOT EXISTS idx_family_invites_status ON public.family_invites(status);

-- Create a view for easy family member listing
CREATE OR REPLACE VIEW public.family_members_view AS
SELECT 
  fm.id,
  fm.family_id,
  fm.user_id,
  fm.role,
  fm.joined_at,
  p.username as member_name,
  p.age_group,
  fi.relationship,
  fi.invitee_email,
  CASE 
    WHEN p.id IS NOT NULL THEN 'active'
    WHEN fi.status = 'pending' AND fi.expires_at > now() THEN 'pending'
    WHEN fi.status = 'expired' OR fi.expires_at <= now() THEN 'expired'
    ELSE fi.status
  END as status
FROM public.family_members fm
LEFT JOIN public.profiles p ON p.id = fm.user_id
LEFT JOIN public.family_invites fi ON fi.parent_id = (
  SELECT created_by FROM public.family_groups WHERE id = fm.family_id
);

-- Grant access to the view
GRANT SELECT ON public.family_members_view TO authenticated;

-- Update RLS for family_invites to allow reading by invitee email
DROP POLICY IF EXISTS "Users can view invites by email" ON public.family_invites;
CREATE POLICY "Users can view invites by email" 
ON public.family_invites 
FOR SELECT 
USING (
  auth.uid() = parent_id 
  OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Allow authenticated users to update invite status
DROP POLICY IF EXISTS "Users can accept invites" ON public.family_invites;
CREATE POLICY "Users can accept invites"
ON public.family_invites
FOR UPDATE
USING (
  invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
  AND expires_at > now()
);