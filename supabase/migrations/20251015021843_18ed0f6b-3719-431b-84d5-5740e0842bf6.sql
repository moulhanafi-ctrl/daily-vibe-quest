
-- Harden all SECURITY DEFINER functions with proper search_path and grants
-- This prevents search_path attacks and ensures least-privilege execution

-- 1. has_role: Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_temp, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 2. has_admin_role: Check if user has admin or specific admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid, _admin_role admin_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_temp, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = 'admin'::app_role OR admin_role = _admin_role)
  )
$$;

REVOKE ALL ON FUNCTION public.has_admin_role(uuid, admin_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_admin_role(uuid, admin_role) TO authenticated;

-- 3. can_view_profile: Check if viewer can see a profile
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_temp, public
AS $$
  SELECT 
    _viewer_id = _profile_id -- Can view own profile
    OR EXISTS ( -- Or is verified parent of this profile
      SELECT 1 FROM public.profiles
      WHERE id = _profile_id 
      AND parent_id = _viewer_id
      AND _viewer_id IN (SELECT id FROM public.profiles WHERE is_parent = true)
    )
    OR EXISTS ( -- Or is admin
      SELECT 1 FROM public.user_roles
      WHERE user_id = _viewer_id AND role = 'admin'::app_role
    )
$$;

REVOKE ALL ON FUNCTION public.can_view_profile(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid, uuid) TO authenticated;

-- 4. is_parent: Check if auth.uid() is parent of child
CREATE OR REPLACE FUNCTION public.is_parent(_child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_temp, public
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

REVOKE ALL ON FUNCTION public.is_parent(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_parent(uuid) TO authenticated;

-- 5. is_parent_of: Check if specific user is parent of child
CREATE OR REPLACE FUNCTION public.is_parent_of(_user_id uuid, _child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_temp, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND is_parent = true
      AND _child_id IN (
        SELECT id FROM public.profiles WHERE parent_id = _user_id
      )
  )
$$;

REVOKE ALL ON FUNCTION public.is_parent_of(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_parent_of(uuid, uuid) TO authenticated;

-- 6. handle_new_user: Trigger function for new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $$
BEGIN
  -- Validate that NEW.id is not null
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  -- Insert profile with validated data
  INSERT INTO public.profiles (id, username, age_group)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''), split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'age_group')::age_group, 'adult'::age_group)
  );
  
  -- Automatically assign 'user' role to new signups
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role);
  
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM public;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 7. update_last_login: Trigger function to update last login timestamp
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $$
BEGIN
  -- Validate that NEW.id is not null
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  UPDATE public.profiles
  SET last_login_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_last_login() FROM public;
GRANT EXECUTE ON FUNCTION public.update_last_login() TO service_role;

-- 8. update_push_subscriptions_updated_at: Trigger function for push subscriptions
CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_temp, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_push_subscriptions_updated_at() FROM public;
GRANT EXECUTE ON FUNCTION public.update_push_subscriptions_updated_at() TO service_role;

-- Verify RLS is enabled on all tables touched by these functions
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('user_roles', 'profiles', 'push_subscriptions')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;
