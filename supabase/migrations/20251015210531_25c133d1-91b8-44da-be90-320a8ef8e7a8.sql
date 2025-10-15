-- Ensure message access for admins and members (fixed)

-- 1. Admin full access to all messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'chat_messages' 
    AND policyname = 'admin_full_messages_jwt'
  ) THEN
    CREATE POLICY "admin_full_messages_jwt"
    ON public.chat_messages FOR SELECT
    USING ( public.jwt_role() IN ('owner','super_admin','admin') );
  END IF;
END $$;

-- 2. Members can read messages in rooms matching their focus area and age group
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'chat_messages' 
    AND policyname = 'members_read_room_messages'
  ) THEN
    CREATE POLICY "members_read_room_messages"
    ON public.chat_messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 
        FROM public.chat_rooms r
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE r.id = chat_messages.room_id
          AND r.focus_area = ANY (p.selected_focus_areas)
          AND r.age_group = p.age_group
      )
    );
  END IF;
END $$;

-- 3. Enable Realtime for chat tables (only if not already added)
DO $$
BEGIN
  -- Try to add chat_rooms to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- Table already in publication, ignore
  END;

  -- Try to add chat_messages to realtime publication  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- Table already in publication, ignore
  END;
END $$;

-- Set REPLICA IDENTITY to FULL for complete row data during updates
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;