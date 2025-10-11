-- Create storage bucket for voice notes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Create journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_id uuid REFERENCES moods(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  mood integer CHECK (mood >= 1 AND mood <= 5),
  title text,
  body text,
  audio_url text,
  transcript text,
  tags text[] DEFAULT '{}',
  shared_with_parent boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create journal_prompts table
CREATE TABLE IF NOT EXISTS journal_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  age_group age_group NOT NULL,
  category text NOT NULL,
  prompt text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journal_entries
CREATE POLICY "Users can insert their own entries"
  ON journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own entries"
  ON journal_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
  ON journal_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries"
  ON journal_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Parents can view shared entries"
  ON journal_entries FOR SELECT
  TO authenticated
  USING (
    shared_with_parent = true 
    AND is_parent_of(auth.uid(), user_id)
  );

-- RLS Policies for journal_prompts
CREATE POLICY "Anyone can view active prompts"
  ON journal_prompts FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage prompts"
  ON journal_prompts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Storage policies for voice notes
CREATE POLICY "Users can upload their own voice notes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own voice notes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice-notes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own voice notes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice-notes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create indexes
CREATE INDEX idx_journal_entries_user_date ON journal_entries(user_id, date DESC);
CREATE INDEX idx_journal_entries_tags ON journal_entries USING GIN(tags);
CREATE INDEX idx_journal_entries_shared ON journal_entries(user_id, shared_with_parent) WHERE shared_with_parent = true;

-- Create updated_at trigger
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert sample prompts for each age group
INSERT INTO journal_prompts (age_group, category, prompt) VALUES
-- Kids
('child', 'feelings', 'What made you smile today? 😊'),
('child', 'feelings', 'Draw or write about something that worried you today.'),
('child', 'gratitude', 'What are three good things that happened today?'),
('child', 'support', 'Who helped you today? How did they help?'),
('child', 'coping', 'What do you do when you feel sad or mad?'),

-- Teens
('teen', 'feelings', 'What''s weighing on your mind right now?'),
('teen', 'reflection', 'If today had a theme song, what would it be and why?'),
('teen', 'coping', 'What''s one thing you did today to take care of yourself?'),
('teen', 'relationships', 'Describe a conversation that mattered today.'),
('teen', 'future', 'What''s one small step toward a goal you can take tomorrow?'),

-- Adults
('adult', 'reflection', 'What pattern did you notice in your mood this week?'),
('adult', 'gratitude', 'Name three things you''re grateful for today, big or small.'),
('adult', 'coping', 'What boundary did you set or need to set today?'),
('adult', 'growth', 'What did you learn about yourself today?'),
('adult', 'balance', 'Where did you find moments of peace today?'),

-- Seniors
('elder', 'memory', 'What memory brought you comfort today?'),
('elder', 'connection', 'Who did you connect with today? How did it feel?'),
('elder', 'gratitude', 'What simple pleasure did you enjoy today?'),
('elder', 'wisdom', 'What advice would you give your younger self about today?'),
('elder', 'reflection', 'What brings you peace in this season of life?');