-- Create chat rooms table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_area TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(focus_area)
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat rooms policies (anyone can view)
CREATE POLICY "Anyone can view chat rooms"
  ON public.chat_rooms
  FOR SELECT
  USING (true);

-- Chat messages policies
CREATE POLICY "Users can view messages in their focus area rooms"
  ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        SELECT focus_area FROM public.chat_rooms WHERE id = chat_messages.room_id
      ) = ANY(profiles.selected_focus_areas)
    )
  );

CREATE POLICY "Users can insert messages in their focus area rooms"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        SELECT focus_area FROM public.chat_rooms WHERE id = chat_messages.room_id
      ) = ANY(profiles.selected_focus_areas)
    )
  );

-- Enable realtime for messages
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Insert default chat rooms for each focus area
INSERT INTO public.chat_rooms (focus_area, name, description) VALUES
  ('family_conflict', 'Family Conflict Support', 'Connect with others navigating family challenges'),
  ('anxiety', 'Anxiety Support', 'Share experiences and coping strategies for anxiety'),
  ('depression', 'Depression Support', 'A safe space to discuss depression and find support'),
  ('relationships', 'Relationship Support', 'Discuss relationship challenges and growth'),
  ('self_esteem', 'Self-Esteem & Confidence', 'Build confidence together'),
  ('academic_stress', 'Academic Stress', 'Connect with others facing school pressures'),
  ('social_pressure', 'Social Pressure', 'Navigate social challenges together'),
  ('identity', 'Identity & Self-Discovery', 'Explore your identity in a supportive space')
ON CONFLICT (focus_area) DO NOTHING;