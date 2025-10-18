-- Create streak tracking table
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own streaks"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
  ON public.user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
  ON public.user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- Create badges/achievements table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  icon TEXT
);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, longest_streak INTEGER, badge_earned BOOLEAN) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_checkin DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_badge_earned BOOLEAN := FALSE;
BEGIN
  -- Get or create streak record
  SELECT last_checkin_date, current_streak, longest_streak
  INTO v_last_checkin, v_current_streak, v_longest_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_checkin_date)
    VALUES (p_user_id, 1, 1, CURRENT_DATE)
    RETURNING user_streaks.current_streak, user_streaks.longest_streak 
    INTO v_current_streak, v_longest_streak;
    
    v_badge_earned := TRUE;
    RETURN QUERY SELECT v_current_streak, v_longest_streak, v_badge_earned;
    RETURN;
  END IF;
  
  -- Check if checkin is today (already checked in)
  IF v_last_checkin = CURRENT_DATE THEN
    RETURN QUERY SELECT v_current_streak, v_longest_streak, FALSE;
    RETURN;
  END IF;
  
  -- Check if checkin was yesterday (continue streak)
  IF v_last_checkin = CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
  ELSE
    -- Streak broken, reset to 1
    v_current_streak := 1;
  END IF;
  
  -- Update longest streak if current is higher
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  -- Award badges for milestones
  IF v_current_streak IN (3, 7, 14, 30, 60, 100) THEN
    v_badge_earned := TRUE;
  END IF;
  
  -- Update streak record
  UPDATE public.user_streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_checkin_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_badge_earned;
END;
$$;

-- Trigger for updating updated_at
CREATE OR REPLACE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();