BEGIN;

CREATE OR REPLACE FUNCTION public.ensure_chat_room(
  p_focus_area TEXT,
  p_age_group age_group,
  p_focus_area_key TEXT,
  p_name TEXT,
  p_description TEXT
) RETURNS public.chat_rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.chat_rooms;
  v_is_admin BOOLEAN;
  v_allowed BOOLEAN;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check admin role or that user is allowed for this focus area & age group
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ) INTO v_is_admin;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.age_group = p_age_group
      AND (p_focus_area = ANY (p.selected_focus_areas))
  ) INTO v_allowed;

  IF NOT (v_is_admin OR v_allowed) THEN
    RAISE EXCEPTION 'Not permitted to create this chat room';
  END IF;

  -- Try to find by (focus_area, age_group)
  SELECT * INTO v_room
  FROM public.chat_rooms
  WHERE focus_area = p_focus_area AND age_group = p_age_group
  LIMIT 1;

  IF v_room.id IS NULL THEN
    -- Create if missing
    INSERT INTO public.chat_rooms (focus_area, age_group, name, description, focus_area_key)
    VALUES (p_focus_area, p_age_group, p_name, p_description, p_focus_area_key)
    RETURNING * INTO v_room;
  ELSE
    -- Keep data fresh: store slug if empty and allow soft updates of name/description
    UPDATE public.chat_rooms
    SET 
      focus_area_key = COALESCE(v_room.focus_area_key, p_focus_area_key),
      name = COALESCE(NULLIF(p_name, ''), v_room.name),
      description = COALESCE(NULLIF(p_description, ''), v_room.description)
    WHERE id = v_room.id
    RETURNING * INTO v_room;
  END IF;

  RETURN v_room;
END;
$$;

COMMIT;