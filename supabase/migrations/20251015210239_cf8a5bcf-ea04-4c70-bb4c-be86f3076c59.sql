-- Create safe admin room fetch RPC that always works (fixed)

-- 1. Helper to safely read role from JWT (already exists, recreate to be safe)
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

-- 2. RPC to list rooms for the current user with admin bypass (FIXED)
CREATE OR REPLACE FUNCTION public.list_rooms_for_me()
RETURNS SETOF public.chat_rooms
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT auth.uid() AS uid, public.jwt_role() AS role
  )
  SELECT r.*
  FROM public.chat_rooms r
  CROSS JOIN me
  WHERE
    -- Admins see everything
    me.role IN ('owner','super_admin','admin')
    -- Or user has matching focus area and age group
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = me.uid
        AND r.focus_area = ANY (p.selected_focus_areas)
        AND r.age_group = p.age_group
    )
  ORDER BY r.created_at DESC;
$$;

-- 3. Set proper ownership for the RPC
ALTER FUNCTION public.list_rooms_for_me() OWNER TO postgres;

-- 4. Add minimal admin-select policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'chat_rooms' 
    AND policyname = 'admin_select_all_rooms_jwt'
  ) THEN
    CREATE POLICY "admin_select_all_rooms_jwt"
    ON public.chat_rooms FOR SELECT
    USING ( public.jwt_role() IN ('owner','super_admin','admin') );
  END IF;
END $$;