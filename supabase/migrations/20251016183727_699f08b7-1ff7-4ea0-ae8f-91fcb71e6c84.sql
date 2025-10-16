-- Create session-based trivia tables
CREATE TABLE IF NOT EXISTS public.trivia_weekly_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_key DATE NOT NULL UNIQUE,
  scheduled_at_local TIMESTAMPTZ NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  session_1_questions JSONB NOT NULL DEFAULT '[]',
  session_2_questions JSONB NOT NULL DEFAULT '[]',
  session_3_questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  CONSTRAINT valid_questions CHECK (
    jsonb_array_length(session_1_questions) = 10 AND
    jsonb_array_length(session_2_questions) = 10 AND
    jsonb_array_length(session_3_questions) = 10
  )
);

-- Create mental health break videos table
CREATE TABLE IF NOT EXISTS public.trivia_break_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_key DATE NOT NULL REFERENCES public.trivia_weekly_sessions(week_key) ON DELETE CASCADE,
  break_position INTEGER NOT NULL CHECK (break_position IN (1, 2)),
  title TEXT NOT NULL,
  tip_content TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 30 AND 45),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  captions_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_key, break_position)
);

-- Create session progress tracking
CREATE TABLE IF NOT EXISTS public.trivia_session_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key DATE NOT NULL REFERENCES public.trivia_weekly_sessions(week_key) ON DELETE CASCADE,
  session_number INTEGER NOT NULL CHECK (session_number IN (1, 2, 3)),
  answers JSONB NOT NULL DEFAULT '[]',
  score INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_key, session_number)
);

-- Enable RLS
ALTER TABLE public.trivia_weekly_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_break_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_session_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trivia_weekly_sessions
CREATE POLICY "Anyone can view published sessions"
  ON public.trivia_weekly_sessions FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage sessions"
  ON public.trivia_weekly_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for trivia_break_videos
CREATE POLICY "Anyone can view break videos for published sessions"
  ON public.trivia_break_videos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trivia_weekly_sessions
    WHERE week_key = trivia_break_videos.week_key
    AND status = 'published'
  ));

CREATE POLICY "Admins can manage break videos"
  ON public.trivia_break_videos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for trivia_session_progress
CREATE POLICY "Users can view their own session progress"
  ON public.trivia_session_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own session progress"
  ON public.trivia_session_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_trivia_weekly_sessions_week ON public.trivia_weekly_sessions(week_key);
CREATE INDEX idx_trivia_weekly_sessions_status ON public.trivia_weekly_sessions(status);
CREATE INDEX idx_trivia_break_videos_week ON public.trivia_break_videos(week_key);
CREATE INDEX idx_trivia_session_progress_user ON public.trivia_session_progress(user_id, week_key);