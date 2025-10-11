-- Drop the problematic policy
DROP POLICY IF EXISTS "Parents can view their children profiles" ON public.profiles;

-- Create a security definer function to check if user is a parent
CREATE OR REPLACE FUNCTION public.is_parent_of(_user_id uuid, _child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Recreate the policy using the security definer function
CREATE POLICY "Parents can view their children profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id 
    OR auth.uid() = parent_id 
    OR public.is_parent_of(auth.uid(), id)
  );