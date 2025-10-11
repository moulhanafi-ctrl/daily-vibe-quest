-- Create system_users table for Test Contact
CREATE TABLE IF NOT EXISTS public.system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert TEST_CONTACT system user
INSERT INTO public.system_users (id, username, display_name, avatar_url, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'TEST_CONTACT',
  'Test Contact',
  NULL,
  true
) ON CONFLICT (username) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

-- Anyone can read system users
CREATE POLICY "Anyone can view system users"
  ON public.system_users
  FOR SELECT
  USING (true);

-- Create family_stories table
CREATE TABLE IF NOT EXISTS public.family_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 45),
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create index for efficient queries
CREATE INDEX idx_family_stories_family_expires ON public.family_stories(family_id, expires_at);
CREATE INDEX idx_family_stories_user ON public.family_stories(user_id);

-- Enable RLS
ALTER TABLE public.family_stories ENABLE ROW LEVEL SECURITY;

-- Users can create their own stories
CREATE POLICY "Users can create their own stories"
  ON public.family_stories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Family members can view family stories
CREATE POLICY "Family members can view family stories"
  ON public.family_stories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = family_stories.family_id
        AND family_members.user_id = auth.uid()
    )
    AND expires_at > NOW()
  );

-- Users can delete their own stories
CREATE POLICY "Users can delete their own stories"
  ON public.family_stories
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create story_views table for tracking
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.family_stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- Enable RLS
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Users can record their own views
CREATE POLICY "Users can record their own views"
  ON public.story_views
  FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Story owners can see who viewed
CREATE POLICY "Story owners can see who viewed"
  ON public.story_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_stories
      WHERE family_stories.id = story_views.story_id
        AND family_stories.user_id = auth.uid()
    )
  );

-- Create story_reactions table
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.family_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('heart', 'laugh', 'wow', 'sad')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

-- Enable RLS
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

-- Users can add reactions
CREATE POLICY "Users can add reactions"
  ON public.story_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Family members can view reactions
CREATE POLICY "Family members can view reactions"
  ON public.story_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_stories fs
      JOIN public.family_members fm ON fm.family_id = fs.family_id
      WHERE fs.id = story_reactions.story_id
        AND fm.user_id = auth.uid()
    )
  );

-- Create test_messages table for Test Contact
CREATE TABLE IF NOT EXISTS public.test_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.test_messages ENABLE ROW LEVEL SECURITY;

-- Users can create test messages
CREATE POLICY "Users can create test messages"
  ON public.test_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own test messages
CREATE POLICY "Users can view their own test messages"
  ON public.test_messages
  FOR SELECT
  USING (auth.uid() = user_id);