-- Server-side chat access functions
CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS text 
LANGUAGE sql 
STABLE 
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'role',
    ''
  )
$$;

-- Update has_chat_access to use subscriptions table directly
CREATE OR REPLACE FUNCTION public.has_chat_access(uid uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admin bypass via JWT role
    public.jwt_role() IN ('owner', 'super_admin', 'admin')
    OR
    -- Admin bypass via user_roles table
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = uid
        AND (
          ur.role = 'admin'::app_role
          OR ur.admin_role IN ('owner'::admin_role, 'moderator'::admin_role, 'support'::admin_role)
        )
    )
    OR
    -- Active/trialing subscription check
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = uid
        AND p.subscription_status IN ('active', 'trialing')
        AND (
          p.subscription_expires_at IS NULL 
          OR p.subscription_expires_at > now()
        )
    )
$$;

-- Create view for easy access checking
CREATE OR REPLACE VIEW public.my_chat_access AS
SELECT 
  auth.uid() AS user_id,
  public.jwt_role() AS role,
  public.has_chat_access(auth.uid()) AS allowed;