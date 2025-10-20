-- Add expiration column to family_groups
ALTER TABLE public.family_groups 
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamp with time zone 
  DEFAULT (now() + interval '7 days');

-- Update existing records to have expiration dates
UPDATE public.family_groups 
SET invite_expires_at = created_at + interval '7 days'
WHERE invite_expires_at IS NULL;

-- Update trigger to set expiration on new invite codes
CREATE OR REPLACE FUNCTION public.ensure_family_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := generate_family_invite_code();
    NEW.invite_expires_at := now() + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$;

-- Update join function to check expiration
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
  v_expires_at timestamp with time zone;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find family group by invite code and check expiration
  SELECT id, invite_expires_at INTO v_family_id, v_expires_at
  FROM public.family_groups
  WHERE invite_code = UPPER(TRIM(_invite_code));

  IF v_family_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  -- Check if code has expired
  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite code has expired. Please ask the group owner for a new code.');
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

-- Create function to regenerate invite code (owners only)
CREATE OR REPLACE FUNCTION public.regenerate_family_invite_code(_family_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_new_code text;
  v_is_owner boolean;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user is the owner of this family group
  SELECT EXISTS (
    SELECT 1 FROM public.family_groups
    WHERE id = _family_id AND created_by = v_user_id
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the family group owner can regenerate the invite code');
  END IF;

  -- Generate new code and update
  v_new_code := generate_family_invite_code();
  
  UPDATE public.family_groups
  SET 
    invite_code = v_new_code,
    invite_expires_at = now() + interval '7 days'
  WHERE id = _family_id;

  RETURN jsonb_build_object(
    'success', true,
    'invite_code', v_new_code,
    'expires_at', (now() + interval '7 days')::text,
    'message', 'New invite code generated successfully'
  );
END;
$$;