-- Ensure invite_code column exists and has unique constraint
ALTER TABLE public.family_groups 
  ALTER COLUMN invite_code SET NOT NULL,
  ALTER COLUMN invite_code SET DEFAULT generate_family_invite_code();

-- Create unique index on invite_code if not exists
CREATE UNIQUE INDEX IF NOT EXISTS family_groups_invite_code_unique 
  ON public.family_groups(invite_code);

-- Create trigger to auto-generate invite codes on insert if not provided
CREATE OR REPLACE FUNCTION public.ensure_family_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := generate_family_invite_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_family_invite_code_trigger ON public.family_groups;
CREATE TRIGGER ensure_family_invite_code_trigger
  BEFORE INSERT ON public.family_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_family_invite_code();

-- Create RPC function to join family group via invite code
CREATE OR REPLACE FUNCTION public.join_family_via_code(_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id uuid;
  v_user_id uuid;
  v_existing_member boolean;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find family group by invite code
  SELECT id INTO v_family_id
  FROM public.family_groups
  WHERE invite_code = UPPER(TRIM(_invite_code));

  IF v_family_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  -- Check if user is already a member
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_id = v_family_id AND user_id = v_user_id
  ) INTO v_existing_member;

  IF v_existing_member THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already a member of this family group');
  END IF;

  -- Check member limit (max 10 per family)
  IF (SELECT COUNT(*) FROM public.family_members WHERE family_id = v_family_id) >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This family group has reached its maximum capacity');
  END IF;

  -- Add user as member
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (v_family_id, v_user_id, 'member');

  RETURN jsonb_build_object(
    'success', true, 
    'family_id', v_family_id,
    'message', 'Successfully joined family group'
  );
END;
$$;