
-- Grant admin/owner full access to all chat rooms and messages

-- Update chat_rooms SELECT policy to allow admins
DROP POLICY IF EXISTS "Users can view chat rooms for their focus areas and age group" ON public.chat_rooms;

CREATE POLICY "Users can view chat rooms for their focus areas and age group" ON public.chat_rooms
FOR SELECT USING (
  -- Admins and owners can see all rooms
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.is_super_admin(auth.uid()) OR
  -- Regular users can see rooms matching their criteria
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND chat_rooms.focus_area = ANY (profiles.selected_focus_areas)
      AND chat_rooms.age_group = profiles.age_group
      AND (
        (profiles.subscription_status = 'active' AND profiles.subscription_expires_at > now())
        OR (profiles.subscription_status = 'trialing' AND profiles.subscription_expires_at > now())
      )
  )
);

-- Ensure chat_messages policies allow admin access (already done but verifying)
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;

CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages
FOR SELECT USING (
  -- Admins and owners can see all messages
  public.has_role(auth.uid(), 'admin'::app_role) OR
  public.is_super_admin(auth.uid()) OR
  -- Regular users can see messages in their rooms
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.chat_rooms r ON r.id = chat_messages.room_id
    WHERE p.id = auth.uid()
      AND r.focus_area = ANY (p.selected_focus_areas)
      AND r.age_group = p.age_group
      AND (
        (p.subscription_status = 'active' AND p.subscription_expires_at > now())
        OR (p.subscription_status = 'trialing' AND p.subscription_expires_at > now())
      )
  )
);

DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;

CREATE POLICY "Users can insert messages in their rooms" ON public.chat_messages
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND (
    -- Admins and owners can post in any room
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.is_super_admin(auth.uid()) OR
    -- Regular users can post in their rooms
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.chat_rooms r ON r.id = chat_messages.room_id
      WHERE p.id = auth.uid()
        AND r.focus_area = ANY (p.selected_focus_areas)
        AND r.age_group = p.age_group
        AND (
          (p.subscription_status = 'active' AND p.subscription_expires_at > now())
          OR (p.subscription_status = 'trialing' AND p.subscription_expires_at > now())
        )
    )
  )
);
