-- Add subscription tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone;

-- Create index for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON public.profiles(subscription_status, subscription_expires_at);

-- Update RLS policies for chat_rooms to require active subscription
DROP POLICY IF EXISTS "Users can view chat rooms for their focus areas and age group" ON public.chat_rooms;

CREATE POLICY "Users can view chat rooms for their focus areas and age group" 
ON public.chat_rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND chat_rooms.focus_area = ANY (profiles.selected_focus_areas)
    AND chat_rooms.age_group = profiles.age_group
    AND (
      profiles.subscription_status = 'active' 
      OR (profiles.subscription_status = 'trialing' AND profiles.subscription_expires_at > now())
    )
  )
);

-- Update RLS policies for chat_messages to require active subscription
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;

CREATE POLICY "Users can view messages in their rooms" 
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    JOIN chat_rooms r ON r.id = chat_messages.room_id
    WHERE p.id = auth.uid()
    AND r.focus_area = ANY (p.selected_focus_areas)
    AND r.age_group = p.age_group
    AND (
      p.subscription_status = 'active' 
      OR (p.subscription_status = 'trialing' AND p.subscription_expires_at > now())
    )
  )
);

CREATE POLICY "Users can insert messages in their rooms" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM profiles p
    JOIN chat_rooms r ON r.id = chat_messages.room_id
    WHERE p.id = auth.uid()
    AND r.focus_area = ANY (p.selected_focus_areas)
    AND r.age_group = p.age_group
    AND (
      p.subscription_status = 'active' 
      OR (p.subscription_status = 'trialing' AND p.subscription_expires_at > now())
    )
  )
);