-- Fix subscription expiration checking for chat access
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view chat rooms for their focus areas and age group" ON public.chat_rooms;

-- Recreate policies with proper expiration checking for BOTH active and trialing subscriptions
CREATE POLICY "Users can view chat rooms for their focus areas and age group"
ON public.chat_rooms
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND chat_rooms.focus_area = ANY (profiles.selected_focus_areas)
        AND chat_rooms.age_group = profiles.age_group
        AND (
          -- Active subscriptions must also check expiration
          (profiles.subscription_status = 'active' AND profiles.subscription_expires_at > now())
          OR 
          (profiles.subscription_status = 'trialing' AND profiles.subscription_expires_at > now())
        )
    )
  )
);

CREATE POLICY "Users can view messages in their rooms"
ON public.chat_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN chat_rooms r ON r.id = chat_messages.room_id
      WHERE p.id = auth.uid()
        AND r.focus_area = ANY (p.selected_focus_areas)
        AND r.age_group = p.age_group
        AND (
          -- Active subscriptions must also check expiration
          (p.subscription_status = 'active' AND p.subscription_expires_at > now())
          OR 
          (p.subscription_status = 'trialing' AND p.subscription_expires_at > now())
        )
    )
  )
);

CREATE POLICY "Users can insert messages in their rooms"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR (
      EXISTS (
        SELECT 1
        FROM profiles p
        JOIN chat_rooms r ON r.id = chat_messages.room_id
        WHERE p.id = auth.uid()
          AND r.focus_area = ANY (p.selected_focus_areas)
          AND r.age_group = p.age_group
          AND (
            -- Active subscriptions must also check expiration
            (p.subscription_status = 'active' AND p.subscription_expires_at > now())
            OR 
            (p.subscription_status = 'trialing' AND p.subscription_expires_at > now())
          )
      )
    )
  )
);

-- Add index for better performance on expiration checks
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status, subscription_expires_at);

COMMENT ON POLICY "Users can view chat rooms for their focus areas and age group" ON public.chat_rooms IS 'Enforces subscription expiration checking for both active and trialing subscriptions';
COMMENT ON POLICY "Users can view messages in their rooms" ON public.chat_messages IS 'Enforces subscription expiration checking for both active and trialing subscriptions';
COMMENT ON POLICY "Users can insert messages in their rooms" ON public.chat_messages IS 'Enforces subscription expiration checking for both active and trialing subscriptions';