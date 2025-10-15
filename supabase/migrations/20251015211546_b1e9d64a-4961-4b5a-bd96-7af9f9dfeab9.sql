-- Recreate admin select policy safely (no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_roles' AND policyname='admin_select_user_roles'
  ) THEN
    CREATE POLICY "admin_select_user_roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_admin_role(auth.uid(), 'owner'::admin_role)
      OR public.has_admin_role(auth.uid(), 'moderator'::admin_role)
      OR public.has_admin_role(auth.uid(), 'support'::admin_role)
    );
  END IF;
END $$;

-- Ensure list_rooms_for_me uses DB-based admin check (already attempted)
CREATE OR REPLACE FUNCTION public.list_rooms_for_me()
RETURNS SETOF public.chat_rooms
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT 
      auth.uid() AS uid,
      (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_admin_role(auth.uid(), 'owner'::admin_role)
        OR public.has_admin_role(auth.uid(), 'moderator'::admin_role)
        OR public.has_admin_role(auth.uid(), 'support'::admin_role)
      ) AS is_admin
  )
  SELECT r.*
  FROM public.chat_rooms r
  CROSS JOIN me
  WHERE
    me.is_admin = true
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = me.uid
        AND r.focus_area = ANY (p.selected_focus_areas)
        AND r.age_group = p.age_group
    )
  ORDER BY r.created_at DESC;
$$;