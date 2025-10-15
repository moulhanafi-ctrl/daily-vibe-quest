-- 1. JWT role helper function
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

-- 2. Chat access helper - admins OR active subscribers can access
CREATE OR REPLACE FUNCTION public.has_chat_access(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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
    -- Active/trialing subscription
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

-- 3. Convenient view for frontend
CREATE OR REPLACE VIEW public.my_chat_access AS
SELECT
  auth.uid() AS user_id,
  public.jwt_role() AS role,
  public.has_chat_access(auth.uid()) AS allowed;

-- Grant access to authenticated users
GRANT SELECT ON public.my_chat_access TO authenticated;

-- 4. Update chat_rooms RLS to use has_chat_access
DROP POLICY IF EXISTS "chat_rooms_read_access" ON public.chat_rooms;
CREATE POLICY "chat_rooms_read_access"
ON public.chat_rooms
FOR SELECT
TO authenticated
USING (public.has_chat_access(auth.uid()));

-- 5. Update chat_messages RLS to use has_chat_access
DROP POLICY IF EXISTS "messages_read_access" ON public.chat_messages;
CREATE POLICY "messages_read_access"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (public.has_chat_access(auth.uid()));

DROP POLICY IF EXISTS "messages_insert_access" ON public.chat_messages;
CREATE POLICY "messages_insert_access"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND public.has_chat_access(auth.uid())
);