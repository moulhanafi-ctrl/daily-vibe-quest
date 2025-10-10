-- Create enum for age groups
CREATE TYPE age_group AS ENUM ('child', 'teen', 'adult');

-- Create enum for mood types
CREATE TYPE mood_type AS ENUM ('happy', 'calm', 'anxious', 'sad', 'angry', 'excited', 'tired');

-- Create enum for content types
CREATE TYPE content_type AS ENUM ('audio', 'text', 'video');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  age_group age_group NOT NULL DEFAULT 'adult',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create moods table for daily check-ins
CREATE TABLE moods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mood mood_type NOT NULL,
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reflections table
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mood_id UUID NOT NULL REFERENCES moods(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create family_groups table
CREATE TABLE family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create family_members junction table
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Create motivational_content table
CREATE TABLE motivational_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type content_type NOT NULL,
  audio_url TEXT,
  target_mood mood_type,
  age_group age_group,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_suggestions table
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivational_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for moods
CREATE POLICY "Users can view their own moods"
  ON moods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own moods"
  ON moods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own moods"
  ON moods FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own moods"
  ON moods FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for reflections
CREATE POLICY "Users can view their own reflections"
  ON reflections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM moods
      WHERE moods.id = reflections.mood_id
      AND moods.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reflections for their moods"
  ON reflections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM moods
      WHERE moods.id = reflections.mood_id
      AND moods.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view family reflections"
  ON reflections FOR SELECT
  USING (
    NOT is_private
    AND EXISTS (
      SELECT 1 FROM moods m
      JOIN family_members fm1 ON m.user_id = fm1.user_id
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE m.id = reflections.mood_id
      AND fm2.user_id = auth.uid()
    )
  );

-- RLS Policies for family_groups
CREATE POLICY "Users can view their family groups"
  ON family_groups FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = family_groups.id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create family groups"
  ON family_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their family groups"
  ON family_groups FOR UPDATE
  USING (auth.uid() = created_by);

-- RLS Policies for family_members
CREATE POLICY "Users can view their family members"
  ON family_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join families"
  ON family_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for motivational_content (public read)
CREATE POLICY "Anyone can view motivational content"
  ON motivational_content FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for ai_suggestions
CREATE POLICY "Users can view their own suggestions"
  ON ai_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions"
  ON ai_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, age_group)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'age_group')::age_group, 'adult')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable realtime for family features
ALTER PUBLICATION supabase_realtime ADD TABLE moods;
ALTER PUBLICATION supabase_realtime ADD TABLE reflections;
ALTER PUBLICATION supabase_realtime ADD TABLE family_members;