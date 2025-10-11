-- Add age_group column to chat_rooms
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS age_group age_group NOT NULL DEFAULT 'adult';

-- Make focus_area and age_group combination unique
ALTER TABLE public.chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_focus_area_key;
ALTER TABLE public.chat_rooms ADD CONSTRAINT chat_rooms_focus_area_age_group_key UNIQUE (focus_area, age_group);

-- Delete existing chat rooms
DELETE FROM public.chat_rooms;

-- Insert chat rooms for each focus area and age group combination
INSERT INTO public.chat_rooms (focus_area, name, description, age_group) VALUES
  -- Child rooms
  ('depression', 'Depression Support (Kids)', 'A safe space for kids to discuss feelings', 'child'),
  ('anxiety', 'Anxiety Support (Kids)', 'Share experiences and coping strategies', 'child'),
  ('grief', 'Grief Support (Kids)', 'Connect with others experiencing loss', 'child'),
  ('stress', 'Stress Management (Kids)', 'Discuss school stress with others', 'child'),
  ('self-esteem', 'Self-Esteem (Kids)', 'Build confidence together', 'child'),
  ('relationships', 'Friendships (Kids)', 'Discuss friendship challenges', 'child'),
  ('loneliness', 'Loneliness Support (Kids)', 'Find connection', 'child'),
  ('pressure', 'School Pressure (Kids)', 'Connect with others facing school stress', 'child'),
  ('family', 'Family Support (Kids)', 'Navigate family challenges', 'child'),
  ('sleep', 'Sleep & Rest (Kids)', 'Share tips for better sleep', 'child'),
  ('motivation', 'Motivation (Kids)', 'Find your drive', 'child'),
  
  -- Teen rooms
  ('depression', 'Depression Support (Teens)', 'A safe space for teens to discuss depression', 'teen'),
  ('anxiety', 'Anxiety Support (Teens)', 'Share experiences and coping strategies', 'teen'),
  ('grief', 'Grief Support (Teens)', 'Connect with others experiencing grief', 'teen'),
  ('stress', 'Stress Management (Teens)', 'Discuss stress and overthinking', 'teen'),
  ('self-esteem', 'Self-Esteem (Teens)', 'Build confidence together', 'teen'),
  ('relationships', 'Relationship Support (Teens)', 'Discuss relationship challenges', 'teen'),
  ('loneliness', 'Loneliness Support (Teens)', 'Find connection and understanding', 'teen'),
  ('pressure', 'School/Work Pressure (Teens)', 'Connect with others facing pressure', 'teen'),
  ('family', 'Family Support (Teens)', 'Navigate family challenges', 'teen'),
  ('sleep', 'Sleep & Rest (Teens)', 'Share tips for better sleep', 'teen'),
  ('motivation', 'Motivation & Purpose (Teens)', 'Find your drive and purpose', 'teen'),
  
  -- Adult rooms
  ('depression', 'Depression Support (Adults)', 'A safe space to discuss depression', 'adult'),
  ('anxiety', 'Anxiety Support (Adults)', 'Share experiences and coping strategies', 'adult'),
  ('grief', 'Grief Support (Adults)', 'Connect with others experiencing grief', 'adult'),
  ('stress', 'Stress Management (Adults)', 'Discuss stress and overthinking', 'adult'),
  ('self-esteem', 'Self-Esteem (Adults)', 'Build confidence together', 'adult'),
  ('relationships', 'Relationship Support (Adults)', 'Discuss relationship challenges', 'adult'),
  ('loneliness', 'Loneliness Support (Adults)', 'Find connection', 'adult'),
  ('pressure', 'Work Pressure (Adults)', 'Connect with others facing work stress', 'adult'),
  ('family', 'Family Support (Adults)', 'Navigate family challenges', 'adult'),
  ('sleep', 'Sleep & Rest (Adults)', 'Share tips for better sleep', 'adult'),
  ('motivation', 'Motivation & Purpose (Adults)', 'Find your drive and purpose', 'adult'),
  
  -- Elder rooms
  ('depression', 'Depression Support (Elders)', 'A safe space to discuss depression', 'elder'),
  ('anxiety', 'Anxiety Support (Elders)', 'Share experiences and coping strategies', 'elder'),
  ('grief', 'Grief Support (Elders)', 'Connect with others experiencing grief', 'elder'),
  ('stress', 'Stress Management (Elders)', 'Discuss stress and life changes', 'elder'),
  ('self-esteem', 'Self-Esteem (Elders)', 'Build confidence together', 'elder'),
  ('relationships', 'Relationship Support (Elders)', 'Discuss relationship challenges', 'elder'),
  ('loneliness', 'Loneliness Support (Elders)', 'Find connection and understanding', 'elder'),
  ('pressure', 'Life Pressure (Elders)', 'Connect with others facing life challenges', 'elder'),
  ('family', 'Family Support (Elders)', 'Navigate family dynamics', 'elder'),
  ('sleep', 'Sleep & Rest (Elders)', 'Share tips for better sleep', 'elder'),
  ('motivation', 'Motivation & Purpose (Elders)', 'Find your drive and purpose', 'elder');

-- Update RLS policy for chat_rooms to restrict by focus area and age group
DROP POLICY IF EXISTS "Anyone can view chat rooms" ON public.chat_rooms;

CREATE POLICY "Users can view chat rooms for their focus areas and age group"
ON public.chat_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND chat_rooms.focus_area = ANY(profiles.selected_focus_areas)
      AND chat_rooms.age_group = profiles.age_group
  )
);

-- Update RLS policies for chat_messages to include age group check
DROP POLICY IF EXISTS "Users can view messages in their focus area rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their focus area rooms" ON public.chat_messages;

CREATE POLICY "Users can view messages in their rooms"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.chat_rooms r ON r.id = chat_messages.room_id
    WHERE p.id = auth.uid()
      AND r.focus_area = ANY(p.selected_focus_areas)
      AND r.age_group = p.age_group
  )
);

CREATE POLICY "Users can insert messages in their rooms"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.chat_rooms r ON r.id = chat_messages.room_id
    WHERE p.id = auth.uid()
      AND r.focus_area = ANY(p.selected_focus_areas)
      AND r.age_group = p.age_group
  )
);