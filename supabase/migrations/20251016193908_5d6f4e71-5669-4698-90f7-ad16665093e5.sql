-- Family Mode: Trivia Rooms
CREATE TABLE IF NOT EXISTS public.trivia_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL DEFAULT 'free-play' CHECK (mode IN ('free-play', 'turn-based')),
  week_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '3 hours'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed'))
);

-- Room Members
CREATE TABLE IF NOT EXISTS public.trivia_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.trivia_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  avatar TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Room Scores
CREATE TABLE IF NOT EXISTS public.trivia_room_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.trivia_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL CHECK (session_number BETWEEN 1 AND 3),
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 10,
  time_ms INTEGER,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id, session_number)
);

-- Break Video Progress
CREATE TABLE IF NOT EXISTS public.trivia_break_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  break_position INTEGER NOT NULL CHECK (break_position IN (1, 2)),
  seconds_watched INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_key, break_position)
);

-- Trivia Settings
CREATE TABLE IF NOT EXISTS public.trivia_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  animations_enabled BOOLEAN NOT NULL DEFAULT true,
  sounds_enabled BOOLEAN NOT NULL DEFAULT false,
  haptics_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trivia_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_room_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_break_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trivia_rooms
CREATE POLICY "Users can create rooms"
  ON public.trivia_rooms FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Users can view rooms they're in"
  ON public.trivia_rooms FOR SELECT
  USING (
    auth.uid() = host_user_id OR
    EXISTS (
      SELECT 1 FROM public.trivia_room_members
      WHERE room_id = trivia_rooms.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update their rooms"
  ON public.trivia_rooms FOR UPDATE
  USING (auth.uid() = host_user_id);

-- RLS Policies for trivia_room_members
CREATE POLICY "Users can join rooms"
  ON public.trivia_room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can view room members"
  ON public.trivia_room_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trivia_room_members m
      WHERE m.room_id = trivia_room_members.room_id AND m.user_id = auth.uid()
    )
  );

-- RLS Policies for trivia_room_scores
CREATE POLICY "Users can insert their scores"
  ON public.trivia_room_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Room members can view scores"
  ON public.trivia_room_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trivia_room_members
      WHERE room_id = trivia_room_scores.room_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for trivia_break_progress
CREATE POLICY "Users manage their own progress"
  ON public.trivia_break_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for trivia_settings
CREATE POLICY "Users manage their own settings"
  ON public.trivia_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to generate room code
CREATE OR REPLACE FUNCTION public.generate_trivia_room_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Enable realtime for family mode
ALTER PUBLICATION supabase_realtime ADD TABLE public.trivia_room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trivia_room_scores;

-- Create indexes for performance
CREATE INDEX idx_trivia_rooms_code ON public.trivia_rooms(room_code);
CREATE INDEX idx_trivia_rooms_expires ON public.trivia_rooms(expires_at);
CREATE INDEX idx_trivia_room_members_room ON public.trivia_room_members(room_id);
CREATE INDEX idx_trivia_room_scores_room ON public.trivia_room_scores(room_id);
CREATE INDEX idx_trivia_break_progress_user ON public.trivia_break_progress(user_id, week_key);