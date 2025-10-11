-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can view roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Update chat_rooms policy to allow admins
DROP POLICY IF EXISTS "Users can view chat rooms for their focus areas and age group" ON public.chat_rooms;

CREATE POLICY "Users can view chat rooms for their focus areas and age group" ON public.chat_rooms
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND chat_rooms.focus_area = ANY (profiles.selected_focus_areas)
      AND chat_rooms.age_group = profiles.age_group
      AND (
        profiles.subscription_status = 'active'
        OR (profiles.subscription_status = 'trialing' AND profiles.subscription_expires_at > now())
      )
  )
);

-- Update chat_messages SELECT policy to allow admins
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;

CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM profiles p
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

-- Update chat_messages INSERT policy to allow admins
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;

CREATE POLICY "Users can insert messages in their rooms" ON public.chat_messages
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN chat_rooms r ON r.id = chat_messages.room_id
      WHERE p.id = auth.uid()
        AND r.focus_area = ANY (p.selected_focus_areas)
        AND r.age_group = p.age_group
        AND (
          p.subscription_status = 'active'
          OR (p.subscription_status = 'trialing' AND p.subscription_expires_at > now())
        )
    )
  )
);

-- Insert admin role for current user
INSERT INTO public.user_roles (user_id, role)
VALUES ('9c6c3194-2267-4ea5-b584-9405b1bd48ed', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;