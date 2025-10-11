-- Create trivia_questions table
CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale TEXT NOT NULL CHECK (locale IN ('en', 'es', 'fr', 'ar')),
  age_group age_group NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('feelings', 'coping', 'empathy', 'communication', 'habits', 'values')),
  type TEXT NOT NULL CHECK (type IN ('mcq', 'emoji', 'scenario')),
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_id TEXT NOT NULL,
  explanation TEXT,
  tags TEXT[] DEFAULT '{}',
  sensitive BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trivia_rounds table
CREATE TABLE IF NOT EXISTS public.trivia_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  age_group age_group NOT NULL,
  question_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, age_group)
);

-- Create trivia_progress table
CREATE TABLE IF NOT EXISTS public.trivia_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.trivia_rounds(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT now(),
  streak INTEGER DEFAULT 1,
  answers JSONB,
  UNIQUE(user_id, round_id)
);

-- Create family_scores table
CREATE TABLE IF NOT EXISTS public.family_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.trivia_rounds(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0,
  participants INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, round_id)
);

-- Create trivia_preferences table for notification settings
CREATE TABLE IF NOT EXISTS public.trivia_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT true,
  sunday_reminder BOOLEAN DEFAULT false,
  timer_enabled BOOLEAN DEFAULT false,
  timer_seconds INTEGER DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trivia_questions
CREATE POLICY "Anyone can view active trivia questions"
  ON public.trivia_questions FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage trivia questions"
  ON public.trivia_questions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for trivia_rounds
CREATE POLICY "Users can view trivia rounds"
  ON public.trivia_rounds FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage trivia rounds"
  ON public.trivia_rounds FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for trivia_progress
CREATE POLICY "Users can view their own progress"
  ON public.trivia_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.trivia_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.trivia_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Parents can view their children's progress"
  ON public.trivia_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_parent = true
        AND trivia_progress.user_id IN (
          SELECT id FROM public.profiles WHERE parent_id = auth.uid()
        )
    )
  );

-- RLS Policies for family_scores
CREATE POLICY "Family members can view their family scores"
  ON public.family_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = family_scores.family_id
        AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can insert family scores"
  ON public.family_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = family_scores.family_id
        AND family_members.user_id = auth.uid()
    )
  );

-- RLS Policies for trivia_preferences
CREATE POLICY "Users can manage their own preferences"
  ON public.trivia_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_trivia_questions_locale_age ON public.trivia_questions(locale, age_group);
CREATE INDEX idx_trivia_questions_category ON public.trivia_questions(category);
CREATE INDEX idx_trivia_rounds_date ON public.trivia_rounds(date);
CREATE INDEX idx_trivia_progress_user_id ON public.trivia_progress(user_id);
CREATE INDEX idx_trivia_progress_round_id ON public.trivia_progress(round_id);
CREATE INDEX idx_family_scores_family_id ON public.family_scores(family_id);

-- Trigger to update updated_at
CREATE TRIGGER update_trivia_questions_updated_at
  BEFORE UPDATE ON public.trivia_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_trivia_preferences_updated_at
  BEFORE UPDATE ON public.trivia_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();