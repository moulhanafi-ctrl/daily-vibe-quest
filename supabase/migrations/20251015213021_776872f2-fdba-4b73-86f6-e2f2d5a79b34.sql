-- Fix recursive RLS on user_roles causing infinite recursion
DROP POLICY IF EXISTS "admin_select_user_roles" ON public.user_roles;

-- Safe, non-recursive SELECT policies for user_roles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles_admin_select_jwt'
  ) THEN
    CREATE POLICY "user_roles_admin_select_jwt"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (public.jwt_role() IN ('owner','super_admin','admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles_self_select'
  ) THEN
    CREATE POLICY "user_roles_self_select"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;