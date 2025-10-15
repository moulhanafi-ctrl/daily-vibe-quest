-- Add slug column for chat rooms and helper function to auto-create rooms safely
BEGIN;

-- 1) Add focus_area_key (slug) column
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS focus_area_key TEXT;

-- 2) Ensure useful uniqueness constraints (id already PK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_chat_rooms_focus_age_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_chat_rooms_focus_age_unique ON public.chat_rooms (focus_area, age_group);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_chat_rooms_focus_key_age_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_chat_rooms_focus_key_age_unique ON public.chat_rooms (focus_area_key, age_group) WHERE focus_area_key IS NOT NULL;
  END IF;
END $$;

-- 3) Helper function to ensure room exists (bypasses RLS via SECURITY DEFINER)
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
BEGIN
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