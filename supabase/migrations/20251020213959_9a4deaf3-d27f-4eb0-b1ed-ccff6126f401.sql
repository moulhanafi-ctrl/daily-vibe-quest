-- Create family_messages table for family group chat
CREATE TABLE IF NOT EXISTS public.family_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.family_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages from their family groups
CREATE POLICY "Users can read family messages"
ON public.family_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_messages.family_group_id
    AND fm.user_id = auth.uid()
  )
);

-- Policy: Users can insert messages to their family groups
CREATE POLICY "Users can send family messages"
ON public.family_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_group_id
    AND fm.user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_family_messages_family_group 
ON public.family_messages(family_group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_family_messages_user 
ON public.family_messages(user_id);

-- Enable realtime for family messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_messages;